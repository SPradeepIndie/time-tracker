/**
 * analytics.ts
 *
 * Mathematical analytics engine for the Time Tracker app.
 *
 * Developer Dictionary / UI Mapping Guide:
 * ─────────────────────────────────────────────────────────────────────────────
 * Code Metric          | UI Display Label     | Description
 * ─────────────────────────────────────────────────────────────────────────────
 * productivityMinutes  | Productivity Time    | Total focused time spent on tasks
 * taskCompletionRate   | Tasks                | Percentage of daily tasks completed
 * goalHitRate          | Daily Goals          | Percentage of target goals achieved
 * routineHitRate       | Routines             | Percentage of routine sub-activities checked
 * overallProgress      | Overall Day Progress | Composite daily progress based on custom weights
 * progressPercent      | Category Progress    | Weekly progress within a specific goal category
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { SQLiteDatabase } from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { queryGetDailyGoalStats, queryGetWeeklyGoalStats, queryGetAllCategories } from '../storage/goalQueries';
import { queryGetRoutineStatsForDate } from '../storage/routineQueries';
import { getCurrentWeekDateRange } from '../../utils/dateUtils';

// ─── Configurable Weights for Overall Progress ────────────────────────────────

export interface AnalyticsWeights {
  tasks: number;    // Default 0.40 (40%)
  goals: number;    // Default 0.35 (35%)
  routines: number; // Default 0.25 (25%)
}

export const DEFAULT_ANALYTICS_WEIGHTS: AnalyticsWeights = {
  tasks: 0.40,
  goals: 0.35,
  routines: 0.25,
};

export const ANALYTICS_WEIGHTS_KEY = 'analytics_custom_weights';

export async function loadAnalyticsWeights(): Promise<AnalyticsWeights> {
  try {
    const raw = await SecureStore.getItemAsync(ANALYTICS_WEIGHTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.tasks === 'number' &&
        typeof parsed.goals === 'number' &&
        typeof parsed.routines === 'number'
      ) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Analytics] Failed to load custom weights from SecureStore, using defaults', err);
  }
  return DEFAULT_ANALYTICS_WEIGHTS;
}

export async function saveAnalyticsWeights(weights: AnalyticsWeights): Promise<void> {
  await SecureStore.setItemAsync(ANALYTICS_WEIGHTS_KEY, JSON.stringify(weights));
}

// ─── Legacy weight alias for backward compatibility ───────────────────────────
export const ANALYTICS_WEIGHTS = {
  W1: DEFAULT_ANALYTICS_WEIGHTS.tasks,
  W2: DEFAULT_ANALYTICS_WEIGHTS.goals,
  W3: DEFAULT_ANALYTICS_WEIGHTS.routines,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyAnalytics {
  date: string;
  productivityMinutes: number;    // Code: T_prod in minutes | UI: Productivity Time
  goalHitRate: number;            // Code: G_day (0–100)     | UI: Daily Goals %
  routineHitRate: number;         // Code: R_day (0–100)     | UI: Routines %
  taskCompletionRate: number;     // Code: Task completion   | UI: Tasks %
  overallProgress: number;        // Code: P_day (0–100)     | UI: Overall Day Progress %
  totalTasks: number;
  completedTasks: number;
  totalGoals: number;
  completedGoals: number;
  totalActivities: number;
  checkedActivities: number;
}

export interface WeeklyCategoryStats {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  progressPercent: number;        // Code: P_category(c) | UI: Category Progress %
  total: number;
  completed: number;
}

export interface WeeklyAnalytics {
  weekLabel: string;
  categoryStats: WeeklyCategoryStats[];
  dailyHistory: DailyAnalytics[];  // Calendar week (Monday to Sunday)
}

// ─── Daily Task Stats from DB ─────────────────────────────────────────────────

interface TaskStatsRow {
  total: number;
  completed: number;
  productivity_minutes: number;
}

async function getTaskStats(db: SQLiteDatabase, date: string): Promise<TaskStatsRow> {
  const row = await db.getFirstAsync<TaskStatsRow>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
       SUM(CASE
         WHEN status IN ('completed','in-progress') AND duration_minutes IS NOT NULL
           THEN duration_minutes
         ELSE 0
       END) as productivity_minutes
     FROM tracks
     WHERE date(created_at) = ?;`,
    [date]
  );
  return {
    total: row?.total ?? 0,
    completed: row?.completed ?? 0,
    productivity_minutes: row?.productivity_minutes ?? 0,
  };
}

// ─── Calculate Daily Analytics ────────────────────────────────────────────────

export async function calculateDailyAnalytics(
  db: SQLiteDatabase,
  date: string,
  customWeights?: AnalyticsWeights
): Promise<DailyAnalytics> {
  const [taskStats, goalStats, routineStats] = await Promise.all([
    getTaskStats(db, date),
    queryGetDailyGoalStats(db, date),
    queryGetRoutineStatsForDate(db, date),
  ]);

  const taskCompletionRate = taskStats.total > 0
    ? (taskStats.completed / taskStats.total) * 100
    : 0;

  const goalHitRate = goalStats.total > 0
    ? (goalStats.completed / goalStats.total) * 100
    : 0;

  const routineHitRate = routineStats.total > 0
    ? (routineStats.checked / routineStats.total) * 100
    : 0;

  // Use configured weights (fallback to default)
  const weights = customWeights ?? DEFAULT_ANALYTICS_WEIGHTS;

  // Dynamic weight normalization: only active categories contribute,
  // preventing zero-item days from artificially dragging down the score
  const activeWeights: { weight: number; rate: number }[] = [];
  if (taskStats.total > 0) activeWeights.push({ weight: weights.tasks, rate: taskCompletionRate });
  if (goalStats.total > 0) activeWeights.push({ weight: weights.goals, rate: goalHitRate });
  if (routineStats.total > 0) activeWeights.push({ weight: weights.routines, rate: routineHitRate });

  let overallProgress = 0;
  if (activeWeights.length > 0) {
    const totalActiveWeight = activeWeights.reduce((sum, w) => sum + w.weight, 0);
    if (totalActiveWeight > 0) {
      overallProgress = activeWeights.reduce(
        (sum, w) => sum + (w.weight / totalActiveWeight) * w.rate,
        0
      );
    }
  }

  return {
    date,
    productivityMinutes: taskStats.productivity_minutes,
    goalHitRate: Math.round(goalHitRate),
    routineHitRate: Math.round(routineHitRate),
    taskCompletionRate: Math.round(taskCompletionRate),
    overallProgress: Math.round(overallProgress),
    totalTasks: taskStats.total,
    completedTasks: taskStats.completed,
    totalGoals: goalStats.total,
    completedGoals: goalStats.completed,
    totalActivities: routineStats.total,
    checkedActivities: routineStats.checked,
  };
}

// ─── Calculate Weekly Analytics ───────────────────────────────────────────────

export async function calculateWeeklyAnalytics(
  db: SQLiteDatabase,
  weekLabel: string,
  customWeights?: AnalyticsWeights
): Promise<WeeklyAnalytics> {
  // Category progression (Code: P_category(c) | UI: Category Progress)
  const categories = await queryGetAllCategories(db);
  const categoryStats = await Promise.all(
    categories.map(async (cat) => {
      const stats = await queryGetWeeklyGoalStats(db, weekLabel, cat.id);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        progressPercent: stats.total > 0
          ? Math.round((stats.completed / stats.total) * 100)
          : 0,
        total: stats.total,
        completed: stats.completed,
      };
    })
  );

  // Monday to Sunday calendar week history
  const { days } = getCurrentWeekDateRange();
  const dailyHistory: DailyAnalytics[] = [];
  for (const dateStr of days) {
    dailyHistory.push(await calculateDailyAnalytics(db, dateStr, customWeights));
  }

  return { weekLabel, categoryStats, dailyHistory };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Convert minutes to "Xh Ym" display string */
export function formatProductivityTime(minutes: number): string {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Get a color for a progress percentage */
export function getProgressColor(percent: number): string {
  if (percent >= 80) return '#10B981'; // Green
  if (percent >= 50) return '#F59E0B'; // Amber
  return '#EF4444';                    // Red
}
