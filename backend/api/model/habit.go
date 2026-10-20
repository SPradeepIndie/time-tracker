package model

import "time"

// ─── Habit ────────────────────────────────────────────────────────────────────

// Habit represents a lightweight daily behavioral checklist item tracked across weeks.
type Habit struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id,omitempty" db:"user_id"`
	Name      string    `json:"name" db:"name"`
	Color     string    `json:"color" db:"color"`
	Position  int       `json:"position" db:"position"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateHabitRequest struct {
	Name     string `json:"name" validate:"required,min=1,max=200"`
	Color    string `json:"color,omitempty"`
	Position int    `json:"position,omitempty"`
}

type UpdateHabitRequest struct {
	Name     *string `json:"name,omitempty" validate:"omitempty,min=1,max=200"`
	Color    *string `json:"color,omitempty"`
	Position *int    `json:"position,omitempty"`
}

// ─── Habit Log ────────────────────────────────────────────────────────────────

// HabitLog records the daily check/uncheck status for a habit on a specific date (YYYY-MM-DD).
type HabitLog struct {
	ID          int       `json:"id" db:"id"`
	HabitID     int       `json:"habit_id" db:"habit_id"`
	Date        string    `json:"date" db:"date"` // YYYY-MM-DD
	IsCompleted bool      `json:"is_completed" db:"is_completed"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type ToggleHabitLogRequest struct {
	HabitID     int    `json:"habit_id" validate:"required"`
	Date        string `json:"date" validate:"required"`
	IsCompleted bool   `json:"is_completed"`
}
