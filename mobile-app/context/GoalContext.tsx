/**
 * GoalContext.tsx
 *
 * React context providing goal state and operations to the UI.
 * Covers both Daily Goals (for tomorrow) and Weekly Goals (3-tier).
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTrackContext } from './TrackContext'; // For DB access pattern
import { getDatabase } from '../services/storage/db';
import {
  queryGetDailyGoalsByDate,
  queryCreateDailyGoal,
  queryUpdateDailyGoalCompletion,
  queryUpdateDailyGoalText,
  queryDeleteDailyGoal,
  queryGetAllCategories,
  queryCreateCategory,
  queryUpdateCategory,
  queryDeleteCategory,
  queryGetWeeklyGoalsByWeek,
  queryCreateWeeklyGoal,
  queryUpdateWeeklyGoalCompletion,
  queryUpdateWeeklyGoalText,
  queryDeleteWeeklyGoal,
} from '../services/storage/goalQueries';
import {
  DailyGoal,
  WeeklyGoal,
  WeeklyGoalCategory,
  getTomorrowDateString,
  getTodayDateString,
  getWeekLabel,
  DEFAULT_CATEGORIES,
} from '../types/Goal';
import { getAppNextWeekLabel } from '../utils/dateUtils';
import * as Crypto from 'expo-crypto';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface GoalContextValue {
  // Daily Goals
  todayGoals: DailyGoal[];
  tomorrowGoals: DailyGoal[];
  loadDailyGoals: () => Promise<void>;
  addDailyGoal: (text: string, date: string) => Promise<void>;
  toggleDailyGoal: (id: string, isCompleted: boolean) => Promise<void>;
  updateDailyGoalText: (id: string, text: string) => Promise<void>;
  deleteDailyGoal: (id: string) => Promise<void>;
  duplicateDailyGoal: (goal: DailyGoal) => Promise<void>;

  // Weekly Goal Categories
  categories: WeeklyGoalCategory[];
  addCategory: (name: string, color: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Pick<WeeklyGoalCategory, 'name' | 'color'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Weekly Goals
  weeklyGoals: WeeklyGoal[];
  currentWeekLabel: string;
  nextWeekLabel: string;
  selectedWeekLabel: string;
  setSelectedWeekLabel: (label: string) => void;
  loadWeeklyGoals: (targetWeek?: string) => Promise<void>;
  addWeeklyGoal: (categoryId: string, text: string, parentId?: string | null) => Promise<void>;
  toggleWeeklyGoal: (id: string, isCompleted: boolean) => Promise<void>;
  updateWeeklyGoalText: (id: string, text: string) => Promise<void>;
  deleteWeeklyGoal: (id: string) => Promise<void>;
  duplicateWeeklyGoal: (goal: WeeklyGoal) => Promise<void>;

  isLoading: boolean;
}

const GoalContext = createContext<GoalContextValue | null>(null);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [todayGoals, setTodayGoals] = useState<DailyGoal[]>([]);
  const [tomorrowGoals, setTomorrowGoals] = useState<DailyGoal[]>([]);
  const [categories, setCategories] = useState<WeeklyGoalCategory[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentWeekLabel = getWeekLabel(new Date());
  const nextWeekLabel = getAppNextWeekLabel(new Date());
  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string>(currentWeekLabel);

  const loadDailyGoals = useCallback(async () => {
    const db = await getDatabase();
    const today = getTodayDateString();
    const tomorrow = getTomorrowDateString();
    const [tGoals, tmGoals] = await Promise.all([
      queryGetDailyGoalsByDate(db, today),
      queryGetDailyGoalsByDate(db, tomorrow),
    ]);
    setTodayGoals(tGoals);
    setTomorrowGoals(tmGoals);
  }, []);

  const loadWeeklyGoals = useCallback(async (targetWeek?: string) => {
    const db = await getDatabase();
    const week = targetWeek || selectedWeekLabel;
    const [cats, goals] = await Promise.all([
      queryGetAllCategories(db),
      queryGetWeeklyGoalsByWeek(db, week),
    ]);
    setCategories(cats);
    setWeeklyGoals(goals);
  }, [selectedWeekLabel]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadDailyGoals(), loadWeeklyGoals(selectedWeekLabel)]).finally(() => setIsLoading(false));
  }, [loadDailyGoals, loadWeeklyGoals, selectedWeekLabel]);

  // ── Daily Goal Actions ──────────────────────────────────────────────────────

  const addDailyGoal = useCallback(async (text: string, date: string) => {
    const db = await getDatabase();
    const existing = date === getTodayDateString() ? todayGoals : tomorrowGoals;
    const newGoal = await queryCreateDailyGoal(db, {
      id: await Crypto.randomUUID(),
      date,
      text,
      isCompleted: false,
      position: existing.length,
    });
    if (date === getTodayDateString()) {
      setTodayGoals((prev) => [...prev, newGoal]);
    } else {
      setTomorrowGoals((prev) => [...prev, newGoal]);
    }
  }, [todayGoals, tomorrowGoals]);

  const duplicateDailyGoal = useCallback(async (goal: DailyGoal) => {
    await addDailyGoal(goal.text, goal.date);
  }, [addDailyGoal]);

  const toggleDailyGoal = useCallback(async (id: string, isCompleted: boolean) => {
    const db = await getDatabase();
    await queryUpdateDailyGoalCompletion(db, id, isCompleted);
    setTodayGoals((prev) => prev.map((g) => g.id === id ? { ...g, isCompleted } : g));
    setTomorrowGoals((prev) => prev.map((g) => g.id === id ? { ...g, isCompleted } : g));
  }, []);

  const updateDailyGoalText = useCallback(async (id: string, text: string) => {
    const db = await getDatabase();
    await queryUpdateDailyGoalText(db, id, text);
    setTodayGoals((prev) => prev.map((g) => g.id === id ? { ...g, text } : g));
    setTomorrowGoals((prev) => prev.map((g) => g.id === id ? { ...g, text } : g));
  }, []);

  const deleteDailyGoal = useCallback(async (id: string) => {
    const db = await getDatabase();
    await queryDeleteDailyGoal(db, id);
    setTodayGoals((prev) => prev.filter((g) => g.id !== id));
    setTomorrowGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // ── Category Actions ────────────────────────────────────────────────────────

  const addCategory = useCallback(async (name: string, color: string) => {
    const db = await getDatabase();
    const cat = await queryCreateCategory(db, {
      id: await Crypto.randomUUID(),
      name,
      color,
      isDefault: false,
      position: categories.length,
    });
    setCategories((prev) => [...prev, cat]);
  }, [categories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Pick<WeeklyGoalCategory, 'name' | 'color'>>) => {
    const db = await getDatabase();
    await queryUpdateCategory(db, id, updates);
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const db = await getDatabase();
    await queryDeleteCategory(db, id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setWeeklyGoals((prev) => prev.filter((g) => g.categoryId !== id));
  }, []);

  // ── Weekly Goal Actions ─────────────────────────────────────────────────────

  const addWeeklyGoal = useCallback(async (categoryId: string, text: string, parentId?: string | null) => {
    const db = await getDatabase();
    const siblings = weeklyGoals.filter((g) => g.parentId === (parentId ?? null) && g.categoryId === categoryId);
    const parent = parentId ? weeklyGoals.find((g) => g.id === parentId) : null;
    const tier = parent ? Math.min(parent.tier + 1, 3) as 1 | 2 | 3 : 1;
    const newGoal = await queryCreateWeeklyGoal(db, {
      id: await Crypto.randomUUID(),
      weekLabel: selectedWeekLabel,
      categoryId,
      parentId: parentId ?? null,
      tier,
      text,
      isCompleted: false,
      position: siblings.length,
    });
    setWeeklyGoals((prev) => [...prev, newGoal]);
  }, [weeklyGoals, selectedWeekLabel]);

  const duplicateWeeklyGoal = useCallback(async (goal: WeeklyGoal) => {
    await addWeeklyGoal(goal.categoryId, goal.text, goal.parentId);
  }, [addWeeklyGoal]);

  const toggleWeeklyGoal = useCallback(async (id: string, isCompleted: boolean) => {
    const db = await getDatabase();
    await queryUpdateWeeklyGoalCompletion(db, id, isCompleted);
    setWeeklyGoals((prev) => prev.map((g) => g.id === id ? { ...g, isCompleted } : g));
  }, []);

  const updateWeeklyGoalText = useCallback(async (id: string, text: string) => {
    const db = await getDatabase();
    await queryUpdateWeeklyGoalText(db, id, text);
    setWeeklyGoals((prev) => prev.map((g) => g.id === id ? { ...g, text } : g));
  }, []);

  const deleteWeeklyGoal = useCallback(async (id: string) => {
    const db = await getDatabase();
    await queryDeleteWeeklyGoal(db, id);
    // Also remove descendants
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      weeklyGoals.forEach((g) => {
        if (g.parentId && toDelete.has(g.parentId) && !toDelete.has(g.id)) {
          toDelete.add(g.id);
          changed = true;
        }
      });
    }
    setWeeklyGoals((prev) => prev.filter((g) => !toDelete.has(g.id)));
  }, [weeklyGoals]);

  return (
    <GoalContext.Provider
      value={{
        todayGoals, tomorrowGoals, loadDailyGoals,
        addDailyGoal, toggleDailyGoal, updateDailyGoalText, deleteDailyGoal, duplicateDailyGoal,
        categories, addCategory, updateCategory, deleteCategory,
        weeklyGoals, currentWeekLabel, nextWeekLabel, selectedWeekLabel, setSelectedWeekLabel, loadWeeklyGoals,
        addWeeklyGoal, toggleWeeklyGoal, updateWeeklyGoalText, deleteWeeklyGoal, duplicateWeeklyGoal,
        isLoading,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
}

export function useGoalContext(): GoalContextValue {
  const ctx = useContext(GoalContext);
  if (!ctx) throw new Error('useGoalContext must be used within GoalProvider');
  return ctx;
}
