/**
 * analytics.ts
 *
 * Mathematical analytics formulations for the Time Tracker app.
 *
 * Daily Metrics:
 *  T_prod = Σ t_spent(i)  for completed/in-progress tasks
 *  G_day  = (G_completed / G_total) × 100%
 *  R_day  = (Σ A_checked / Σ A_total) × 100%
 *  P_day  = W1 × TaskRate + W2 × G_day + W3 × R_day
 *
 * Weekly Metrics:
 *  P_category(c) = (completed goals+subgoals in c / total in c) × 100%
 *  7-day rolling history for trend graphs
 */
import { SQLiteDatabase } from 'expo-sqlite';
import { queryGetDailyGoalStats, queryGetWeeklyGoalStats, queryGetAllCategories } from '../storage/goalQueries';
import { queryGetRoutineStatsForDate } from '../storage/routineQueries';

// ─── Weights for Overall Progress ─────────────────────────────────────────────
export const ANALYTICS_WEIGHTS = {
  W1: 0.40, // Tasks
  W2: 0.35, // Goals
  W3: 0.25, // Routines
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyAnalytics {
  date: string;
  productivityMinutes: number;    // T_prod in minutes
  goalHitRate: number;            // G_day (0–100)
  routineHitRate: number;         // R_day (0–100)
  taskCompletionRate: number;     // Task completion % (0–100)
  overallProgress: number;        // P_day (0–100)
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
  progressPercent: number;        // P_category(c)
  total: number;
  completed: number;
}

export interface WeeklyAnalytics {
  weekLabel: string;
  categoryStats: WeeklyCategoryStats[];
  dailyHistory: DailyAnalytics[];  // Last 7 days rolling
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
  date: string
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

  // P_day = W1 × TaskRate + W2 × G_day + W3 × R_day
  const overallProgress =
    ANALYTICS_WEIGHTS.W1 * taskCompletionRate +
    ANALYTICS_WEIGHTS.W2 * goalHitRate +
    ANALYTICS_WEIGHTS.W3 * routineHitRate;

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
  weekLabel: string
): Promise<WeeklyAnalytics> {
  // Category progression P_category(c)
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

  // 7-day rolling history
  const dailyHistory: DailyAnalytics[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyHistory.push(await calculateDailyAnalytics(db, dateStr));
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
