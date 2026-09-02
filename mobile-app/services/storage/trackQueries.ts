/**
 * trackQueries.ts
 *
 * Raw SQL CRUD operations for the tracks and tags tables.
 * All sensitive fields (title, description) are encrypted/decrypted here.
 * This module is ONLY used by LocalStorageAdapter — never imported by UI.
 */
import { SQLiteDatabase } from 'expo-sqlite';
import { Track } from '../../types/Track';
import { encrypt, decrypt } from './encryption';

// ── Row types (as stored in SQLite) ──────────────────────────────────────────

interface TrackRow {
  id: string;
  remote_id: number | null;
  title: string;         // encrypted
  description: string;   // encrypted
  status: string;
  priority: string;
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
  track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'> & { id: string },
  key: string
): Promise<Track> {
  const now = new Date().toISOString();
  const encTitle = await encrypt(track.title, key);
  const encDesc = await encrypt(track.description, key);

  await db.runAsync(
    `INSERT INTO tracks (id, remote_id, title, description, status, priority, start_time, end_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      track.id,
      track.remoteId ?? null,
      encTitle,
      encDesc,
      track.status,
      track.priority,
      track.startTime.toISOString(),
      track.endTime?.toISOString() ?? null,
      now,
      now,
    ]
  );

  // Insert tags
  for (const tag of track.tags ?? []) {
    await db.runAsync(
      'INSERT OR IGNORE INTO tags (track_id, name) VALUES (?, ?);',
      [track.id, tag]
    );
  }

  return queryGetById(db, track.id, key) as Promise<Track>;
}

export async function queryUpdate(
  db: SQLiteDatabase,
  id: string,
  changes: Partial<Omit<Track, 'id' | 'createdAt'>>,
  key: string
): Promise<Track> {
  const now = new Date().toISOString();
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (changes.title !== undefined) {
    updates.push('title = ?');
    values.push(await encrypt(changes.title, key));
  }
  if (changes.description !== undefined) {
    updates.push('description = ?');
    values.push(await encrypt(changes.description, key));
  }
  if (changes.status !== undefined) {
    updates.push('status = ?');
    values.push(changes.status);
  }
  if (changes.priority !== undefined) {
    updates.push('priority = ?');
    values.push(changes.priority);
  }
  if (changes.startTime !== undefined) {
    updates.push('start_time = ?');
    values.push(changes.startTime.toISOString());
  }
  if ('endTime' in changes) {
    updates.push('end_time = ?');
    values.push(changes.endTime?.toISOString() ?? null);
  }
  if (changes.remoteId !== undefined) {
    updates.push('remote_id = ?');
    values.push(changes.remoteId);
  }

  values.push(id);
  await db.runAsync(
    `UPDATE tracks SET ${updates.join(', ')} WHERE id = ?;`,
    values
  );

  // Replace tags if provided
  if (changes.tags !== undefined) {
    await db.runAsync('DELETE FROM tags WHERE track_id = ?;', [id]);
    for (const tag of changes.tags) {
      await db.runAsync(
        'INSERT OR IGNORE INTO tags (track_id, name) VALUES (?, ?);',
        [id, tag]
      );
    }
  }

  return queryGetById(db, id, key) as Promise<Track>;
}

export async function queryDelete(db: SQLiteDatabase, id: string): Promise<void> {
  // Cascade delete removes tags automatically (FK + ON DELETE CASCADE)
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
  // bump updatedAt
  await db.runAsync(
    'UPDATE tracks SET updated_at = ? WHERE id = ?;',
    [new Date().toISOString(), trackId]
  );
  return queryGetById(db, trackId, key) as Promise<Track>;
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
  await db.runAsync(
    'UPDATE tracks SET updated_at = ? WHERE id = ?;',
    [new Date().toISOString(), trackId]
  );
  return queryGetById(db, trackId, key) as Promise<Track>;
}

/** Delete ALL tracks and tags — used by the "Clear All Data" settings action. */
export async function queryClearAll(db: SQLiteDatabase): Promise<void> {
  // Tags are cascade-deleted when tracks are deleted, but
  // explicit delete first is safer across all SQLite configurations.
  await db.runAsync('DELETE FROM tags;');
  await db.runAsync('DELETE FROM tracks;');
}
