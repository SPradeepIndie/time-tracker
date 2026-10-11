package model

import "time"

// Constraints
const (
	MaxLists        = 5
	MaxItemsPerList = 30
)

// Checklist represents a user-created shopping, exercise, or task list.
type Checklist struct {
	ID        string          `json:"id" db:"id"`
	Title     string          `json:"title" db:"title"`
	Items     []ChecklistItem `json:"items,omitempty" db:"-"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt time.Time       `json:"updated_at" db:"updated_at"`
}

// ChecklistItem represents an individual item within a checklist.
type ChecklistItem struct {
	ID          string    `json:"id" db:"id"`
	ListID      string    `json:"list_id" db:"list_id"`
	Text        string    `json:"text" db:"text"`
	IsCompleted bool      `json:"is_completed" db:"is_completed"`
	Position    int       `json:"position" db:"position"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
