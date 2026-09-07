/**
 * goalQueries.ts
 *
 * Raw SQL CRUD for daily_goals, weekly_goal_categories, and weekly_goals.
 */
import { SQLiteDatabase } from 'expo-sqlite';
import {
  DailyGoal,
  WeeklyGoal,
  WeeklyGoalCategory,
  MAX_DAILY_GOALS,
  MAX_CHILDREN_PER_TIER,
  MAX_TIERS,
} from '../../types/Goal';

// ── Row types ─────────────────────────────────────────────────────────────────

interface DailyGoalRow {
  id: string;
  remote_id: number | null;
  date: string;
  text: string;
  is_completed: number;
  position: number;
  created_at: string;
  updated_at: string;
}

interface CategoryRow {
  id: string;
  remote_id: number | null;
  name: string;
  color: string;
  is_default: number;
  position: number;
  created_at: string;
  updated_at: string;
}

interface WeeklyGoalRow {
  id: string;
  remote_id: number | null;
  week_label: string;
  category_id: string;
  parent_id: string | null;
  tier: number;
  text: string;
  is_completed: number;
  position: number;
  created_at: string;
  updated_at: string;
}

// ── Converters ────────────────────────────────────────────────────────────────

function rowToDailyGoal(row: DailyGoalRow): DailyGoal {
  return {
    id: row.id,
    remoteId: row.remote_id ?? undefined,
    date: row.date,
    text: row.text,
    isCompleted: row.is_completed === 1,
    position: row.position,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToCategory(row: CategoryRow): WeeklyGoalCategory {
  return {
    id: row.id,
    remoteId: row.remote_id ?? undefined,
    name: row.name,
    color: row.color,
    isDefault: row.is_default === 1,
    position: row.position,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToWeeklyGoal(row: WeeklyGoalRow): WeeklyGoal {
  return {
    id: row.id,
    remoteId: row.remote_id ?? undefined,
    weekLabel: row.week_label,
    categoryId: row.category_id,
    parentId: row.parent_id,
    tier: row.tier as 1 | 2 | 3,
    text: row.text,
    isCompleted: row.is_completed === 1,
    position: row.position,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY GOALS
// ─────────────────────────────────────────────────────────────────────────────

export async function queryGetDailyGoalsByDate(
  db: SQLiteDatabase,
  date: string
): Promise<DailyGoal[]> {
  const rows = await db.getAllAsync<DailyGoalRow>(
    'SELECT * FROM daily_goals WHERE date = ? ORDER BY position ASC;',
    [date]
  );
  return rows.map(rowToDailyGoal);
}

export async function queryCreateDailyGoal(
  db: SQLiteDatabase,
  goal: Omit<DailyGoal, 'createdAt' | 'updatedAt'>
): Promise<DailyGoal> {
  // Enforce cap
  const existing = await queryGetDailyGoalsByDate(db, goal.date);
  if (existing.length >= MAX_DAILY_GOALS) {
    throw new Error(`Maximum of ${MAX_DAILY_GOALS} goals per day reached.`);
  }
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO daily_goals (id, remote_id, date, text, is_completed, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?);`,
    [goal.id, goal.remoteId ?? null, goal.date, goal.text, goal.position, now, now]
  );
  return { ...goal, isCompleted: false, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryUpdateDailyGoalCompletion(
  db: SQLiteDatabase,
  id: string,
  isCompleted: boolean
): Promise<void> {
  await db.runAsync(
    'UPDATE daily_goals SET is_completed=?, updated_at=? WHERE id=?;',
    [isCompleted ? 1 : 0, new Date().toISOString(), id]
  );
}

export async function queryUpdateDailyGoalText(
  db: SQLiteDatabase,
  id: string,
  text: string
): Promise<void> {
  await db.runAsync(
    'UPDATE daily_goals SET text=?, updated_at=? WHERE id=?;',
    [text, new Date().toISOString(), id]
  );
}

export async function queryDeleteDailyGoal(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM daily_goals WHERE id=?;', [id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY GOAL CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export async function queryGetAllCategories(db: SQLiteDatabase): Promise<WeeklyGoalCategory[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM weekly_goal_categories ORDER BY position ASC;'
  );
  return rows.map(rowToCategory);
}

export async function queryCreateCategory(
  db: SQLiteDatabase,
  cat: Omit<WeeklyGoalCategory, 'createdAt' | 'updatedAt'>
): Promise<WeeklyGoalCategory> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO weekly_goal_categories (id, remote_id, name, color, is_default, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [cat.id, cat.remoteId ?? null, cat.name, cat.color, cat.isDefault ? 1 : 0, cat.position, now, now]
  );
  return { ...cat, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryUpdateCategory(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Pick<WeeklyGoalCategory, 'name' | 'color' | 'position'>>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (updates.name !== undefined)     { fields.push('name=?');     values.push(updates.name); }
  if (updates.color !== undefined)    { fields.push('color=?');    values.push(updates.color); }
  if (updates.position !== undefined) { fields.push('position=?'); values.push(updates.position); }
  fields.push('updated_at=?');
  values.push(new Date().toISOString());
  values.push(id);
  await db.runAsync(`UPDATE weekly_goal_categories SET ${fields.join(',')} WHERE id=?;`, values);
}

export async function queryDeleteCategory(db: SQLiteDatabase, id: string): Promise<void> {
  // Cascades to weekly_goals
  await db.runAsync('DELETE FROM weekly_goal_categories WHERE id=? AND is_default=0;', [id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY GOALS (3-tier)
// ─────────────────────────────────────────────────────────────────────────────

export async function queryGetWeeklyGoalsByWeek(
  db: SQLiteDatabase,
  weekLabel: string
): Promise<WeeklyGoal[]> {
  const rows = await db.getAllAsync<WeeklyGoalRow>(
    'SELECT * FROM weekly_goals WHERE week_label = ? ORDER BY tier ASC, position ASC;',
    [weekLabel]
  );
  return rows.map(rowToWeeklyGoal);
}

export async function queryCreateWeeklyGoal(
  db: SQLiteDatabase,
  goal: Omit<WeeklyGoal, 'createdAt' | 'updatedAt'>
): Promise<WeeklyGoal> {
  // Enforce tier and child cap
  if (goal.tier > MAX_TIERS) throw new Error(`Maximum tier is ${MAX_TIERS}.`);
  if (goal.parentId) {
    const siblings = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM weekly_goals WHERE parent_id=?;',
      [goal.parentId]
    );
    if ((siblings[0]?.count ?? 0) >= MAX_CHILDREN_PER_TIER) {
      throw new Error(`Maximum of ${MAX_CHILDREN_PER_TIER} child items per goal reached.`);
    }
  }
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO weekly_goals
       (id, remote_id, week_label, category_id, parent_id, tier, text, is_completed, position, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,0,?,?,?);`,
    [
      goal.id, goal.remoteId ?? null, goal.weekLabel, goal.categoryId,
      goal.parentId, goal.tier, goal.text, goal.position, now, now,
    ]
  );
  return { ...goal, isCompleted: false, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryUpdateWeeklyGoalCompletion(
  db: SQLiteDatabase,
  id: string,
  isCompleted: boolean
): Promise<void> {
  await db.runAsync(
    'UPDATE weekly_goals SET is_completed=?, updated_at=? WHERE id=?;',
    [isCompleted ? 1 : 0, new Date().toISOString(), id]
  );
}

export async function queryUpdateWeeklyGoalText(
  db: SQLiteDatabase,
  id: string,
  text: string
): Promise<void> {
  await db.runAsync(
    'UPDATE weekly_goals SET text=?, updated_at=? WHERE id=?;',
    [text, new Date().toISOString(), id]
  );
}

export async function queryDeleteWeeklyGoal(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM weekly_goals WHERE id=?;', [id]);
}

// ── Analytics helpers ─────────────────────────────────────────────────────────

export async function queryGetDailyGoalStats(
  db: SQLiteDatabase,
  date: string
): Promise<{ total: number; completed: number }> {
  const row = await db.getFirstAsync<{ total: number; completed: number }>(
    `SELECT COUNT(*) as total, SUM(is_completed) as completed FROM daily_goals WHERE date=?;`,
    [date]
  );
  return { total: row?.total ?? 0, completed: row?.completed ?? 0 };
}

export async function queryGetWeeklyGoalStats(
  db: SQLiteDatabase,
  weekLabel: string,
  categoryId?: string
): Promise<{ total: number; completed: number }> {
  const whereClause = categoryId
    ? 'WHERE week_label=? AND category_id=?'
    : 'WHERE week_label=?';
  const params = categoryId ? [weekLabel, categoryId] : [weekLabel];
  const row = await db.getFirstAsync<{ total: number; completed: number }>(
    `SELECT COUNT(*) as total, SUM(is_completed) as completed FROM weekly_goals ${whereClause};`,
    params
  );
  return { total: row?.total ?? 0, completed: row?.completed ?? 0 };
}
