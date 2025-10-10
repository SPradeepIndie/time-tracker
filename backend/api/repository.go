/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package api

import (
	"database/sql"
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

	rows, err := r.db.Query("SELECT * FROM tracker")

	if err != nil {
		return nil, errorutil.Wrap(err, "Failed to execute query")
	}

	defer rows.Close()

	var trackers []model.Tracker

	for rows.Next() {
		var t model.Tracker
		if err := rows.Scan(&t.ID, &t.Task, &t.StartTime, &t.EndTime); err != nil {
			return nil, errorutil.Wrap(err, "scanning tracker row")
		}
		trackers = append(trackers, t)
	}

	return trackers, nil
}
