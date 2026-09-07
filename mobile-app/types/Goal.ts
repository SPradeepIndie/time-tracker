/**
 * Goal.ts
 *
 * Type definitions for Daily Goals and Weekly Goals (3-tier hierarchy).
 *
 * Daily Goals:
 *  - Created at night for the next day
 *  - Max 10 per day (5 shown initially, expandable to 10)
 *
 * Weekly Goals:
 *  - Organized by Category (Uni, Work, Personal, + custom)
 *  - 3-tier: Goal ──> Sub-Goal ──> Sub-Sub-Goal
 *  - Each tier capped at 5 child items
 */

// ─── Daily Goals ─────────────────────────────────────────────────────────────

export interface DailyGoal {
  id: string;              // UUID (local primary key)
  remoteId?: number;       // Backend integer ID when synced
  date: string;            // ISO date string (YYYY-MM-DD) — the TARGET day (tomorrow at creation time)
  text: string;            // Goal description
  isCompleted: boolean;
  position: number;        // Display order (1..10)
  createdAt: Date;
  updatedAt: Date;
}

export const MAX_DAILY_GOALS = 10;
export const INITIAL_DAILY_GOAL_FIELDS = 5;

// ─── Weekly Goal Category ─────────────────────────────────────────────────────

export interface WeeklyGoalCategory {
  id: string;              // UUID (local primary key)
  remoteId?: number;
  name: string;            // e.g., "Uni", "Work", "Personal", or custom
  color: string;           // Hex color for visual distinction
  isDefault: boolean;      // True for built-in categories (cannot be deleted)
  position: number;        // Display order
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_CATEGORIES: Omit<WeeklyGoalCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Uni',      color: '#7C3AED', isDefault: true,  position: 0 },
  { name: 'Work',     color: '#06B6D4', isDefault: true,  position: 1 },
  { name: 'Personal', color: '#10B981', isDefault: true,  position: 2 },
];

// ─── Weekly Goal (3-tier hierarchy) ──────────────────────────────────────────

/**
 * A Goal can be at tier 1 (top-level), tier 2 (sub-goal), or tier 3 (sub-sub-goal).
 * parentId is null for top-level goals.
 *
 * Tier 1 goals belong directly to a category.
 * Tier 2 goals are children of Tier 1 goals (parentId = tier1 id).
 * Tier 3 goals are children of Tier 2 goals (parentId = tier2 id).
 *
 * Each parent can have at most MAX_CHILDREN_PER_TIER children.
 */
export interface WeeklyGoal {
  id: string;              // UUID (local primary key)
  remoteId?: number;
  weekLabel: string;       // ISO week label, e.g., "2026-W36"
  categoryId: string;      // FK → WeeklyGoalCategory.id
  parentId: string | null; // null for Tier 1; parent goal ID for Tiers 2 & 3
  tier: 1 | 2 | 3;        // Hierarchy level
  text: string;
  isCompleted: boolean;
  position: number;        // Display order among siblings
  createdAt: Date;
  updatedAt: Date;
}

export const MAX_CHILDREN_PER_TIER = 5;
export const MAX_TIERS = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns ISO week label for a given date, e.g. "2026-W36" */
export function getWeekLabel(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/** Returns "tomorrow" date string (YYYY-MM-DD) for daily goal planning */
export function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/** Returns "today" date string (YYYY-MM-DD) */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
