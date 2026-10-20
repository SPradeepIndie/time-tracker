/**
 * Habit.ts
 *
 * Types for the lightweight weekly habit tracker.
 * Habits are tracked across the current calendar week with daily check/uncheck status.
 */

export interface Habit {
  id: string;
  remoteId?: number;
  name: string;
  color: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  isCompleted: boolean;
  createdAt: Date;
}

export interface HabitWithLogs extends Habit {
  /** Map of date string (YYYY-MM-DD) to completion status */
  completedDates: Record<string, boolean>;
}
