/**
 * stickyNoteQueries.ts
 *
 * Raw SQLite operations for Sticky Notes.
 * Enforces caps (max 10 notes, max 255 chars per note).
 */
import { SQLiteDatabase } from 'expo-sqlite';
import { StickyNote, MAX_STICKY_NOTES, MAX_NOTE_CHARACTERS } from '../../types/List';

interface StickyNoteRow {
  id: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export async function queryAllStickyNotes(db: SQLiteDatabase): Promise<StickyNote[]> {
  const rows = await db.getAllAsync<StickyNoteRow>(
    'SELECT * FROM sticky_notes ORDER BY created_at DESC;'
  );

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function queryStickyNoteCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sticky_notes;'
  );
  return row?.count ?? 0;
}

export async function queryCreateStickyNote(
  db: SQLiteDatabase,
  id: string,
  content: string,
  color: string
): Promise<StickyNote> {
  const trimmed = content.trim();
  if (trimmed.length > MAX_NOTE_CHARACTERS) {
    throw new Error(`Sticky note cannot exceed ${MAX_NOTE_CHARACTERS} characters.`);
  }

  const count = await queryStickyNoteCount(db);
  if (count >= MAX_STICKY_NOTES) {
    throw new Error(`Maximum limit of ${MAX_STICKY_NOTES} sticky notes reached.`);
  }

  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO sticky_notes (id, content, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
    [id, trimmed, color, now, now]
  );

  return {
    id,
    content: trimmed,
    color,
    createdAt: now,
    updatedAt: now,
  };
}

export async function queryUpdateStickyNote(
  db: SQLiteDatabase,
  id: string,
  content: string,
  color: string
): Promise<void> {
  const trimmed = content.trim();
  if (trimmed.length > MAX_NOTE_CHARACTERS) {
    throw new Error(`Sticky note cannot exceed ${MAX_NOTE_CHARACTERS} characters.`);
  }

  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE sticky_notes SET content = ?, color = ?, updated_at = ? WHERE id = ?;',
    [trimmed, color, now, id]
  );
}

export async function queryDeleteStickyNote(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM sticky_notes WHERE id = ?;', [id]);
}
