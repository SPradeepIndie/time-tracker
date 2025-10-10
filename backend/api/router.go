/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */

package api

import (
	"net/http"
	"timetracker/logger"
)

type router struct {
	mux     *http.ServeMux
	logger  *logger.Logger
	handler *handler
}

func Router(logger *logger.Logger, handler *handler) *router {
	return &router{
		mux:     http.NewServeMux(),
		logger:  logger,
		handler: handler,
	}
}

func (r *router) SetRoutes() http.Handler {
	r.mux.HandleFunc("GET /trackers", r.handler.GetAllTrackersHandler)
	r.mux.HandleFunc("POST /trackers", r.handler.CreateTrackerHandler)
	r.mux.HandleFunc("PUT /trackers/{id}", r.handler.UpdateTrackerHandler)
	r.mux.HandleFunc("DELETE /trackers/{id}", r.handler.DeleteTrackerHandler)
	r.mux.HandleFunc("GET /trackers/{id}", r.handler.FindTrackerByIDHandler)
	r.mux.HandleFunc("/health", r.healthCheckHandler)
	return r.mux
}

func (r *router) healthCheckHandler(w http.ResponseWriter, req *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
