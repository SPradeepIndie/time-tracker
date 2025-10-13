/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package main

import (
	"net/http"
	"timetracker/api"
	"timetracker/db"
	"timetracker/logger"
)

func main() {
	logger := logger.NewLogger("api", "./api.log")

	pgDB := db.Init(logger)

	repo := api.Repository(pgDB.GetDB(), logger)

	service := api.Service(repo)

	handler := api.Handler(service, logger)

	defer pgDB.CloseDB()

	router := api.Router(logger, handler)

	logger.Infof("Starting server on :8080")

	if err := http.ListenAndServe(":8080", router.SetRoutes()); err != nil {
		logger.Errorf("Could not start server: %s\n", err.Error())
	}
}
