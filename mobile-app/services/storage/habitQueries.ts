/**
 * habitQueries.ts
 *
 * Raw SQLite operations for habits and daily habit_logs.
 */
import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Habit, HabitLog, HabitWithLogs } from '../../types/Habit';

interface HabitRow {
  id: string;
  remote_id: number | null;
  name: string;
  color: string;
  position: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface HabitLogRow {
  id: string;
  habit_id: string;
  date: string;
  is_completed: number;
  created_at: string;
}

export async function queryGetAllHabitsWithWeeklyLogs(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<HabitWithLogs[]> {
  const habitsRows = await db.getAllAsync<HabitRow>(
    'SELECT * FROM habits WHERE is_active = 1 ORDER BY position ASC, created_at ASC;'
  );

  if (habitsRows.length === 0) return [];

  const logRows = await db.getAllAsync<HabitLogRow>(
    'SELECT * FROM habit_logs WHERE date >= ? AND date <= ? AND is_completed = 1;',
    [startDate, endDate]
  );

  const logsByHabit = new Map<string, Record<string, boolean>>();
  for (const log of logRows) {
    if (!logsByHabit.has(log.habit_id)) {
      logsByHabit.set(log.habit_id, {});
    }
    logsByHabit.get(log.habit_id)![log.date] = true;
  }

  return habitsRows.map((row) => ({
    id: row.id,
    remoteId: row.remote_id ?? undefined,
    name: row.name,
    color: row.color,
    position: row.position,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedDates: logsByHabit.get(row.id) || {},
  }));
}

export async function queryCreateHabit(
  db: SQLiteDatabase,
  name: string,
  color: string,
  position: number
): Promise<Habit> {
  const id = await Crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO habits (id, remote_id, name, color, position, is_active, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, 1, ?, ?);`,
    [id, name, color, position, now, now]
  );
  return {
    id,
    name,
    color,
    position,
    isActive: true,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function queryToggleHabitDay(
  db: SQLiteDatabase,
  habitId: string,
  date: string,
  isCompleted: boolean
): Promise<void> {
  const now = new Date().toISOString();
  if (isCompleted) {
    const id = await Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO habit_logs (id, habit_id, date, is_completed, created_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET is_completed = 1;`,
      [id, habitId, date, now]
    );
  } else {
    await db.runAsync(
      'DELETE FROM habit_logs WHERE habit_id = ? AND date = ?;',
      [habitId, date]
    );
  }
}

export async function queryDeleteHabit(
  db: SQLiteDatabase,
  habitId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE habits SET is_active = 0, updated_at = ? WHERE id = ?;',
    [now, habitId]
  );
}
