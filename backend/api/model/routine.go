package model

import "time"

// ─── Routine ──────────────────────────────────────────────────────────────────

// Routine is a named behavioral checklist (e.g., "Morning Routine").
type Routine struct {
	ID          int       `json:"id" db:"id"`
	UserID      int       `json:"user_id,omitempty" db:"user_id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description,omitempty" db:"description"`
	Color       string    `json:"color" db:"color"`       // Hex color
	Position    int       `json:"position" db:"position"`
	IsActive    bool      `json:"is_active" db:"is_active"` // Soft delete flag
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type CreateRoutineRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=200"`
	Description string `json:"description,omitempty"`
	Color       string `json:"color,omitempty"`
	Position    int    `json:"position,omitempty"`
}

type UpdateRoutineRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=1,max=200"`
	Description *string `json:"description,omitempty"`
	Color       *string `json:"color,omitempty"`
	Position    *int    `json:"position,omitempty"`
}

// ─── Sub-Activity ─────────────────────────────────────────────────────────────

// SubActivity is a single granular step inside a Routine.
type SubActivity struct {
	ID        int       `json:"id" db:"id"`
	RoutineID int       `json:"routine_id" db:"routine_id"`
	Text      string    `json:"text" db:"text"`
	Position  int       `json:"position" db:"position"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateSubActivityRequest struct {
	RoutineID int    `json:"routine_id" validate:"required"`
	Text      string `json:"text" validate:"required,min=1,max=300"`
	Position  int    `json:"position,omitempty"`
}

// ─── Routine Reminder ─────────────────────────────────────────────────────────

// RoutineReminder defines a daily alert time for a specific routine.
// Multiple reminders per routine form the "reminder matrix".
type RoutineReminder struct {
	ID        int       `json:"id" db:"id"`
	RoutineID int       `json:"routine_id" db:"routine_id"`
	Hour      int       `json:"hour" db:"hour"`     // 0-23
	Minute    int       `json:"minute" db:"minute"` // 0-59
	IsEnabled bool      `json:"is_enabled" db:"is_enabled"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateRoutineReminderRequest struct {
	RoutineID int  `json:"routine_id" validate:"required"`
	Hour      int  `json:"hour" validate:"min=0,max=23"`
	Minute    int  `json:"minute" validate:"min=0,max=59"`
	IsEnabled bool `json:"is_enabled"`
}

// ─── Routine Activity Log ─────────────────────────────────────────────────────

// RoutineActivityLog records whether a sub-activity was completed for a given date.
// A new set of log entries is created for each day (daily reset pattern).
type RoutineActivityLog struct {
	ID            int        `json:"id" db:"id"`
	RoutineID     int        `json:"routine_id" db:"routine_id"`
	SubActivityID int        `json:"sub_activity_id" db:"sub_activity_id"`
	Date          string     `json:"date" db:"date"` // YYYY-MM-DD
	IsChecked     bool       `json:"is_checked" db:"is_checked"`
	CheckedAt     *time.Time `json:"checked_at,omitempty" db:"checked_at"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
}
