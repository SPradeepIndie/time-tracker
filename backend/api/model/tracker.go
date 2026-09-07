package model

import (
	"time"
)

// ─── Task Status ──────────────────────────────────────────────────────────────

// TaskType distinguishes unallocated tasks from same-day allocated tasks.
type TaskType string

const (
	TaskTypeUnallocated TaskType = "unallocated"
	TaskTypeAllocated   TaskType = "allocated"
)

// TaskStatus represents the state machine position of a task.
// Unallocated track:  created → pending → in-progress → completed
// Allocated track:    created → time-allocated → in-progress → completed
type TaskStatus string

const (
	TaskStatusCreated       TaskStatus = "created"
	TaskStatusPending       TaskStatus = "pending"
	TaskStatusTimeAllocated TaskStatus = "time-allocated"
	TaskStatusInProgress    TaskStatus = "in-progress"
	TaskStatusCompleted     TaskStatus = "completed"
)

// TimeInputMode captures how the time was allocated for a scheduled task.
type TimeInputMode string

const (
	TimeInputModeStartEnd      TimeInputMode = "start-end"
	TimeInputModeStartDuration TimeInputMode = "start-duration"
	TimeInputModeDurationOnly  TimeInputMode = "duration-only"
)

// BlockDurationMinutes is the fixed block size for allocated time tasks.
const BlockDurationMinutes = 45

// ─── Tracker (Task) ───────────────────────────────────────────────────────────

// Tracker is the primary task entity.
type Tracker struct {
	ID          int        `json:"id" db:"id"`
	Title       string     `json:"title" db:"title"`
	Description string     `json:"description" db:"description"`
	Status      TaskStatus `json:"status" db:"status"`
	Priority    string     `json:"priority" db:"priority"`

	// Task scheduling
	TaskType      TaskType       `json:"task_type" db:"task_type"`
	TimeInputMode *TimeInputMode `json:"time_input_mode,omitempty" db:"time_input_mode"`

	// Allocated time fields (only for allocated tasks)
	AllocatedStartTime *time.Time `json:"allocated_start_time,omitempty" db:"allocated_start_time"`
	AllocatedEndTime   *time.Time `json:"allocated_end_time,omitempty" db:"allocated_end_time"`
	BlockMultiplier    *int       `json:"block_multiplier,omitempty" db:"block_multiplier"`
	DurationMinutes    *int       `json:"duration_minutes,omitempty" db:"duration_minutes"`

	// Legacy fields kept for backward compat
	StartTime time.Time  `json:"start_time" db:"start_time"`
	EndTime   *time.Time `json:"end_time,omitempty" db:"end_time"`

	Tags      []string  `json:"tags" db:"-"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateTrackerRequest struct {
	Title       string         `json:"title" validate:"required,min=1,max=500"`
	Description string         `json:"description,omitempty"`
	Priority    string         `json:"priority,omitempty"`
	TaskType    TaskType       `json:"task_type"`
	TimeInputMode *TimeInputMode `json:"time_input_mode,omitempty"`
	AllocatedStartTime *time.Time `json:"allocated_start_time,omitempty"`
	AllocatedEndTime   *time.Time `json:"allocated_end_time,omitempty"`
	BlockMultiplier    *int       `json:"block_multiplier,omitempty"`
	Tags        []string       `json:"tags,omitempty"`

	// Legacy
	StartTime time.Time  `json:"start_time" validate:"required"`
	EndTime   *time.Time `json:"end_time,omitempty"`
}

type UpdateTrackerRequest struct {
	Title       *string        `json:"title,omitempty" validate:"omitempty,min=1,max=500"`
	Description *string        `json:"description,omitempty"`
	Status      *TaskStatus    `json:"status,omitempty"`
	Priority    *string        `json:"priority,omitempty"`
	AllocatedStartTime *time.Time `json:"allocated_start_time,omitempty"`
	AllocatedEndTime   *time.Time `json:"allocated_end_time,omitempty"`
	BlockMultiplier    *int       `json:"block_multiplier,omitempty"`
	StartTime   *time.Time     `json:"start_time,omitempty"`
	EndTime     *time.Time     `json:"end_time,omitempty"`
}
