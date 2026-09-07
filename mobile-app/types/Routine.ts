/**
 * Routine.ts
 *
 * Type definitions for the Routines module.
 *
 * Structure:
 *  - Routine: Named checklist (e.g., "Morning Routine")
 *  - SubActivity: Individual step inside a routine (with independent checkbox)
 *  - RoutineReminder: Alert matrix — configure multiple reminder times per routine
 *  - RoutineLog: Daily completion record for a routine
 */

// ─── Routine ─────────────────────────────────────────────────────────────────

export interface Routine {
  id: string;              // UUID (local primary key)
  remoteId?: number;
  name: string;            // Descriptive name, e.g., "Morning Routine"
  description?: string;    // Optional note
  color: string;           // Hex color for visual distinction in the list
  position: number;        // Display order
  isActive: boolean;       // Soft delete / archive flag
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-Activity ─────────────────────────────────────────────────────────────

export interface SubActivity {
  id: string;              // UUID (local primary key)
  remoteId?: number;
  routineId: string;       // FK → Routine.id
  text: string;            // Activity description
  position: number;        // Display order within the routine
  createdAt: Date;
  updatedAt: Date;
}

// ─── Routine Reminder ─────────────────────────────────────────────────────────

/**
 * Each reminder defines a daily alert time for a specific routine.
 * Users can configure multiple per routine (the "reminder matrix").
 */
export interface RoutineReminder {
  id: string;              // UUID
  routineId: string;       // FK → Routine.id
  hour: number;            // 0-23
  minute: number;          // 0-59
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Routine Daily Log ────────────────────────────────────────────────────────

/**
 * Records which sub-activities were checked off for a routine on a given date.
 * Reset happens daily — a new set of log entries is created each day.
 */
export interface RoutineActivityLog {
  id: string;
  routineId: string;       // FK → Routine.id
  subActivityId: string;   // FK → SubActivity.id
  date: string;            // YYYY-MM-DD — the day this log belongs to
  isChecked: boolean;
  checkedAt?: Date;        // Timestamp when it was checked off
  createdAt: Date;
}

// ─── Predefined Colors for Routines ──────────────────────────────────────────

export const ROUTINE_COLORS: string[] = [
  '#7C3AED', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
];
