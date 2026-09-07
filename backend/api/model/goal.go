package model

import "time"

// ─── Daily Goals ─────────────────────────────────────────────────────────────

// DailyGoal represents a single goal entry for a specific date (created at night for the next day).
// Max 10 goals per date.
type DailyGoal struct {
	ID          int       `json:"id" db:"id"`
	UserID      int       `json:"user_id,omitempty" db:"user_id"`
	Date        string    `json:"date" db:"date"`             // YYYY-MM-DD target date
	Text        string    `json:"text" db:"text"`
	IsCompleted bool      `json:"is_completed" db:"is_completed"`
	Position    int       `json:"position" db:"position"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

const MaxDailyGoals = 10

type CreateDailyGoalRequest struct {
	Date     string `json:"date" validate:"required"`
	Text     string `json:"text" validate:"required,min=1,max=500"`
	Position int    `json:"position,omitempty"`
}

type UpdateDailyGoalRequest struct {
	Text        *string `json:"text,omitempty" validate:"omitempty,min=1,max=500"`
	IsCompleted *bool   `json:"is_completed,omitempty"`
	Position    *int    `json:"position,omitempty"`
}

// ─── Weekly Goal Category ─────────────────────────────────────────────────────

// WeeklyGoalCategory is a named bucket for weekly goals.
// Built-in: Uni, Work, Personal. Users can add custom categories.
type WeeklyGoalCategory struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"user_id,omitempty" db:"user_id"`
	Name      string    `json:"name" db:"name"`
	Color     string    `json:"color" db:"color"`         // Hex color
	IsDefault bool      `json:"is_default" db:"is_default"`
	Position  int       `json:"position" db:"position"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateWeeklyGoalCategoryRequest struct {
	Name     string `json:"name" validate:"required,min=1,max=100"`
	Color    string `json:"color,omitempty"`
	Position int    `json:"position,omitempty"`
}

// ─── Weekly Goal (3-tier hierarchy) ──────────────────────────────────────────

// WeeklyGoal represents one goal item in the 3-tier hierarchy.
// Tier 1 = top-level goal (parentID = nil)
// Tier 2 = sub-goal (parentID = tier 1 goal ID)
// Tier 3 = sub-sub-goal (parentID = tier 2 goal ID)
// Each parent can have at most MaxChildrenPerTier children.
type WeeklyGoal struct {
	ID          int       `json:"id" db:"id"`
	UserID      int       `json:"user_id,omitempty" db:"user_id"`
	WeekLabel   string    `json:"week_label" db:"week_label"` // e.g., "2026-W36"
	CategoryID  int       `json:"category_id" db:"category_id"`
	ParentID    *int      `json:"parent_id,omitempty" db:"parent_id"`
	Tier        int       `json:"tier" db:"tier"`             // 1, 2, or 3
	Text        string    `json:"text" db:"text"`
	IsCompleted bool      `json:"is_completed" db:"is_completed"`
	Position    int       `json:"position" db:"position"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

const (
	MaxChildrenPerTier = 5
	MaxTiers           = 3
)

type CreateWeeklyGoalRequest struct {
	WeekLabel  string `json:"week_label" validate:"required"`
	CategoryID int    `json:"category_id" validate:"required"`
	ParentID   *int   `json:"parent_id,omitempty"`
	Text       string `json:"text" validate:"required,min=1,max=500"`
	Position   int    `json:"position,omitempty"`
}

type UpdateWeeklyGoalRequest struct {
	Text        *string `json:"text,omitempty" validate:"omitempty,min=1,max=500"`
	IsCompleted *bool   `json:"is_completed,omitempty"`
	Position    *int    `json:"position,omitempty"`
}
