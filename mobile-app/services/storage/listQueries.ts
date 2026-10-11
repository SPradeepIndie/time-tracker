/**
 * listQueries.ts
 *
 * Raw SQLite operations for Checklists and Checklist Items.
 * Enforces caps (max 5 lists, max 30 items per list).
 */
import { SQLiteDatabase } from 'expo-sqlite';
import { Checklist, ChecklistItem, MAX_LISTS, MAX_ITEMS_PER_LIST } from '../../types/List';

interface ChecklistRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChecklistItemRow {
  id: string;
  list_id: string;
  text: string;
  is_completed: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export async function queryAllChecklists(db: SQLiteDatabase): Promise<Checklist[]> {
  const listRows = await db.getAllAsync<ChecklistRow>(
    'SELECT * FROM checklists ORDER BY created_at ASC;'
  );

  const itemRows = await db.getAllAsync<ChecklistItemRow>(
    'SELECT * FROM checklist_items ORDER BY position ASC, created_at ASC;'
  );

  // Group items by list_id
  const itemsByListId: Record<string, ChecklistItem[]> = {};
  for (const row of itemRows) {
    if (!itemsByListId[row.list_id]) {
      itemsByListId[row.list_id] = [];
    }
    itemsByListId[row.list_id].push({
      id: row.id,
      listId: row.list_id,
      text: row.text,
      isCompleted: row.is_completed === 1,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  return listRows.map((row) => ({
    id: row.id,
    title: row.title,
    items: itemsByListId[row.id] || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function queryChecklistCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM checklists;'
  );
  return row?.count ?? 0;
}

export async function queryCreateChecklist(
  db: SQLiteDatabase,
  id: string,
  title: string
): Promise<Checklist> {
  const count = await queryChecklistCount(db);
  if (count >= MAX_LISTS) {
    throw new Error(`Maximum limit of ${MAX_LISTS} lists reached.`);
  }

  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO checklists (id, title, created_at, updated_at) VALUES (?, ?, ?, ?);',
    [id, title.trim(), now, now]
  );

  return {
    id,
    title: title.trim(),
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function queryUpdateChecklistTitle(
  db: SQLiteDatabase,
  id: string,
  title: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE checklists SET title = ?, updated_at = ? WHERE id = ?;',
    [title.trim(), now, id]
  );
}

export async function queryDeleteChecklist(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM checklists WHERE id = ?;', [id]);
}

export async function queryItemCount(
  db: SQLiteDatabase,
  listId: string
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM checklist_items WHERE list_id = ?;',
    [listId]
  );
  return row?.count ?? 0;
}

export async function queryCreateChecklistItem(
  db: SQLiteDatabase,
  id: string,
  listId: string,
  text: string,
  position = 0
): Promise<ChecklistItem> {
  const count = await queryItemCount(db, listId);
  if (count >= MAX_ITEMS_PER_LIST) {
    throw new Error(`Maximum limit of ${MAX_ITEMS_PER_LIST} items per list reached.`);
  }

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO checklist_items (id, list_id, text, is_completed, position, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, ?);`,
    [id, listId, text.trim(), position, now, now]
  );

  return {
    id,
    listId,
    text: text.trim(),
    isCompleted: false,
    position,
    createdAt: now,
    updatedAt: now,
  };
}

export async function queryToggleChecklistItem(
  db: SQLiteDatabase,
  itemId: string,
  isCompleted: boolean
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE checklist_items SET is_completed = ?, updated_at = ? WHERE id = ?;',
    [isCompleted ? 1 : 0, now, itemId]
  );
}

export async function queryUpdateChecklistItemText(
  db: SQLiteDatabase,
  itemId: string,
  text: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE checklist_items SET text = ?, updated_at = ? WHERE id = ?;',
    [text.trim(), now, itemId]
  );
}

export async function queryDeleteChecklistItem(
  db: SQLiteDatabase,
  itemId: string
): Promise<void> {
  await db.runAsync('DELETE FROM checklist_items WHERE id = ?;', [itemId]);
}
