/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package main

import (
	"timetracker/db"
	"timetracker/logger"
	"timetracker/migrate"
)

func main() {
	logger := logger.NewLogger("migrate", "./migrate.log")

	pgDB := db.Init(logger)

	if pgDB == nil {
		logger.Errorf("Database initialization failed. Exiting.")
		return
	}

	defer pgDB.CloseDB()

	logger.Infof("Starting database migration...")

	if err := migrate.Migrate(pgDB.GetDB()); err != nil {
		logger.Errorf("Failed to migrate database: %v", err)
	}

	logger.Infof("Database migration completed successfully.")
}
