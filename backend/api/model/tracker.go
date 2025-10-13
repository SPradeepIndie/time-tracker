package model

import (
	"time"
)

type Tracker struct {
	ID        int        `json:"id" db:"id"`
	Task      string     `json:"task" db:"task"`
	StartTime time.Time  `json:"start_time" db:"start_time"`
	EndTime   *time.Time `json:"end_time,omitempty" db:"end_time"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

type CreateTrackerRequest struct {
	Task      string     `json:"task" validate:"required,min=1,max=500"`
	StartTime time.Time  `json:"start_time" validate:"required"`
	EndTime   *time.Time `json:"end_time,omitempty"`
}
type UpdateTrackerRequest struct {
	Task      *string    `json:"task,omitempty" validate:"omitempty,min=1,max=500"`
	StartTime *time.Time `json:"start_time,omitempty"`
	EndTime   *time.Time `json:"end_time,omitempty"`
}
