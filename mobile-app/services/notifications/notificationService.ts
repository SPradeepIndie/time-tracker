/**
 * notificationService.ts
 *
 * Centralized notification scheduling for all modules with graceful Expo Go fallback.
 *
 * Schedules implemented:
 *  A. Unallocated task review — 3× per day with 5h gap (8AM–11PM window)
 *  B. In-progress task reminder — every 45 minutes
 *  C. Allocated task start (→ in-progress) alert
 *  D. Allocated task expiration alert
 *  E. Daily goal planning reminder (configurable night time)
 *  F. Daily goal verification — 9:00 AM and 4:00 PM
 *  G. Routine reminders — custom reminder matrix per routine
 */

import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';

// Detect whether the app is executing inside the standard Expo Go client
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const isAndroidExpoGo = Platform.OS === 'android' && isExpoGo;

/**
 * Lazily resolve expo-notifications module.
 *
 * In SDK 53+, Expo Go on Android removed native push notification support.
 * A static `import ... from 'expo-notifications'` executes DevicePushTokenAutoRegistration.fx
 * on app startup, throwing a fatal error. Lazily requiring avoids triggering that side effect.
 */
function getNotifications(): typeof NotificationsType | null {
  if (isAndroidExpoGo) {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (err) {
    console.warn('[NotificationService] expo-notifications unavailable:', err);
    return null;
  }
}

// ─── Configuration ────────────────────────────────────────────────────────────

const initialNotifications = getNotifications();
if (initialNotifications) {
  try {
    initialNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    console.warn('[NotificationService] setNotificationHandler error:', err);
  }
}

// ── Notification identifiers (for cancel/replace) ─────────────────────────────

const NOTIF_IDS = {
  UNALLOCATED_REVIEW_PREFIX: 'unallocated-review-',   // + slot index (0,1,2)
  IN_PROGRESS_PREFIX: 'in-progress-reminder-',        // + task id
  TASK_START_PREFIX: 'task-start-',                   // + task id
  TASK_EXPIRY_PREFIX: 'task-expiry-',                 // + task id
  GOAL_PLAN_NIGHT: 'daily-goal-plan-night',
  GOAL_VERIFY_9AM: 'daily-goal-verify-9am',
  GOAL_VERIFY_4PM: 'daily-goal-verify-4pm',
  ROUTINE_REMINDER_PREFIX: 'routine-reminder-',       // + reminder id
};

// ─────────────────────────────────────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return false;
  }
  try {
    const existingResult = await Notifications.getPermissionsAsync();
    if ((existingResult as any).status === 'granted') return true;
    const result = await Notifications.requestPermissionsAsync();
    return (result as any).status === 'granted';
  } catch (error) {
    console.warn('[NotificationService] Permissions request failed:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Unallocated Task Review — 3× / day, 5h gap, 8AM–11PM
//    Fixed times: 8:00 AM | 1:00 PM | 6:00 PM  (5h apart, all within window)
// ─────────────────────────────────────────────────────────────────────────────

const UNALLOCATED_REVIEW_TIMES = [
  { hour: 8,  minute: 0 },
  { hour: 13, minute: 0 },
  { hour: 18, minute: 0 },
];

export async function scheduleUnallocatedTaskReviews(unallocatedCount: number): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    if (unallocatedCount === 0) {
      await cancelUnallocatedTaskReviews();
      return;
    }
    for (let i = 0; i < UNALLOCATED_REVIEW_TIMES.length; i++) {
      const { hour, minute } = UNALLOCATED_REVIEW_TIMES[i];
      await Notifications.cancelScheduledNotificationAsync(
        `${NOTIF_IDS.UNALLOCATED_REVIEW_PREFIX}${i}`
      ).catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier: `${NOTIF_IDS.UNALLOCATED_REVIEW_PREFIX}${i}`,
        content: {
          title: '📋 Pending Tasks',
          body: `You have ${unallocatedCount} unscheduled task${unallocatedCount > 1 ? 's' : ''} awaiting your attention.`,
          data: { type: 'unallocated-review' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    }
  } catch (error) {
    console.warn('[NotificationService] scheduleUnallocatedTaskReviews error:', error);
  }
}

export async function cancelUnallocatedTaskReviews(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    for (let i = 0; i < UNALLOCATED_REVIEW_TIMES.length; i++) {
      await Notifications.cancelScheduledNotificationAsync(
        `${NOTIF_IDS.UNALLOCATED_REVIEW_PREFIX}${i}`
      ).catch(() => {});
    }
  } catch (error) {
    console.warn('[NotificationService] cancelUnallocatedTaskReviews error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// B. In-Progress Task Reminder — every 45 minutes
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleInProgressReminder(taskId: string, taskTitle: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIF_IDS.IN_PROGRESS_PREFIX}${taskId}`,
      content: {
        title: '⏱ Task In Progress',
        body: `"${taskTitle}" is still in progress. Keep going!`,
        data: { type: 'in-progress-reminder', taskId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 45 * 60,
        repeats: true,
      },
    });
  } catch (error) {
    console.warn('[NotificationService] scheduleInProgressReminder error:', error);
  }
}

export async function cancelInProgressReminder(taskId: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      `${NOTIF_IDS.IN_PROGRESS_PREFIX}${taskId}`
    ).catch(() => {});
  } catch (error) {
    console.warn('[NotificationService] cancelInProgressReminder error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// C. Allocated Task Start Alert
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleTaskStartAlert(
  taskId: string,
  taskTitle: string,
  startTime: Date
): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const secondsUntilStart = Math.max(1, Math.floor((startTime.getTime() - Date.now()) / 1000));
    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIF_IDS.TASK_START_PREFIX}${taskId}`,
      content: {
        title: '🚀 Task Started',
        body: `"${taskTitle}" has now started. Good luck!`,
        data: { type: 'task-start', taskId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilStart,
        repeats: false,
      },
    });
  } catch (error) {
    console.warn('[NotificationService] scheduleTaskStartAlert error:', error);
  }
}

export async function cancelTaskStartAlert(taskId: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      `${NOTIF_IDS.TASK_START_PREFIX}${taskId}`
    ).catch(() => {});
  } catch (error) {
    console.warn('[NotificationService] cancelTaskStartAlert error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// D. Allocated Task Expiry Alert
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleTaskExpiryAlert(
  taskId: string,
  taskTitle: string,
  endTime: Date
): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const secondsUntilEnd = Math.max(1, Math.floor((endTime.getTime() - Date.now()) / 1000));
    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIF_IDS.TASK_EXPIRY_PREFIX}${taskId}`,
      content: {
        title: '✅ Task Time Completed',
        body: `"${taskTitle}" duration window has ended. Please mark it complete!`,
        data: { type: 'task-expiry', taskId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilEnd,
        repeats: false,
      },
    });
  } catch (error) {
    console.warn('[NotificationService] scheduleTaskExpiryAlert error:', error);
  }
}

export async function cancelTaskExpiryAlert(taskId: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      `${NOTIF_IDS.TASK_EXPIRY_PREFIX}${taskId}`
    ).catch(() => {});
  } catch (error) {
    console.warn('[NotificationService] cancelTaskExpiryAlert error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// E. Daily Goal Planning Reminder (night — user configurable)
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleDailyGoalPlanningReminder(hour: number, minute: number): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.GOAL_PLAN_NIGHT).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_IDS.GOAL_PLAN_NIGHT,
      content: {
        title: '🌙 Plan Tomorrow',
        body: "Take a moment to set your goals for tomorrow. Tomorrow starts tonight!",
        data: { type: 'goal-plan' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (error) {
    console.warn('[NotificationService] scheduleDailyGoalPlanningReminder error:', error);
  }
}

export async function cancelDailyGoalPlanningReminder(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.GOAL_PLAN_NIGHT).catch(() => {});
  } catch (error) {
    console.warn('[NotificationService] cancelDailyGoalPlanningReminder error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// F. Daily Goal Verification — 9:00 AM and 4:00 PM
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleDailyGoalVerifications(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    // 9:00 AM
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.GOAL_VERIFY_9AM).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_IDS.GOAL_VERIFY_9AM,
      content: {
        title: '🎯 Morning Goal Check',
        body: "Good morning! Review your goals for today and make a plan.",
        data: { type: 'goal-verify' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
      },
    });

    // 4:00 PM
    await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.GOAL_VERIFY_4PM).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_IDS.GOAL_VERIFY_4PM,
      content: {
        title: '🎯 Afternoon Goal Check',
        body: "Half the day's left! How are your goals coming along?",
        data: { type: 'goal-verify' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 16,
        minute: 0,
      },
    });
  } catch (error) {
    console.warn('[NotificationService] scheduleDailyGoalVerifications error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// G. Routine Reminder Matrix
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleRoutineReminder(
  reminderId: string,
  routineName: string,
  hour: number,
  minute: number
): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      `${NOTIF_IDS.ROUTINE_REMINDER_PREFIX}${reminderId}`
    ).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: `${NOTIF_IDS.ROUTINE_REMINDER_PREFIX}${reminderId}`,
      content: {
        title: `🔄 ${routineName}`,
        body: `Time to check off your "${routineName}" routine!`,
        data: { type: 'routine-reminder', reminderId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (error) {
    console.warn('[NotificationService] scheduleRoutineReminder error:', error);
  }
}

export async function cancelRoutineReminder(reminderId: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(
      `${NOTIF_IDS.ROUTINE_REMINDER_PREFIX}${reminderId}`
    ).catch(() => {});
  } catch (error) {
    console.warn('[NotificationService] cancelRoutineReminder error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap — call on app start after permissions granted
// ─────────────────────────────────────────────────────────────────────────────

export async function bootstrapSystemNotifications(): Promise<void> {
  if (isAndroidExpoGo) {
    return;
  }
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    // Always schedule standing system notifications
    await scheduleDailyGoalVerifications();
  } catch (error) {
    console.warn('[NotificationService] bootstrapSystemNotifications error:', error);
  }
}
