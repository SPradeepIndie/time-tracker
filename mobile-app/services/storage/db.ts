/**
 * db.ts
 *
 * SQLite database initialisation and schema migrations.
 * Call initDatabase() once at app start before any repository operations.
 */
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('time_tracker.db');
  await initDatabase(_db);
  return _db;
}

async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  // Enable WAL mode for better concurrent read performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  // Enforce foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // ── tracks table ────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tracks (
      id          TEXT PRIMARY KEY,
      remote_id   INTEGER,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending', 'in-progress', 'completed')),
      priority    TEXT NOT NULL DEFAULT 'medium'
                    CHECK(priority IN ('low', 'medium', 'high')),
      start_time  TEXT NOT NULL,
      end_time    TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);

  // ── tags table (normalised, 1 row per tag) ──────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tags (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id  TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      name      TEXT NOT NULL,
      UNIQUE(track_id, name)
    );
  `);

  // ── schema_version table (future migrations) ─────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;'
  );
  const currentVersion = versionRow?.version ?? 0;

  // Run pending migrations in order
  await runMigrations(db, currentVersion);
}

async function runMigrations(
  db: SQLite.SQLiteDatabase,
  fromVersion: number
): Promise<void> {
  // Migrations array — add new objects here for future schema changes
  const migrations: Array<{ version: number; sql: string }> = [
    // v1 — initial schema (tables already created above, just stamp version)
    {
      version: 1,
      sql: `INSERT OR IGNORE INTO schema_version(version) VALUES (1);`,
    },
  ];

  for (const migration of migrations) {
    if (migration.version > fromVersion) {
      await db.execAsync(migration.sql);
    }
  }
}
