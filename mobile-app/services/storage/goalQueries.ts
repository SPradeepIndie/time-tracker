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
  GoalStatus,
  MAX_DAILY_GOALS,
  MAX_CHILDREN_PER_TIER,
  MAX_TIERS,
} from '../../types/Goal';
import { getOrCreateEncryptionKey, encrypt, decrypt } from './encryption';

// ── Row types ─────────────────────────────────────────────────────────────────

interface DailyGoalRow {
  id: string;
  remote_id: number | null;
  date: string;
  text: string;
  status: string;
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
  status: string;
  is_completed: number;
  position: number;
  created_at: string;
  updated_at: string;
}

// ── Converters ────────────────────────────────────────────────────────────────

async function rowToDailyGoal(row: DailyGoalRow, key: string): Promise<DailyGoal> {
  const status = (row.status as GoalStatus) || (row.is_completed === 1 ? 'completed' : 'pending');
  return {
    id: row.id,
    remoteId: row.remote_id ?? undefined,
    date: row.date,
    text: await decrypt(row.text, key),
    status,
    isCompleted: status === 'completed' || status === 'completed_overdue',
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

async function rowToWeeklyGoal(row: WeeklyGoalRow, key: string): Promise<WeeklyGoal> {
  const status = (row.status as GoalStatus) || (row.is_completed === 1 ? 'completed' : 'pending');
  return {
    id: row.id,
    remoteId: row.remote_id ?? undefined,
    weekLabel: row.week_label,
    categoryId: row.category_id,
    parentId: row.parent_id,
    tier: row.tier as 1 | 2 | 3,
    text: await decrypt(row.text, key),
    status,
    isCompleted: status === 'completed' || status === 'completed_overdue',
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
  const key = await getOrCreateEncryptionKey();
  const rows = await db.getAllAsync<DailyGoalRow>(
    'SELECT * FROM daily_goals WHERE date = ? ORDER BY position ASC;',
    [date]
  );
  return Promise.all(rows.map((r) => rowToDailyGoal(r, key)));
}

/**
 * Returns today's goals plus any active overdue goals from past dates.
 */
export async function queryGetActiveDailyGoals(
  db: SQLiteDatabase,
  today: string
): Promise<DailyGoal[]> {
  const key = await getOrCreateEncryptionKey();
  const rows = await db.getAllAsync<DailyGoalRow>(
    `SELECT * FROM daily_goals
     WHERE date = ? OR (status = 'overdue' AND date < ?)
     ORDER BY CASE WHEN status = 'overdue' THEN 0 ELSE 1 END, position ASC;`,
    [today, today]
  );
  return Promise.all(rows.map((r) => rowToDailyGoal(r, key)));
}

/**
 * Transitions past uncompleted daily goals from 'pending' to 'overdue'.
 */
export async function queryTransitionOverdueDailyGoals(
  db: SQLiteDatabase,
  today: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE daily_goals
     SET status = 'overdue', updated_at = ?
     WHERE date < ? AND status = 'pending';`,
    [now, today]
  );
}

export async function queryCreateDailyGoal(
  db: SQLiteDatabase,
  goal: Omit<DailyGoal, 'createdAt' | 'updatedAt' | 'status'>
): Promise<DailyGoal> {
  // Enforce cap
  const existing = await queryGetDailyGoalsByDate(db, goal.date);
  if (existing.length >= MAX_DAILY_GOALS) {
    throw new Error(`Maximum of ${MAX_DAILY_GOALS} goals per day reached.`);
  }
  const key = await getOrCreateEncryptionKey();
  const encText = await encrypt(goal.text, key);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO daily_goals (id, remote_id, date, text, status, is_completed, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?);`,
    [goal.id, goal.remoteId ?? null, goal.date, encText, goal.position, now, now]
  );
  return { ...goal, status: 'pending', isCompleted: false, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryUpdateDailyGoalCompletion(
  db: SQLiteDatabase,
  id: string,
  isCompleted: boolean,
  today?: string
): Promise<GoalStatus> {
  const row = await db.getFirstAsync<DailyGoalRow>(
    'SELECT * FROM daily_goals WHERE id = ?;',
    [id]
  );
  const now = new Date().toISOString();
  let newStatus: GoalStatus;

  if (isCompleted) {
    if (row && (row.status === 'overdue' || (today && row.date < today))) {
      newStatus = 'completed_overdue';
    } else {
      newStatus = 'completed';
    }
  } else {
    if (row && (row.status === 'completed_overdue' || (today && row.date < today))) {
      newStatus = 'overdue';
    } else {
      newStatus = 'pending';
    }
  }

  await db.runAsync(
    'UPDATE daily_goals SET status=?, is_completed=?, updated_at=? WHERE id=?;',
    [newStatus, isCompleted ? 1 : 0, now, id]
  );
  return newStatus;
}

export async function queryUpdateDailyGoalText(
  db: SQLiteDatabase,
  id: string,
  text: string
): Promise<void> {
  const key = await getOrCreateEncryptionKey();
  const encText = await encrypt(text, key);
  await db.runAsync(
    'UPDATE daily_goals SET text=?, updated_at=? WHERE id=?;',
    [encText, new Date().toISOString(), id]
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
  const key = await getOrCreateEncryptionKey();
  const rows = await db.getAllAsync<WeeklyGoalRow>(
    'SELECT * FROM weekly_goals WHERE week_label = ? ORDER BY tier ASC, position ASC;',
    [weekLabel]
  );
  return Promise.all(rows.map((r) => rowToWeeklyGoal(r, key)));
}

/**
 * Returns active weekly goals for the given week, including past uncompleted goals marked overdue.
 */
export async function queryGetActiveWeeklyGoals(
  db: SQLiteDatabase,
  currentWeek: string
): Promise<WeeklyGoal[]> {
  const key = await getOrCreateEncryptionKey();
  const rows = await db.getAllAsync<WeeklyGoalRow>(
    `SELECT * FROM weekly_goals
     WHERE week_label = ? OR (status = 'overdue' AND week_label < ?)
     ORDER BY CASE WHEN status = 'overdue' THEN 0 ELSE 1 END, tier ASC, position ASC;`,
    [currentWeek, currentWeek]
  );
  return Promise.all(rows.map((r) => rowToWeeklyGoal(r, key)));
}

/**
 * Transitions past uncompleted weekly goals from 'pending' to 'overdue'.
 */
export async function queryTransitionOverdueWeeklyGoals(
  db: SQLiteDatabase,
  currentWeek: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE weekly_goals
     SET status = 'overdue', updated_at = ?
     WHERE week_label < ? AND status = 'pending';`,
    [now, currentWeek]
  );
}

export async function queryCreateWeeklyGoal(
  db: SQLiteDatabase,
  goal: Omit<WeeklyGoal, 'createdAt' | 'updatedAt' | 'status'>
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
  const key = await getOrCreateEncryptionKey();
  const encText = await encrypt(goal.text, key);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO weekly_goals
       (id, remote_id, week_label, category_id, parent_id, tier, text, status, is_completed, position, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?, 'pending', 0,?,?,?);`,
    [
      goal.id, goal.remoteId ?? null, goal.weekLabel, goal.categoryId,
      goal.parentId, goal.tier, encText, goal.position, now, now,
    ]
  );
  return { ...goal, status: 'pending', isCompleted: false, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryUpdateWeeklyGoalCompletion(
  db: SQLiteDatabase,
  id: string,
  isCompleted: boolean,
  currentWeek?: string
): Promise<GoalStatus> {
  const row = await db.getFirstAsync<WeeklyGoalRow>(
    'SELECT * FROM weekly_goals WHERE id = ?;',
    [id]
  );
  const now = new Date().toISOString();
  let newStatus: GoalStatus;

  if (isCompleted) {
    if (row && (row.status === 'overdue' || (currentWeek && row.week_label < currentWeek))) {
      newStatus = 'completed_overdue';
    } else {
      newStatus = 'completed';
    }
  } else {
    if (row && (row.status === 'completed_overdue' || (currentWeek && row.week_label < currentWeek))) {
      newStatus = 'overdue';
    } else {
      newStatus = 'pending';
    }
  }

  await db.runAsync(
    'UPDATE weekly_goals SET status=?, is_completed=?, updated_at=? WHERE id=?;',
    [newStatus, isCompleted ? 1 : 0, now, id]
  );
  return newStatus;
}

export async function queryUpdateWeeklyGoalText(
  db: SQLiteDatabase,
  id: string,
  text: string
): Promise<void> {
  const key = await getOrCreateEncryptionKey();
  const encText = await encrypt(text, key);
  await db.runAsync(
    'UPDATE weekly_goals SET text=?, updated_at=? WHERE id=?;',
    [encText, new Date().toISOString(), id]
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

// ── Automatic Rollover Helpers ────────────────────────────────────────────────

/**
 * Automatically rolls over uncompleted daily goals from past days into today.
 */
export async function queryRolloverUncompletedDailyGoals(
  db: SQLiteDatabase,
  today: string
): Promise<number> {
  const now = new Date().toISOString();
  const pastUncompleted = await db.getAllAsync<DailyGoalRow>(
    'SELECT * FROM daily_goals WHERE date < ? AND is_completed = 0 ORDER BY date ASC, position ASC;',
    [today]
  );
  if (pastUncompleted.length === 0) return 0;

  const todayCountRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM daily_goals WHERE date = ?;',
    [today]
  );
  let nextPos = todayCountRow?.count ?? 0;

  for (const goal of pastUncompleted) {
    await db.runAsync(
      'UPDATE daily_goals SET date = ?, position = ?, updated_at = ? WHERE id = ?;',
      [today, nextPos++, now, goal.id]
    );
  }
  return pastUncompleted.length;
}

/**
 * Automatically rolls over uncompleted weekly goals from past weeks into current week.
 * If a parent goal was completed last week, the uncompleted child goal is promoted
 * to top-level (tier 1) so it remains visible and actionable in the active week.
 */
export async function queryRolloverUncompletedWeeklyGoals(
  db: SQLiteDatabase,
  currentWeek: string
): Promise<number> {
  const now = new Date().toISOString();
  const pastUncompleted = await db.getAllAsync<WeeklyGoalRow>(
    'SELECT * FROM weekly_goals WHERE week_label < ? AND is_completed = 0 ORDER BY tier ASC, position ASC;',
    [currentWeek]
  );
  if (pastUncompleted.length === 0) return 0;

  const pastUncompletedIds = new Set(pastUncompleted.map((g) => g.id));

  for (const goal of pastUncompleted) {
    let newParentId = goal.parent_id;
    let newTier = goal.tier;

    if (goal.parent_id && !pastUncompletedIds.has(goal.parent_id)) {
      newParentId = null;
      newTier = 1;
    }

    await db.runAsync(
      'UPDATE weekly_goals SET week_label = ?, parent_id = ?, tier = ?, updated_at = ? WHERE id = ?;',
      [currentWeek, newParentId, newTier, now, goal.id]
    );
  }

  return pastUncompleted.length;
}

