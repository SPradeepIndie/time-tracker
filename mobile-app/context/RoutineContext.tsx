/**
 * RoutineContext.tsx
 *
 * React context providing routine state and operations to the UI.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getDatabase } from '../services/storage/db';
import {
  queryGetAllRoutines,
  queryCreateRoutine,
  queryUpdateRoutine,
  queryDeleteRoutine,
  queryGetSubActivities,
  queryCreateSubActivity,
  queryUpdateSubActivity,
  queryDeleteSubActivity,
  queryGetReminders,
  queryCreateReminder,
  queryToggleReminder,
  queryDeleteReminder,
  queryGetAllEnabledReminders,
  queryEnsureLogsForDate,
  queryToggleActivityLog,
} from '../services/storage/routineQueries';
import {
  scheduleRoutineReminder,
  cancelRoutineReminder,
} from '../services/notifications/notificationService';
import { Routine, SubActivity, RoutineReminder, RoutineActivityLog } from '../types/Routine';
import * as Crypto from 'expo-crypto';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface RoutineContextValue {
  routines: Routine[];
  loadRoutines: () => Promise<void>;
  addRoutine: (name: string, description: string, color: string) => Promise<void>;
  updateRoutine: (id: string, updates: Partial<Pick<Routine, 'name' | 'description' | 'color'>>) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;

  // Sub-activities
  getSubActivities: (routineId: string) => Promise<SubActivity[]>;
  addSubActivity: (routineId: string, text: string) => Promise<SubActivity>;
  updateSubActivity: (id: string, text: string) => Promise<void>;
  deleteSubActivity: (id: string) => Promise<void>;

  // Reminders
  getReminders: (routineId: string) => Promise<RoutineReminder[]>;
  addReminder: (routineId: string, hour: number, minute: number) => Promise<void>;
  toggleReminderEnabled: (reminder: RoutineReminder) => Promise<void>;
  deleteReminder: (reminder: RoutineReminder) => Promise<void>;

  // Daily logs
  getDailyLogs: (routineId: string, subActivities: SubActivity[], date: string) => Promise<RoutineActivityLog[]>;
  toggleActivityLog: (logId: string, isChecked: boolean) => Promise<void>;

  isLoading: boolean;
}

const RoutineContext = createContext<RoutineContextValue | null>(null);

export function RoutineProvider({ children }: { children: React.ReactNode }) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRoutines = useCallback(async () => {
    const db = await getDatabase();
    const list = await queryGetAllRoutines(db);
    setRoutines(list);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadRoutines().finally(() => setIsLoading(false));
  }, [loadRoutines]);

  // ── Routine CRUD ────────────────────────────────────────────────────────────

  const addRoutine = useCallback(async (name: string, description: string, color: string) => {
    const db = await getDatabase();
    const routine = await queryCreateRoutine(db, {
      id: await Crypto.randomUUID(),
      name,
      description,
      color,
      position: routines.length,
      isActive: true,
    });
    setRoutines((prev) => [...prev, routine]);
  }, [routines]);

  const updateRoutine = useCallback(async (id: string, updates: Partial<Pick<Routine, 'name' | 'description' | 'color'>>) => {
    const db = await getDatabase();
    await queryUpdateRoutine(db, id, updates);
    setRoutines((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRoutine = useCallback(async (id: string) => {
    const db = await getDatabase();
    await queryDeleteRoutine(db, id);
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ── Sub-activities ──────────────────────────────────────────────────────────

  const getSubActivities = useCallback(async (routineId: string) => {
    const db = await getDatabase();
    return queryGetSubActivities(db, routineId);
  }, []);

  const addSubActivity = useCallback(async (routineId: string, text: string) => {
    const db = await getDatabase();
    const existing = await queryGetSubActivities(db, routineId);
    return queryCreateSubActivity(db, {
      id: await Crypto.randomUUID(),
      routineId,
      text,
      position: existing.length,
    });
  }, []);

  const updateSubActivity = useCallback(async (id: string, text: string) => {
    const db = await getDatabase();
    await queryUpdateSubActivity(db, id, text);
  }, []);

  const deleteSubActivity = useCallback(async (id: string) => {
    const db = await getDatabase();
    await queryDeleteSubActivity(db, id);
  }, []);

  // ── Reminders ───────────────────────────────────────────────────────────────

  const getReminders = useCallback(async (routineId: string) => {
    const db = await getDatabase();
    return queryGetReminders(db, routineId);
  }, []);

  const addReminder = useCallback(async (routineId: string, hour: number, minute: number) => {
    const db = await getDatabase();
    const routine = routines.find((r) => r.id === routineId);
    const reminder = await queryCreateReminder(db, {
      id: await Crypto.randomUUID(),
      routineId,
      hour,
      minute,
      isEnabled: true,
    });
    if (routine) {
      await scheduleRoutineReminder(reminder.id, routine.name, hour, minute);
    }
  }, [routines]);

  const toggleReminderEnabled = useCallback(async (reminder: RoutineReminder) => {
    const db = await getDatabase();
    const newEnabled = !reminder.isEnabled;
    await queryToggleReminder(db, reminder.id, newEnabled);
    const routine = routines.find((r) => r.id === reminder.routineId);
    if (newEnabled && routine) {
      await scheduleRoutineReminder(reminder.id, routine.name, reminder.hour, reminder.minute);
    } else {
      await cancelRoutineReminder(reminder.id);
    }
  }, [routines]);

  const deleteReminder = useCallback(async (reminder: RoutineReminder) => {
    const db = await getDatabase();
    await queryDeleteReminder(db, reminder.id);
    await cancelRoutineReminder(reminder.id);
  }, []);

  // ── Activity Logs ───────────────────────────────────────────────────────────

  const getDailyLogs = useCallback(async (
    routineId: string,
    subActivities: SubActivity[],
    date: string
  ) => {
    const db = await getDatabase();
    return queryEnsureLogsForDate(db, routineId, subActivities, date);
  }, []);

  const toggleActivityLog = useCallback(async (logId: string, isChecked: boolean) => {
    const db = await getDatabase();
    await queryToggleActivityLog(db, logId, isChecked);
  }, []);

  return (
    <RoutineContext.Provider
      value={{
        routines, loadRoutines,
        addRoutine, updateRoutine, deleteRoutine,
        getSubActivities, addSubActivity, updateSubActivity, deleteSubActivity,
        getReminders, addReminder, toggleReminderEnabled, deleteReminder,
        getDailyLogs, toggleActivityLog,
        isLoading,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
}

export function useRoutineContext(): RoutineContextValue {
  const ctx = useContext(RoutineContext);
  if (!ctx) throw new Error('useRoutineContext must be used within RoutineProvider');
  return ctx;
}
