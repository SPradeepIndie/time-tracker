/**
 * ListContext.tsx
 *
 * State management and operations for Checklists and Sticky Notes.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../services/storage/db';
import { Checklist, ChecklistItem, StickyNote } from '../types/List';
import {
  queryAllChecklists,
  queryCreateChecklist,
  queryUpdateChecklistTitle,
  queryDeleteChecklist,
  queryCreateChecklistItem,
  queryToggleChecklistItem,
  queryUpdateChecklistItemText,
  queryDeleteChecklistItem,
} from '../services/storage/listQueries';
import {
  queryAllStickyNotes,
  queryCreateStickyNote,
  queryUpdateStickyNote,
  queryDeleteStickyNote,
} from '../services/storage/stickyNoteQueries';

interface ListContextType {
  checklists: Checklist[];
  stickyNotes: StickyNote[];
  isLoading: boolean;
  refreshAll: () => Promise<void>;

  // Checklist methods
  createChecklist: (title: string) => Promise<Checklist>;
  updateChecklistTitle: (id: string, title: string) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;

  // Checklist item methods
  addChecklistItem: (listId: string, text: string) => Promise<ChecklistItem>;
  toggleChecklistItem: (listId: string, itemId: string, isCompleted: boolean) => Promise<void>;
  updateChecklistItemText: (listId: string, itemId: string, text: string) => Promise<void>;
  deleteChecklistItem: (listId: string, itemId: string) => Promise<void>;

  // Sticky note methods
  createStickyNote: (content: string, color: string) => Promise<StickyNote>;
  updateStickyNote: (id: string, content: string, color: string) => Promise<void>;
  deleteStickyNote: (id: string) => Promise<void>;
}

const ListContext = createContext<ListContextType | undefined>(undefined);

export const ListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [loadedLists, loadedNotes] = await Promise.all([
        queryAllChecklists(db),
        queryAllStickyNotes(db),
      ]);
      setChecklists(loadedLists);
      setStickyNotes(loadedNotes);
    } catch (err) {
      console.error('[ListContext] refreshAll failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ── Checklist Actions ──────────────────────────────────────────────────────

  const createChecklist = async (title: string): Promise<Checklist> => {
    const db = await getDatabase();
    const id = await Crypto.randomUUID();
    const newList = await queryCreateChecklist(db, id, title);
    setChecklists((prev) => [...prev, newList]);
    return newList;
  };

  const updateChecklistTitle = async (id: string, title: string): Promise<void> => {
    const db = await getDatabase();
    await queryUpdateChecklistTitle(db, id, title);
    setChecklists((prev) =>
      prev.map((l) => (l.id === id ? { ...l, title: title.trim(), updatedAt: new Date().toISOString() } : l))
    );
  };

  const deleteChecklist = async (id: string): Promise<void> => {
    const db = await getDatabase();
    await queryDeleteChecklist(db, id);
    setChecklists((prev) => prev.filter((l) => l.id !== id));
  };

  // ── Checklist Item Actions ─────────────────────────────────────────────────

  const addChecklistItem = async (listId: string, text: string): Promise<ChecklistItem> => {
    const db = await getDatabase();
    const id = await Crypto.randomUUID();
    const list = checklists.find((l) => l.id === listId);
    const position = list?.items?.length ?? 0;
    const newItem = await queryCreateChecklistItem(db, id, listId, text, position);

    setChecklists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: [...(l.items || []), newItem],
              updatedAt: new Date().toISOString(),
            }
          : l
      )
    );
    return newItem;
  };

  const toggleChecklistItem = async (
    listId: string,
    itemId: string,
    isCompleted: boolean
  ): Promise<void> => {
    const db = await getDatabase();
    await queryToggleChecklistItem(db, itemId, isCompleted);

    setChecklists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: (l.items || []).map((it) =>
            it.id === itemId
              ? { ...it, isCompleted, updatedAt: new Date().toISOString() }
              : it
          ),
        };
      })
    );
  };

  const updateChecklistItemText = async (
    listId: string,
    itemId: string,
    text: string
  ): Promise<void> => {
    const db = await getDatabase();
    await queryUpdateChecklistItemText(db, itemId, text);

    setChecklists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: (l.items || []).map((it) =>
            it.id === itemId
              ? { ...it, text: text.trim(), updatedAt: new Date().toISOString() }
              : it
          ),
        };
      })
    );
  };

  const deleteChecklistItem = async (listId: string, itemId: string): Promise<void> => {
    const db = await getDatabase();
    await queryDeleteChecklistItem(db, itemId);

    setChecklists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          items: (l.items || []).filter((it) => it.id !== itemId),
        };
      })
    );
  };

  // ── Sticky Note Actions ────────────────────────────────────────────────────

  const createStickyNote = async (content: string, color: string): Promise<StickyNote> => {
    const db = await getDatabase();
    const id = await Crypto.randomUUID();
    const newNote = await queryCreateStickyNote(db, id, content, color);
    setStickyNotes((prev) => [newNote, ...prev]);
    return newNote;
  };

  const updateStickyNote = async (id: string, content: string, color: string): Promise<void> => {
    const db = await getDatabase();
    await queryUpdateStickyNote(db, id, content, color);
    setStickyNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, content: content.trim(), color, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  const deleteStickyNote = async (id: string): Promise<void> => {
    const db = await getDatabase();
    await queryDeleteStickyNote(db, id);
    setStickyNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <ListContext.Provider
      value={{
        checklists,
        stickyNotes,
        isLoading,
        refreshAll,
        createChecklist,
        updateChecklistTitle,
        deleteChecklist,
        addChecklistItem,
        toggleChecklistItem,
        updateChecklistItemText,
        deleteChecklistItem,
        createStickyNote,
        updateStickyNote,
        deleteStickyNote,
      }}
    >
      {children}
    </ListContext.Provider>
  );
};

export const useListContext = (): ListContextType => {
  const context = useContext(ListContext);
  if (!context) {
    throw new Error('useListContext must be used within a ListProvider');
  }
  return context;
};
