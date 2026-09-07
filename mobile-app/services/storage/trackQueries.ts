/**
 * trackQueries.ts
 *
 * Raw SQL CRUD operations for the tracks and tags tables.
 * All sensitive fields (title, description) are encrypted/decrypted here.
 * Extended to support the full Track state machine and allocated time fields.
 */
import { SQLiteDatabase } from 'expo-sqlite';
import { Track } from '../../types/Track';
import { encrypt, decrypt } from './encryption';

// ── Row types ─────────────────────────────────────────────────────────────────

interface TrackRow {
  id: string;
  remote_id: number | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  task_type: string;
  time_input_mode: string | null;
  allocated_start_time: string | null;
  allocated_end_time: string | null;
  block_multiplier: number | null;
  duration_minutes: number | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

interface TagRow {
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function rowToTrack(row: TrackRow, tags: string[], key: string): Promise<Track> {
  return {
    id: row.id,
    remoteId: row.remote_id ?? undefined,
    title: await decrypt(row.title, key),
    description: await decrypt(row.description, key),
    status: row.status as Track['status'],
    priority: row.priority as Track['priority'],
    taskType: (row.task_type as Track['taskType']) ?? 'unallocated',
    timeInputMode: (row.time_input_mode as Track['timeInputMode']) ?? undefined,
    allocatedStartTime: row.allocated_start_time ? new Date(row.allocated_start_time) : undefined,
    allocatedEndTime: row.allocated_end_time ? new Date(row.allocated_end_time) : undefined,
    blockMultiplier: row.block_multiplier ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    startTime: new Date(row.start_time),
    endTime: row.end_time ? new Date(row.end_time) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    tags,
  };
}

async function getTagsForTrack(db: SQLiteDatabase, trackId: string): Promise<string[]> {
  const rows = await db.getAllAsync<TagRow>(
    'SELECT name FROM tags WHERE track_id = ? ORDER BY id ASC;',
    [trackId]
  );
  return rows.map((r) => r.name);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function queryGetAll(db: SQLiteDatabase, key: string): Promise<Track[]> {
  const rows = await db.getAllAsync<TrackRow>(
    'SELECT * FROM tracks ORDER BY updated_at DESC;'
  );
  return Promise.all(
    rows.map(async (row) => {
      const tags = await getTagsForTrack(db, row.id);
      return rowToTrack(row, tags, key);
    })
  );
}

export async function queryGetById(
  db: SQLiteDatabase,
  id: string,
  key: string
): Promise<Track | null> {
  const row = await db.getFirstAsync<TrackRow>(
    'SELECT * FROM tracks WHERE id = ?;',
    [id]
  );
  if (!row) return null;
  const tags = await getTagsForTrack(db, id);
  return rowToTrack(row, tags, key);
}

export async function queryCreate(
  db: SQLiteDatabase,
  track: Omit<Track, 'createdAt' | 'updatedAt'> & { id: string },
  key: string
): Promise<Track> {
  const now = new Date().toISOString();
  const encTitle = await encrypt(track.title, key);
  const encDesc = await encrypt(track.description, key);

  await db.runAsync(
    `INSERT INTO tracks (
        id, remote_id, title, description, status, priority,
        task_type, time_input_mode, allocated_start_time, allocated_end_time,
        block_multiplier, duration_minutes,
        start_time, end_time, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
    [
      track.id,
      track.remoteId ?? null,
      encTitle,
      encDesc,
      track.status,
      track.priority,
      track.taskType,
      track.timeInputMode ?? null,
      track.allocatedStartTime?.toISOString() ?? null,
      track.allocatedEndTime?.toISOString() ?? null,
      track.blockMultiplier ?? null,
      track.durationMinutes ?? null,
      track.startTime.toISOString(),
      track.endTime?.toISOString() ?? null,
      now,
      now,
    ]
  );

  if (track.tags && track.tags.length > 0) {
    for (const tag of track.tags) {
      await db.runAsync(
        'INSERT OR IGNORE INTO tags (track_id, name) VALUES (?, ?);',
        [track.id, tag]
      );
    }
  }

  return { ...track, createdAt: new Date(now), updatedAt: new Date(now) };
}

export async function queryUpdate(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<Track>,
  key: string
): Promise<Track | null> {
  const existing = await queryGetById(db, id, key);
  if (!existing) return null;

  const updated: Track = { ...existing, ...updates, updatedAt: new Date() };
  const encTitle = await encrypt(updated.title, key);
  const encDesc = await encrypt(updated.description, key);

  await db.runAsync(
    `UPDATE tracks SET
        title=?, description=?, status=?, priority=?,
        task_type=?, time_input_mode=?, allocated_start_time=?, allocated_end_time=?,
        block_multiplier=?, duration_minutes=?,
        start_time=?, end_time=?, updated_at=?
      WHERE id=?;`,
    [
      encTitle,
      encDesc,
      updated.status,
      updated.priority,
      updated.taskType,
      updated.timeInputMode ?? null,
      updated.allocatedStartTime?.toISOString() ?? null,
      updated.allocatedEndTime?.toISOString() ?? null,
      updated.blockMultiplier ?? null,
      updated.durationMinutes ?? null,
      updated.startTime.toISOString(),
      updated.endTime?.toISOString() ?? null,
      updated.updatedAt.toISOString(),
      id,
    ]
  );

  if (updates.tags !== undefined) {
    await db.runAsync('DELETE FROM tags WHERE track_id = ?;', [id]);
    for (const tag of updated.tags) {
      await db.runAsync(
        'INSERT OR IGNORE INTO tags (track_id, name) VALUES (?, ?);',
        [id, tag]
      );
    }
  }

  if (!updated) throw new Error(`Track ${id} not found after update`);
  return updated;
}

export async function queryDelete(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM tracks WHERE id = ?;', [id]);
}

export async function queryAddTag(
  db: SQLiteDatabase,
  trackId: string,
  tag: string,
  key: string
): Promise<Track> {
  await db.runAsync(
    'INSERT OR IGNORE INTO tags (track_id, name) VALUES (?, ?);',
    [trackId, tag]
  );
  const updated = await queryGetById(db, trackId, key);
  if (!updated) throw new Error(`Track ${trackId} not found`);
  return updated;
}

export async function queryRemoveTag(
  db: SQLiteDatabase,
  trackId: string,
  tag: string,
  key: string
): Promise<Track> {
  await db.runAsync(
    'DELETE FROM tags WHERE track_id = ? AND name = ?;',
    [trackId, tag]
  );
  const updated = await queryGetById(db, trackId, key);
  if (!updated) throw new Error(`Track ${trackId} not found`);
  return updated;
}

export async function queryClearAll(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM tags;');
  await db.runAsync('DELETE FROM tracks;');
}

export async function queryUpdateStatus(
  db: SQLiteDatabase,
  id: string,
  status: string
): Promise<void> {
  await db.runAsync(
    'UPDATE tracks SET status=?, updated_at=? WHERE id=?;',
    [status, new Date().toISOString(), id]
  );
}

/** Returns all allocated (in-progress) tasks whose end time has passed — used to trigger completion notifications */
export async function queryGetExpiredAllocatedTasks(db: SQLiteDatabase): Promise<{ id: string; allocated_end_time: string; title: string }[]> {
  const now = new Date().toISOString();
  return db.getAllAsync<{ id: string; allocated_end_time: string; title: string }>(
    `SELECT id, allocated_end_time, title FROM tracks
     WHERE task_type = 'allocated'
       AND status = 'in-progress'
       AND allocated_end_time IS NOT NULL
       AND allocated_end_time <= ?;`,
    [now]
  );
}

/** Returns all allocated tasks that should now transition to in-progress */
export async function queryGetDueAllocatedTasks(db: SQLiteDatabase): Promise<{ id: string; allocated_start_time: string; title: string }[]> {
  const now = new Date().toISOString();
  return db.getAllAsync<{ id: string; allocated_start_time: string; title: string }>(
    `SELECT id, allocated_start_time, title FROM tracks
     WHERE task_type = 'allocated'
       AND status = 'time-allocated'
       AND allocated_start_time IS NOT NULL
       AND allocated_start_time <= ?;`,
    [now]
  );
}
