package model

import "time"

// Constraints
const (
	MaxStickyNotes    = 10
	MaxNoteCharacters = 255
)

// StickyNote represents a small, colored quick note.
type StickyNote struct {
	ID        string    `json:"id" db:"id"`
	Content   string    `json:"content" db:"content"`
	Color     string    `json:"color" db:"color"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
