/**
 * Track.ts
 *
 * Core Task/Track data model for the Time Tracker mobile app.
 * Two tracks exist:
 *  - Track 1 (Unallocated): created → pending → in-progress → completed
 *  - Track 2 (Allocated, same-day): created → time-allocated → in-progress → completed
 */

// ─── Task Type ────────────────────────────────────────────────────────────────

export type TaskType = 'unallocated' | 'allocated';

// ─── Status Unions ────────────────────────────────────────────────────────────

/** Valid statuses for Unallocated tasks */
export type UnallocatedStatus = 'created' | 'pending' | 'in-progress' | 'completed';

/** Valid statuses for Allocated tasks */
export type AllocatedStatus = 'created' | 'time-allocated' | 'in-progress' | 'completed';

/** Combined union used for storage */
export type TaskStatus = UnallocatedStatus | AllocatedStatus;

// ─── Time Input Modes (for allocated tasks) ──────────────────────────────────

export type TimeInputMode =
  | 'start-end'      // User sets start + end time explicitly
  | 'start-duration' // User sets start + number of 45min blocks
  | 'duration-only'; // Duration only; start time implicitly = now

// ─── Block size ───────────────────────────────────────────────────────────────

/** One block = 45 minutes. Duration = blockMultiplier × 45 */
export const BLOCK_DURATION_MINUTES = 45;

// ─── Main Track Interface ─────────────────────────────────────────────────────

export interface Track {
  id: string;              // UUID (local primary key)
  remoteId?: number;       // Backend integer ID, set only when synced

  // Core fields
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];

  // Task scheduling type
  taskType: TaskType;

  // Status (depends on taskType)
  status: TaskStatus;

  // Allocated time fields (only meaningful when taskType === 'allocated')
  timeInputMode?: TimeInputMode;
  allocatedStartTime?: Date;   // Validated: >= now at creation time
  allocatedEndTime?: Date;     // Validated: > allocatedStartTime
  blockMultiplier?: number;    // Number of 45-min blocks (1, 2, 3, ...)
  durationMinutes?: number;    // Derived: blockMultiplier * BLOCK_DURATION_MINUTES

  // General timestamps
  startTime: Date;    // Kept for backward compatibility / legacy records
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Predefined Tags ──────────────────────────────────────────────────────────

export const PREDEFINED_TAGS: string[] = [
  'work',
  'personal',
  'urgent',
  'bug',
  'feature',
  'meeting',
  'research',
  'review',
  'blocked',
  'follow-up',
];

// ─── State Machine Helpers ────────────────────────────────────────────────────

/** Returns the valid next statuses for a given track, given its taskType */
export function getValidNextStatuses(track: Track): TaskStatus[] {
  if (track.taskType === 'unallocated') {
    switch (track.status) {
      case 'created':     return ['pending'];
      case 'pending':     return ['in-progress'];
      case 'in-progress': return ['completed'];
      case 'completed':   return [];
      default:            return [];
    }
  } else {
    // allocated track
    switch (track.status) {
      case 'created':        return ['time-allocated'];
      case 'time-allocated': return ['in-progress'];
      case 'in-progress':    return ['completed'];
      case 'completed':      return [];
      default:               return [];
    }
  }
}

/** Labels shown in the status dropdown UI */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  'created':        'Created',
  'pending':        'Pending',
  'time-allocated': 'Time Allocated',
  'in-progress':    'In Progress',
  'completed':      'Completed',
};

// ─── Navigation Param List ────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  PinSetup: undefined;
  MainTabs: undefined;
  TrackDetails: { id: string };
  CreateEdit: { id?: string };
  Info: undefined;
};
