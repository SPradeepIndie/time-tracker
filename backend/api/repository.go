/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package api

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
	"timetracker/api/model"
	"timetracker/errorutil"
	"timetracker/logger"
)

type repository struct {
	db     *sql.DB
	logger *logger.Logger
}

func Repository(db *sql.DB, logger *logger.Logger) *repository {
	return &repository{
		db:     db,
		logger: logger,
	}
}

func (r *repository) GetAllTrackers() ([]model.Tracker, error) {
	query := `
		SELECT id, task, start_time, end_time, created_at, updated_at 
		FROM tracker 
		ORDER BY created_at DESC`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, errorutil.Wrap(err, "Failed to execute query")
	}

	defer rows.Close()

	var trackers []model.Tracker

	for rows.Next() {
		var t model.Tracker
		if err := rows.Scan(&t.ID, &t.Task, &t.StartTime, &t.EndTime, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, errorutil.Wrap(err, "scanning tracker row")
		}
		trackers = append(trackers, t)
	}
	r.logger.Infof("Fetched %d trackers from database", len(trackers))

	return trackers, nil
}

func (r *repository) CreateTracker(req model.CreateTrackerRequest) (*model.Tracker, error) {
	query := `
		INSERT INTO tracker (task, start_time, end_time) 
		VALUES ($1, $2, $3) 
		RETURNING id, task, start_time, end_time, created_at, updated_at`

	var tracker model.Tracker
	err := r.db.QueryRow(query, req.Task, req.StartTime, req.EndTime).Scan(
		&tracker.ID, &tracker.Task, &tracker.StartTime, &tracker.EndTime,
		&tracker.CreatedAt, &tracker.UpdatedAt)

	if err != nil {
		return nil, errorutil.Wrap(err, "Failed to create tracker")
	}

	r.logger.Infof("Created tracker with auto-generated ID: %d", tracker.ID)
	return &tracker, nil
}

func (r *repository) GetTrackerByID(id int) (*model.Tracker, error) {
	query := `
		SELECT id, task, start_time, end_time, created_at, updated_at 
		FROM tracker 
		WHERE id = $1`

	var tracker model.Tracker
	err := r.db.QueryRow(query, id).Scan(
		&tracker.ID, &tracker.Task, &tracker.StartTime, &tracker.EndTime,
		&tracker.CreatedAt, &tracker.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errorutil.New("tracker not found")
	}
	if err != nil {
		return nil, errorutil.Wrap(err, "Failed to get tracker by ID")
	}

	r.logger.Infof("Fetched tracker with ID: %d", tracker.ID)
	return &tracker, nil
}

func (r *repository) UpdateTracker(id int, req model.UpdateTrackerRequest) (*model.Tracker, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Task != nil {
		setParts = append(setParts, fmt.Sprintf("task = $%d", argIndex))
		args = append(args, *req.Task)
		argIndex++
	}
	if req.StartTime != nil {
		setParts = append(setParts, fmt.Sprintf("start_time = $%d", argIndex))
		args = append(args, *req.StartTime)
		argIndex++
	}
	if req.EndTime != nil {
		setParts = append(setParts, fmt.Sprintf("end_time = $%d", argIndex))
		args = append(args, *req.EndTime)
		argIndex++
	}

	if len(setParts) == 0 {
		return nil, errorutil.New("no fields to update")
	}

	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE tracker 
		SET %s 
		WHERE id = $%d 
		RETURNING id, task, start_time, end_time, created_at, updated_at`,
		strings.Join(setParts, ", "), argIndex)

	var tracker model.Tracker
	err := r.db.QueryRow(query, args...).Scan(
		&tracker.ID, &tracker.Task, &tracker.StartTime, &tracker.EndTime,
		&tracker.CreatedAt, &tracker.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errorutil.New("tracker not found")
	}
	if err != nil {
		return nil, errorutil.Wrap(err, "Failed to update tracker")
	}

	r.logger.Infof("Updated tracker with ID: %d", tracker.ID)
	return &tracker, nil
}

// TODO: This has to improve to soft delete.
func (r *repository) DeleteTracker(id int) error {
	query := `DELETE FROM tracker WHERE id = $1`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return errorutil.Wrap(err, "Failed to delete tracker")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errorutil.Wrap(err, "Failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errorutil.New("tracker not found")
	}

	r.logger.Infof("Deleted tracker with ID: %d", id)
	return nil
}
