/**
 * db.ts
 *
 * SQLite database initialisation and schema migrations.
 * Call initDatabase() once at app start before any repository operations.
 *
 * Schema versions:
 *  v1 — tracks, tags (original)
 *  v2 — extended tracks fields (taskType, allocatedStartTime, etc.)
 *  v3 — daily_goals, weekly_goal_categories, weekly_goals
 *  v4 — routines, routine_sub_activities, routine_reminders, routine_activity_logs
 */
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('time_tracker.db', { useNewConnection: true });
      await initDatabase(db);
      _db = db;
      return db;
    } finally {
      _initPromise = null;
    }
  })();

  return _initPromise;
}

async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // ── 1. tracks ───────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tracks (
      id                   TEXT PRIMARY KEY,
      remote_id            INTEGER,
      title                TEXT NOT NULL,
      description          TEXT NOT NULL DEFAULT '',
      status               TEXT NOT NULL DEFAULT 'created'
                             CHECK(status IN ('created','pending','time-allocated','in-progress','completed')),
      priority             TEXT NOT NULL DEFAULT 'medium'
                             CHECK(priority IN ('low','medium','high')),
      task_type            TEXT NOT NULL DEFAULT 'unallocated'
                             CHECK(task_type IN ('unallocated','allocated')),
      time_input_mode      TEXT CHECK(time_input_mode IN ('start-end','start-duration','duration-only')),
      allocated_start_time TEXT,
      allocated_end_time   TEXT,
      block_multiplier     INTEGER,
      duration_minutes     INTEGER,
      position             INTEGER NOT NULL DEFAULT 0,
      start_time           TEXT NOT NULL,
      end_time             TEXT,
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );
  `);

  // ── 2. tags ────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tags (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id  TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      name      TEXT NOT NULL,
      UNIQUE(track_id, name)
    );
  `);

  // ── 3. daily_goals ─────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_goals (
      id           TEXT PRIMARY KEY,
      remote_id    INTEGER,
      date         TEXT NOT NULL,
      text         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      is_completed INTEGER NOT NULL DEFAULT 0,
      position     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
  `);

  // ── 4. weekly_goal_categories ──────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weekly_goal_categories (
      id         TEXT PRIMARY KEY,
      remote_id  INTEGER,
      name       TEXT NOT NULL UNIQUE,
      color      TEXT NOT NULL DEFAULT '#7C3AED',
      is_default INTEGER NOT NULL DEFAULT 0,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default categories
  await db.execAsync(`
    INSERT OR IGNORE INTO weekly_goal_categories (id, name, color, is_default, position, created_at, updated_at)
    VALUES
      ('cat-uni',      'Uni',      '#7C3AED', 1, 0, datetime('now'), datetime('now')),
      ('cat-work',     'Work',     '#06B6D4', 1, 1, datetime('now'), datetime('now')),
      ('cat-personal', 'Personal', '#10B981', 1, 2, datetime('now'), datetime('now'));
  `);

  // ── 5. weekly_goals ────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weekly_goals (
      id           TEXT PRIMARY KEY,
      remote_id    INTEGER,
      week_label   TEXT NOT NULL,
      category_id  TEXT NOT NULL REFERENCES weekly_goal_categories(id) ON DELETE CASCADE,
      parent_id    TEXT REFERENCES weekly_goals(id) ON DELETE CASCADE,
      tier         INTEGER NOT NULL DEFAULT 1 CHECK(tier IN (1,2,3)),
      text         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      is_completed INTEGER NOT NULL DEFAULT 0,
      position     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
  `);

  // ── 6. routines ────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS routines (
      id          TEXT PRIMARY KEY,
      remote_id   INTEGER,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      color       TEXT NOT NULL DEFAULT '#7C3AED',
      position    INTEGER NOT NULL DEFAULT 0,
      frequency   TEXT NOT NULL DEFAULT 'daily',
      days_of_week TEXT NOT NULL DEFAULT '[]',
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);

  // ── 7. routine_sub_activities ──────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS routine_sub_activities (
      id         TEXT PRIMARY KEY,
      remote_id  INTEGER,
      routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ── 8. routine_reminders ───────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS routine_reminders (
      id         TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      hour       INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),
      minute     INTEGER NOT NULL CHECK(minute BETWEEN 0 AND 59),
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ── 9. routine_activity_logs ───────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS routine_activity_logs (
      id              TEXT PRIMARY KEY,
      routine_id      TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      sub_activity_id TEXT NOT NULL REFERENCES routine_sub_activities(id) ON DELETE CASCADE,
      date            TEXT NOT NULL,
      is_checked      INTEGER NOT NULL DEFAULT 0,
      checked_at      TEXT,
      created_at      TEXT NOT NULL,
      UNIQUE(sub_activity_id, date)
    );
  `);

  // ── 10. checklists ─────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS checklists (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ── 11. checklist_items ────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id           TEXT PRIMARY KEY,
      list_id      TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
      text         TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      position     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
  `);

  // ── 12. sticky_notes ───────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sticky_notes (
      id         TEXT PRIMARY KEY,
      content    TEXT NOT NULL CHECK(length(content) <= 255),
      color      TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ── 13. habits ─────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS habits (
      id         TEXT PRIMARY KEY,
      remote_id  INTEGER,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#7C3AED',
      position   INTEGER NOT NULL DEFAULT 0,
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ── 14. habit_logs ─────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id           TEXT PRIMARY KEY,
      habit_id     TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date         TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      UNIQUE(habit_id, date)
    );
  `);

  // ── 15. Column Migrations (Safe idempotent alters) ──────────────────────────
  try {
    await db.execAsync("ALTER TABLE routines ADD COLUMN frequency TEXT NOT NULL DEFAULT 'daily';");
  } catch {}
  try {
    await db.execAsync("ALTER TABLE routines ADD COLUMN days_of_week TEXT NOT NULL DEFAULT '[]';");
  } catch {}

  // ── 16. Performance Indexes ────────────────────────────────────────────────
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_tracks_status_type ON tracks(status, task_type);
    CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at);
    CREATE INDEX IF NOT EXISTS idx_tags_track_id ON tags(track_id);
    CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date);
    CREATE INDEX IF NOT EXISTS idx_weekly_goals_week_cat ON weekly_goals(week_label, category_id);
    CREATE INDEX IF NOT EXISTS idx_routine_subs_routine_id ON routine_sub_activities(routine_id);
    CREATE INDEX IF NOT EXISTS idx_routine_reminders_routine_id ON routine_reminders(routine_id);
    CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_date ON routine_activity_logs(routine_id, date);
    CREATE INDEX IF NOT EXISTS idx_checklist_items_list_id ON checklist_items(list_id);
    CREATE INDEX IF NOT EXISTS idx_sticky_notes_created_at ON sticky_notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(is_active);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
  `);
}

/**
 * Format bytes into human-readable string (KB, MB, etc.)
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Storage breakdown details.
 */
export interface StorageDetailStats {
  taskCount: number;
  dailyGoalCount: number;
  weeklyGoalCount: number;
  routineCount: number;
  routineLogCount: number;
  checklistCount?: number;
  stickyNoteCount?: number;
  dbSizeBytes: number;
}

/**
 * Return database storage metrics (item counts and database size in bytes).
 */
export async function getStorageStats(): Promise<StorageDetailStats> {
  try {
    const db = await getDatabase();
    let taskCount = 0;
    let dailyGoalCount = 0;
    let weeklyGoalCount = 0;
    let routineCount = 0;
    let routineLogCount = 0;
    let checklistCount = 0;
    let stickyNoteCount = 0;
    let pageCount = 0;
    let pageSize = 4096;

    try {
      const [tRow, dgRow, wgRow, rRow, rlRow, clRow, snRow] = await Promise.all([
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tracks;'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM daily_goals;'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM weekly_goals;'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM routines;'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM routine_activity_logs;'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM checklists;'),
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sticky_notes;'),
      ]);
      taskCount = tRow?.count ?? 0;
      dailyGoalCount = dgRow?.count ?? 0;
      weeklyGoalCount = wgRow?.count ?? 0;
      routineCount = rRow?.count ?? 0;
      routineLogCount = rlRow?.count ?? 0;
      checklistCount = clRow?.count ?? 0;
      stickyNoteCount = snRow?.count ?? 0;
    } catch (err) {
      console.warn('[db] getStorageStats count error:', err);
    }

    try {
      const pageCountRow = await db.getFirstAsync<any>('PRAGMA page_count;');
      if (pageCountRow) {
        pageCount = (Object.values(pageCountRow)[0] as number) || 0;
      }
    } catch (err) {
      console.warn('[db] getStorageStats page_count error:', err);
    }

    try {
      const pageSizeRow = await db.getFirstAsync<any>('PRAGMA page_size;');
      if (pageSizeRow) {
        pageSize = (Object.values(pageSizeRow)[0] as number) || 4096;
      }
    } catch (err) {
      console.warn('[db] getStorageStats page_size error:', err);
    }

    const dbSizeBytes = pageCount * pageSize;
    return {
      taskCount,
      dailyGoalCount,
      weeklyGoalCount,
      routineCount,
      routineLogCount,
      checklistCount,
      stickyNoteCount,
      dbSizeBytes,
    };
  } catch (e) {
    console.warn('[db] getStorageStats general error:', e);
    return {
      taskCount: 0,
      dailyGoalCount: 0,
      weeklyGoalCount: 0,
      routineCount: 0,
      routineLogCount: 0,
      checklistCount: 0,
      stickyNoteCount: 0,
      dbSizeBytes: 0,
    };
  }
}

/**
 * Delete the SQLite database file and clear the cached connection.
 * Used primarily during a full factory reset to avoid NullPointerException
 * when the app attempts to use a stale DB instance.
 */
export async function resetDatabase(): Promise<void> {
  const currentDb = _db;
  _db = null;

  _initPromise = (async () => {
    if (currentDb) {
      try {
        await currentDb.closeAsync();
      } catch (e) {
        console.warn('[db] error closing DB before reset:', e);
      }
    }
    try {
      await SQLite.deleteDatabaseAsync('time_tracker.db');
    } catch (e) {
      console.warn('[db] error deleting DB file:', e);
    }
    const freshDb = await SQLite.openDatabaseAsync('time_tracker.db', { useNewConnection: true });
    await initDatabase(freshDb);
    _db = freshDb;
    return freshDb;
  })();

  await _initPromise;
}

