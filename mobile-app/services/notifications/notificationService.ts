/**
 * notificationService.ts
 *
 * Centralized notification scheduling for all modules.
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

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Configuration ────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const existingResult = await Notifications.getPermissionsAsync();
  // PermissionResponse.status is 'granted' | 'denied' | 'undetermined'
  if ((existingResult as any).status === 'granted') return true;
  const result = await Notifications.requestPermissionsAsync();
  return (result as any).status === 'granted';
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
}

export async function cancelUnallocatedTaskReviews(): Promise<void> {
  for (let i = 0; i < UNALLOCATED_REVIEW_TIMES.length; i++) {
    await Notifications.cancelScheduledNotificationAsync(
      `${NOTIF_IDS.UNALLOCATED_REVIEW_PREFIX}${i}`
    ).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// B. In-Progress Task Reminder — every 45 minutes
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleInProgressReminder(taskId: string, taskTitle: string): Promise<void> {
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
}

export async function cancelInProgressReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    `${NOTIF_IDS.IN_PROGRESS_PREFIX}${taskId}`
  ).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// C. Allocated Task Start Alert
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleTaskStartAlert(
  taskId: string,
  taskTitle: string,
  startTime: Date
): Promise<void> {
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
}

export async function cancelTaskStartAlert(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    `${NOTIF_IDS.TASK_START_PREFIX}${taskId}`
  ).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// D. Allocated Task Expiry Alert
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleTaskExpiryAlert(
  taskId: string,
  taskTitle: string,
  endTime: Date
): Promise<void> {
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
}

export async function cancelTaskExpiryAlert(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    `${NOTIF_IDS.TASK_EXPIRY_PREFIX}${taskId}`
  ).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// E. Daily Goal Planning Reminder (night — user configurable)
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleDailyGoalPlanningReminder(hour: number, minute: number): Promise<void> {
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
}

export async function cancelDailyGoalPlanningReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIF_IDS.GOAL_PLAN_NIGHT).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// F. Daily Goal Verification — 9:00 AM and 4:00 PM
// ─────────────────────────────────────────────────────────────────────────────

export async function scheduleDailyGoalVerifications(): Promise<void> {
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
}

export async function cancelRoutineReminder(reminderId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    `${NOTIF_IDS.ROUTINE_REMINDER_PREFIX}${reminderId}`
  ).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap — call on app start after permissions granted
// ─────────────────────────────────────────────────────────────────────────────

export async function bootstrapSystemNotifications(): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Always schedule standing system notifications
  await scheduleDailyGoalVerifications();
}
