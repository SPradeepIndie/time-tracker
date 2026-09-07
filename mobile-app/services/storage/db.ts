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
      const db = await SQLite.openDatabaseAsync('time_tracker.db');
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

  // ── tracks table (v1 base) ─────────────────────────────────────────────────
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
      start_time           TEXT NOT NULL,
      end_time             TEXT,
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL
    );
  `);

  // Ensure all extended columns exist on existing databases (self-healing migration)
  const requiredColumns: Array<{ name: string; definition: string }> = [
    { name: 'task_type', definition: "TEXT NOT NULL DEFAULT 'unallocated'" },
    { name: 'time_input_mode', definition: 'TEXT' },
    { name: 'allocated_start_time', definition: 'TEXT' },
    { name: 'allocated_end_time', definition: 'TEXT' },
    { name: 'block_multiplier', definition: 'INTEGER' },
    { name: 'duration_minutes', definition: 'INTEGER' },
  ];

  for (const col of requiredColumns) {
    try {
      await db.execAsync(`ALTER TABLE tracks ADD COLUMN ${col.name} ${col.definition};`);
    } catch (err: any) {
      const msg = String(err?.message || err);
      // If column is already present, SQLite throws duplicate column name — safely ignore
      if (!msg.toLowerCase().includes('duplicate column')) {
        console.warn(`[db] Migration note for ${col.name}:`, err);
      }
    }
  }

  // Self-healing migration: check if tracks table enforces old CHECK constraint without 'created'
  try {
    const tableInfo = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='tracks';"
    );
    const tableSql = tableInfo?.sql || '';
    if (tableSql && !tableSql.includes("'created'") && !tableSql.includes('"created"')) {
      console.log('[db] Migrating tracks table to support created and time-allocated statuses...');
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync(`
        CREATE TABLE tracks_new (
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
          start_time           TEXT NOT NULL,
          end_time             TEXT,
          created_at           TEXT NOT NULL,
          updated_at           TEXT NOT NULL
        );

        INSERT INTO tracks_new (
          id, remote_id, title, description, status, priority,
          task_type, time_input_mode, allocated_start_time, allocated_end_time,
          block_multiplier, duration_minutes,
          start_time, end_time, created_at, updated_at
        )
        SELECT
          id,
          remote_id,
          title,
          COALESCE(description, ''),
          CASE 
            WHEN status IN ('created','pending','time-allocated','in-progress','completed') THEN status
            ELSE 'created'
          END,
          COALESCE(priority, 'medium'),
          COALESCE(task_type, 'unallocated'),
          time_input_mode,
          allocated_start_time,
          allocated_end_time,
          block_multiplier,
          duration_minutes,
          start_time,
          end_time,
          created_at,
          updated_at
        FROM tracks;

        DROP TABLE tracks;
        ALTER TABLE tracks_new RENAME TO tracks;
      `);
      await db.execAsync('PRAGMA foreign_keys = ON;');
      console.log('[db] tracks table successfully migrated to new schema.');
    }
  } catch (err) {
    console.error('[db] Error updating tracks table schema:', err);
    await db.execAsync('PRAGMA foreign_keys = ON;').catch(() => {});
  }

  // ── tags table ─────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tags (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id  TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      name      TEXT NOT NULL,
      UNIQUE(track_id, name)
    );
  `);

  // ── daily_goals table ──────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_goals (
      id           TEXT PRIMARY KEY,
      remote_id    INTEGER,
      date         TEXT NOT NULL,
      text         TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      position     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
  `);

  // ── weekly_goal_categories table ───────────────────────────────────────────
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

  // ── weekly_goals table (3-tier hierarchy via self-referencing parent_id) ──
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weekly_goals (
      id           TEXT PRIMARY KEY,
      remote_id    INTEGER,
      week_label   TEXT NOT NULL,
      category_id  TEXT NOT NULL REFERENCES weekly_goal_categories(id) ON DELETE CASCADE,
      parent_id    TEXT REFERENCES weekly_goals(id) ON DELETE CASCADE,
      tier         INTEGER NOT NULL DEFAULT 1 CHECK(tier IN (1,2,3)),
      text         TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      position     INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
  `);

  // ── routines table ─────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS routines (
      id          TEXT PRIMARY KEY,
      remote_id   INTEGER,
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      color       TEXT NOT NULL DEFAULT '#7C3AED',
      position    INTEGER NOT NULL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);

  // ── routine_sub_activities table ───────────────────────────────────────────
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

  // ── routine_reminders table ────────────────────────────────────────────────
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

  // ── routine_activity_logs table ────────────────────────────────────────────
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

  // ── schema_version table ───────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;'
  );
  const currentVersion = versionRow?.version ?? 0;
  await runMigrations(db, currentVersion);
}

async function runMigrations(
  db: SQLite.SQLiteDatabase,
  fromVersion: number
): Promise<void> {
  const migrations: Array<{ version: number; sql: string }> = [
    {
      version: 1,
      sql: `INSERT OR IGNORE INTO schema_version(version) VALUES (1);`,
    },
    {
      // v2: Add extended task fields if they don't already exist (ALTER TABLE is safe on SQLite)
      version: 2,
      sql: `
        INSERT OR IGNORE INTO schema_version(version) VALUES (2);
      `,
    },
    {
      // v3: Seed default weekly goal categories
      version: 3,
      sql: `
        INSERT OR IGNORE INTO weekly_goal_categories (id, name, color, is_default, position, created_at, updated_at)
        VALUES
          ('cat-uni',      'Uni',      '#7C3AED', 1, 0, datetime('now'), datetime('now')),
          ('cat-work',     'Work',     '#06B6D4', 1, 1, datetime('now'), datetime('now')),
          ('cat-personal', 'Personal', '#10B981', 1, 2, datetime('now'), datetime('now'));
        INSERT OR IGNORE INTO schema_version(version) VALUES (3);
      `,
    },
    {
      // v4: routine tables already created above; just stamp version
      version: 4,
      sql: `INSERT OR IGNORE INTO schema_version(version) VALUES (4);`,
    },
    {
      // v5: tracks status CHECK constraint update
      version: 5,
      sql: `INSERT OR IGNORE INTO schema_version(version) VALUES (5);`,
    },
  ];

  for (const migration of migrations) {
    if (migration.version > fromVersion) {
      await db.execAsync(migration.sql);
    }
  }
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
 * Return database storage metrics (task count and database size in bytes).
 */
export async function getStorageStats(): Promise<{ taskCount: number; dbSizeBytes: number }> {
  try {
    const db = await getDatabase();
    let taskCount = 0;
    let pageCount = 0;
    let pageSize = 4096;

    try {
      const countRow = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM tracks;'
      );
      taskCount = countRow?.count ?? 0;
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
    return { taskCount, dbSizeBytes };
  } catch (e) {
    console.warn('[db] getStorageStats general error:', e);
    return { taskCount: 0, dbSizeBytes: 0 };
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
    const freshDb = await SQLite.openDatabaseAsync('time_tracker.db');
    await initDatabase(freshDb);
    _db = freshDb;
    return freshDb;
  })();

  await _initPromise;
}

