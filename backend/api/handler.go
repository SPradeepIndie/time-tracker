/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */

package api

import (
	"encoding/json"
	"net/http"
)

type handler struct {
	service *service
}

func Handler(s *service) *handler {
	return &handler{
		service: s,
	}
}

func (h *handler) GetAllTrackersHandler(w http.ResponseWriter, r *http.Request) {
	trackers, err := h.service.GetAllTrackersService()
	if err != nil {
		http.Error(w, "Failed to fetch trackers", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trackers)
}

func (h *handler) CreateTrackerHandler(w http.ResponseWriter, req *http.Request) {
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode("Not Implemented Yet")
}

func (h *handler) UpdateTrackerHandler(w http.ResponseWriter, req *http.Request) {
	id := req.Context().Value("id").(string)
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode("Not Implemented Yet: " + id)
}

func (h *handler) DeleteTrackerHandler(w http.ResponseWriter, req *http.Request) {
	id := req.Context().Value("id").(string)
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode("Not Implemented Yet: " + id)
}

func (h *handler) FindTrackerByIDHandler(w http.ResponseWriter, req *http.Request) {
	id := req.Context().Value("id").(string)
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode("Not Implemented Yet: " + id)
}
