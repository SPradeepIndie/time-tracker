/**
 * routineQueries.ts
 *
 * Raw SQL CRUD for routines, routine_sub_activities,
 * routine_reminders, and routine_activity_logs.
 */
import { SQLiteDatabase } from 'expo-sqlite';
import { Routine, SubActivity, RoutineReminder, RoutineActivityLog } from '../../types/Routine';

// ── Row types ─────────────────────────────────────────────────────────────────

interface RoutineRow {
  id: string; remote_id: number | null; name: string; description: string;
  color: string; position: number; is_active: number;
  created_at: string; updated_at: string;
}
interface SubActivityRow {
  id: string; remote_id: number | null; routine_id: string;
  text: string; position: number; created_at: string; updated_at: string;
}
interface ReminderRow {
  id: string; routine_id: string; hour: number; minute: number;
  is_enabled: number; created_at: string; updated_at: string;
}
interface ActivityLogRow {
  id: string; routine_id: string; sub_activity_id: string;
  date: string; is_checked: number; checked_at: string | null; created_at: string;
}

// ── Converters ────────────────────────────────────────────────────────────────

function rowToRoutine(r: RoutineRow): Routine {
  return {
    id: r.id, remoteId: r.remote_id ?? undefined, name: r.name,
    description: r.description, color: r.color, position: r.position,
    isActive: r.is_active === 1,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}
function rowToSubActivity(r: SubActivityRow): SubActivity {
  return {
    id: r.id, remoteId: r.remote_id ?? undefined, routineId: r.routine_id,
    text: r.text, position: r.position,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}
function rowToReminder(r: ReminderRow): RoutineReminder {
  return {
    id: r.id, routineId: r.routine_id, hour: r.hour, minute: r.minute,
    isEnabled: r.is_enabled === 1,
    createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}
function rowToActivityLog(r: ActivityLogRow): RoutineActivityLog {
  return {
    id: r.id, routineId: r.routine_id, subActivityId: r.sub_activity_id,
    date: r.date, isChecked: r.is_checked === 1,
    checkedAt: r.checked_at ? new Date(r.checked_at) : undefined,
    createdAt: new Date(r.created_at),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTINES
// ─────────────────────────────────────────────────────────────────────────────

export async function queryGetAllRoutines(db: SQLiteDatabase): Promise<Routine[]> {
  const rows = await db.getAllAsync<RoutineRow>(
    'SELECT * FROM routines WHERE is_active=1 ORDER BY position ASC;'
  );
  return rows.map(rowToRoutine);
}

export async function queryCreateRoutine(
  db: SQLiteDatabase,
  routine: Omit<Routine, 'createdAt' | 'updatedAt'>
): Promise<Routine> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO routines (id, remote_id, name, description, color, position, is_active, created_at, updated_at)
     VALUES (?,?,?,?,?,?,1,?,?);`,
    [routine.id, routine.remoteId ?? null, routine.name, routine.description ?? '', routine.color, routine.position, now, now]
  );
  return { ...routine, isActive: true, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryUpdateRoutine(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Pick<Routine, 'name' | 'description' | 'color' | 'position'>>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (updates.name !== undefined)        { fields.push('name=?');        values.push(updates.name); }
  if (updates.description !== undefined) { fields.push('description=?'); values.push(updates.description); }
  if (updates.color !== undefined)       { fields.push('color=?');       values.push(updates.color); }
  if (updates.position !== undefined)    { fields.push('position=?');    values.push(updates.position); }
  fields.push('updated_at=?');
  values.push(new Date().toISOString(), id);
  await db.runAsync(`UPDATE routines SET ${fields.join(',')} WHERE id=?;`, values);
}

export async function queryDeleteRoutine(db: SQLiteDatabase, id: string): Promise<void> {
  // Soft delete
  await db.runAsync(
    'UPDATE routines SET is_active=0, updated_at=? WHERE id=?;',
    [new Date().toISOString(), id]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────

export async function queryGetSubActivities(
  db: SQLiteDatabase,
  routineId: string
): Promise<SubActivity[]> {
  const rows = await db.getAllAsync<SubActivityRow>(
    'SELECT * FROM routine_sub_activities WHERE routine_id=? ORDER BY position ASC;',
    [routineId]
  );
  return rows.map(rowToSubActivity);
}

export async function queryCreateSubActivity(
  db: SQLiteDatabase,
  activity: Omit<SubActivity, 'createdAt' | 'updatedAt'>
): Promise<SubActivity> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO routine_sub_activities (id, remote_id, routine_id, text, position, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?);`,
    [activity.id, activity.remoteId ?? null, activity.routineId, activity.text, activity.position, now, now]
  );
  return { ...activity, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryUpdateSubActivity(
  db: SQLiteDatabase,
  id: string,
  text: string
): Promise<void> {
  await db.runAsync(
    'UPDATE routine_sub_activities SET text=?, updated_at=? WHERE id=?;',
    [text, new Date().toISOString(), id]
  );
}

export async function queryDeleteSubActivity(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM routine_sub_activities WHERE id=?;', [id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// REMINDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function queryGetReminders(
  db: SQLiteDatabase,
  routineId: string
): Promise<RoutineReminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM routine_reminders WHERE routine_id=? ORDER BY hour ASC, minute ASC;',
    [routineId]
  );
  return rows.map(rowToReminder);
}

export async function queryGetAllEnabledReminders(db: SQLiteDatabase): Promise<RoutineReminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM routine_reminders WHERE is_enabled=1;'
  );
  return rows.map(rowToReminder);
}

export async function queryCreateReminder(
  db: SQLiteDatabase,
  reminder: Omit<RoutineReminder, 'createdAt' | 'updatedAt'>
): Promise<RoutineReminder> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO routine_reminders (id, routine_id, hour, minute, is_enabled, created_at, updated_at)
     VALUES (?,?,?,?,1,?,?);`,
    [reminder.id, reminder.routineId, reminder.hour, reminder.minute, now, now]
  );
  return { ...reminder, isEnabled: true, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryToggleReminder(
  db: SQLiteDatabase,
  id: string,
  isEnabled: boolean
): Promise<void> {
  await db.runAsync(
    'UPDATE routine_reminders SET is_enabled=?, updated_at=? WHERE id=?;',
    [isEnabled ? 1 : 0, new Date().toISOString(), id]
  );
}

export async function queryDeleteReminder(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM routine_reminders WHERE id=?;', [id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY LOGS (daily checklist state)
// ─────────────────────────────────────────────────────────────────────────────

export async function queryGetActivityLogs(
  db: SQLiteDatabase,
  routineId: string,
  date: string
): Promise<RoutineActivityLog[]> {
  const rows = await db.getAllAsync<ActivityLogRow>(
    'SELECT * FROM routine_activity_logs WHERE routine_id=? AND date=?;',
    [routineId, date]
  );
  return rows.map(rowToActivityLog);
}

/** Ensure a log row exists for each sub-activity for today, then return them */
export async function queryEnsureLogsForDate(
  db: SQLiteDatabase,
  routineId: string,
  subActivities: SubActivity[],
  date: string
): Promise<RoutineActivityLog[]> {
  const now = new Date().toISOString();
  for (const act of subActivities) {
    await db.runAsync(
      `INSERT OR IGNORE INTO routine_activity_logs
         (id, routine_id, sub_activity_id, date, is_checked, created_at)
       VALUES (?, ?, ?, ?, 0, ?);`,
      [`log-${act.id}-${date}`, routineId, act.id, date, now]
    );
  }
  return queryGetActivityLogs(db, routineId, date);
}

export async function queryToggleActivityLog(
  db: SQLiteDatabase,
  id: string,
  isChecked: boolean
): Promise<void> {
  await db.runAsync(
    'UPDATE routine_activity_logs SET is_checked=?, checked_at=? WHERE id=?;',
    [isChecked ? 1 : 0, isChecked ? new Date().toISOString() : null, id]
  );
}

// ── Analytics helper ──────────────────────────────────────────────────────────

export async function queryGetRoutineStatsForDate(
  db: SQLiteDatabase,
  date: string
): Promise<{ total: number; checked: number }> {
  const row = await db.getFirstAsync<{ total: number; checked: number }>(
    `SELECT COUNT(*) as total, SUM(is_checked) as checked
     FROM routine_activity_logs WHERE date=?;`,
    [date]
  );
  return { total: row?.total ?? 0, checked: row?.checked ?? 0 };
}
