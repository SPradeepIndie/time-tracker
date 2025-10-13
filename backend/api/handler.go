/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */

package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"timetracker/api/model"
	"timetracker/logger"
)

type handler struct {
	service *service
	logger  *logger.Logger
}

type ErrorResponse struct {
	Error     string `json:"error"`
	Message   string `json:"message,omitempty"`
	Code      string `json:"code,omitempty"`
	Timestamp string `json:"timestamp"`
}

func Handler(s *service, l *logger.Logger) *handler {
	return &handler{
		service: s,
		logger:  l,
	}
}

func (h *handler) sendErrorResponse(w http.ResponseWriter, statusCode int, errorMsg, userMsg, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := ErrorResponse{
		Error:     errorMsg,
		Message:   userMsg,
		Code:      code,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	if statusCode >= 500 {
		h.logger.Errorf("[%s] %s - %s", code, errorMsg, userMsg)
	} else if statusCode >= 400 {
		h.logger.Warnf("[%s] %s - %s", code, errorMsg, userMsg)
	} else {
		h.logger.Infof("[%s] %s - %s", code, errorMsg, userMsg)
	}

	json.NewEncoder(w).Encode(response)
}

func (h *handler) validateCreateTrackerRequest(req *model.CreateTrackerRequest) []string {
	var errors []string

	if req.Task == "" {
		errors = append(errors, "task is required and cannot be empty")
	} else if len(strings.TrimSpace(req.Task)) == 0 {
		errors = append(errors, "task cannot contain only whitespace")
	} else if len(req.Task) > 500 {
		errors = append(errors, "task cannot exceed 500 characters")
	}

	if req.StartTime.IsZero() {
		errors = append(errors, "start_time is required")
	}

	if req.EndTime != nil && !req.EndTime.IsZero() && req.EndTime.Before(req.StartTime) {
		errors = append(errors, "end_time must be after start_time")
	}

	return errors
}

func (h *handler) validateUpdateTrackerRequest(req *model.UpdateTrackerRequest) []string {
	var errors []string

	if req.Task == nil && req.StartTime == nil && req.EndTime == nil {
		errors = append(errors, "at least one field (task, start_time, or end_time) must be provided for update")
		return errors
	}

	if req.Task != nil {
		if *req.Task == "" {
			errors = append(errors, "task cannot be empty")
		} else if len(strings.TrimSpace(*req.Task)) == 0 {
			errors = append(errors, "task cannot contain only whitespace")
		} else if len(*req.Task) > 500 {
			errors = append(errors, "task cannot exceed 500 characters")
		}
	}

	if req.StartTime != nil && req.EndTime != nil &&
		!req.StartTime.IsZero() && !req.EndTime.IsZero() &&
		req.EndTime.Before(*req.StartTime) {
		errors = append(errors, "end_time must be after start_time")
	}

	return errors
}

func (h *handler) extractIDFromPath(req *http.Request) (int, error) {
	idStr := req.PathValue("id")
	if idStr == "" {
		return 0, fmt.Errorf("id parameter is required")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, fmt.Errorf("id must be a valid integer")
	}

	if id <= 0 {
		return 0, fmt.Errorf("id must be a positive integer")
	}

	return id, nil
}

// GetAllTrackersHandler retrieves all time tracking entries from the database.
// It returns a JSON array of tracker objects ordered by creation date (newest first).
// Each tracker contains: id, task, start_time, end_time, created_at, updated_at.
// No request parameters are required.
//
// Returns:
//   - 200 OK: Successfully retrieved trackers with array of tracker data (may be empty)
//   - 500 Internal Server Error: Database or server errors
func (h *handler) GetAllTrackersHandler(w http.ResponseWriter, r *http.Request) {
	h.logger.Infof("GetAllTrackersHandler: Processing request from %s", r.RemoteAddr)

	trackers, err := h.service.GetAllTrackersService()
	if err != nil {
		h.logger.Errorf("GetAllTrackersHandler: Service error - %v", err)
		h.sendErrorResponse(w, http.StatusInternalServerError,
			"Failed to fetch trackers",
			"An error occurred while retrieving trackers from database",
			"FETCH_ERROR")
		return
	}

	h.logger.Infof("GetAllTrackersHandler: Successfully retrieved %d trackers", len(trackers))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(trackers)
}

// CreateTrackerHandler creates a new time tracking entry in the database.
// It expects a JSON payload containing:
//   - task: string (required, 1-500 characters, cannot be empty/whitespace only)
//   - start_time: timestamp (required, cannot be zero time)
//   - end_time: timestamp (optional, must be after start_time if provided)
//
// Returns:
//   - 201 Created: Successfully created tracker with tracker data
//   - 400 Bad Request: Invalid JSON payload or validation errors
//   - 500 Internal Server Error: Database or server errors
func (h *handler) CreateTrackerHandler(w http.ResponseWriter, req *http.Request) {
	h.logger.Infof("CreateTrackerHandler: Processing request from %s", req.RemoteAddr)

	var request model.CreateTrackerRequest

	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		h.logger.Warnf("CreateTrackerHandler: Failed to decode JSON - %v", err)
		h.sendErrorResponse(w, http.StatusBadRequest,
			"Invalid JSON payload",
			"Request body must be valid JSON matching CreateTrackerRequest schema",
			"INVALID_JSON")
		return
	}

	if validationErrors := h.validateCreateTrackerRequest(&request); len(validationErrors) > 0 {
		h.logger.Warnf("CreateTrackerHandler: Validation failed - %s", strings.Join(validationErrors, "; "))
		h.sendErrorResponse(w, http.StatusBadRequest,
			"Validation failed",
			strings.Join(validationErrors, "; "),
			"VALIDATION_ERROR")
		return
	}

	h.logger.Debugf("CreateTrackerHandler: Creating tracker with task: %s", request.Task)
	tracker, err := h.service.CreateTrackerService(request)
	if err != nil {
		h.logger.Errorf("CreateTrackerHandler: Service error - %v", err)
		h.sendErrorResponse(w, http.StatusInternalServerError,
			"Failed to create tracker",
			"An error occurred while saving the tracker to database",
			"CREATE_ERROR")
		return
	}

	h.logger.Infof("CreateTrackerHandler: Successfully created tracker with ID: %d", tracker.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(tracker)
}

// UpdateTrackerHandler updates an existing time tracking entry by ID.
// It extracts the tracker ID from the URL path parameter and expects a JSON payload with fields to update.
// At least one field must be provided. All fields are optional in the request:
//   - task: string (optional, 1-500 characters if provided, cannot be empty/whitespace only)
//   - start_time: timestamp (optional, cannot be zero time if provided)
//   - end_time: timestamp (optional, must be after start_time if both times are provided)
//
// Returns:
//   - 200 OK: Successfully updated tracker with updated tracker data
//   - 400 Bad Request: Invalid ID parameter, JSON payload, or validation errors
//   - 404 Not Found: Tracker with specified ID does not exist
//   - 500 Internal Server Error: Database or server errors
func (h *handler) UpdateTrackerHandler(w http.ResponseWriter, req *http.Request) {
	h.logger.Infof("UpdateTrackerHandler: Processing request from %s", req.RemoteAddr)

	id, err := h.extractIDFromPath(req)
	if err != nil {
		h.logger.Warnf("UpdateTrackerHandler: Invalid ID parameter - %v", err)
		h.sendErrorResponse(w, http.StatusBadRequest,
			"Invalid ID parameter",
			err.Error(),
			"INVALID_ID")
		return
	}

	var request model.UpdateTrackerRequest
	if err := json.NewDecoder(req.Body).Decode(&request); err != nil {
		h.logger.Warnf("UpdateTrackerHandler: Failed to decode JSON - %v", err)
		h.sendErrorResponse(w, http.StatusBadRequest,
			"Invalid JSON payload",
			"Request body must be valid JSON matching UpdateTrackerRequest schema",
			"INVALID_JSON")
		return
	}

	if validationErrors := h.validateUpdateTrackerRequest(&request); len(validationErrors) > 0 {
		h.logger.Warnf("UpdateTrackerHandler: Validation failed - %s", strings.Join(validationErrors, "; "))
		h.sendErrorResponse(w, http.StatusBadRequest,
			"Validation failed",
			strings.Join(validationErrors, "; "),
			"VALIDATION_ERROR")
		return
	}

	h.logger.Debugf("UpdateTrackerHandler: Updating tracker ID: %d", id)
	tracker, err := h.service.UpdateTrackerService(id, request)
	if err != nil {
		h.logger.Errorf("UpdateTrackerHandler: Service error for ID %d - %v", id, err)
		if strings.Contains(err.Error(), "not found") {
			h.sendErrorResponse(w, http.StatusNotFound,
				"Tracker not found",
				fmt.Sprintf("No tracker exists with ID %d", id),
				"NOT_FOUND")
			return
		}

		h.sendErrorResponse(w, http.StatusInternalServerError,
			"Failed to update tracker",
			"An error occurred while updating the tracker in database",
			"UPDATE_ERROR")
		return
	}

	h.logger.Infof("UpdateTrackerHandler: Successfully updated tracker ID: %d", tracker.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(tracker)
}

// DeleteTrackerHandler removes a time tracking entry from the database by ID.
// It extracts the tracker ID from the URL path parameter and permanently deletes the record.
// This operation cannot be undone.
//
// Returns:
//   - 204 No Content: Successfully deleted tracker (no response body)
//   - 400 Bad Request: Invalid ID parameter
//   - 404 Not Found: Tracker with specified ID does not exist
//   - 500 Internal Server Error: Database or server errors
func (h *handler) DeleteTrackerHandler(w http.ResponseWriter, req *http.Request) {
	h.logger.Infof("DeleteTrackerHandler: Processing request from %s", req.RemoteAddr)

	id, err := h.extractIDFromPath(req)
	if err != nil {
		h.logger.Warnf("DeleteTrackerHandler: Invalid ID parameter - %v", err)
		h.sendErrorResponse(w, http.StatusBadRequest,
			"Invalid ID parameter",
			err.Error(),
			"INVALID_ID")
		return
	}

	h.logger.Debugf("DeleteTrackerHandler: Deleting tracker ID: %d", id)
	err = h.service.DeleteTrackerService(id)
	if err != nil {
		h.logger.Errorf("DeleteTrackerHandler: Service error for ID %d - %v", id, err)
		if strings.Contains(err.Error(), "not found") {
			h.sendErrorResponse(w, http.StatusNotFound,
				"Tracker not found",
				fmt.Sprintf("No tracker exists with ID %d", id),
				"NOT_FOUND")
			return
		}

		h.sendErrorResponse(w, http.StatusInternalServerError,
			"Failed to delete tracker",
			"An error occurred while deleting the tracker from database",
			"DELETE_ERROR")
		return
	}

	h.logger.Infof("DeleteTrackerHandler: Successfully deleted tracker ID: %d", id)
	w.WriteHeader(http.StatusNoContent)
}

// FindTrackerByIDHandler retrieves a specific time tracking entry by its ID.
// It extracts the tracker ID from the URL path parameter and returns the matching record as JSON.
// The response includes all tracker fields: id, task, start_time, end_time, created_at, updated_at.
//
// Returns:
//   - 200 OK: Successfully retrieved tracker with tracker data
//   - 400 Bad Request: Invalid ID parameter
//   - 404 Not Found: Tracker with specified ID does not exist
//   - 500 Internal Server Error: Database or server errors
func (h *handler) FindTrackerByIDHandler(w http.ResponseWriter, req *http.Request) {
	h.logger.Infof("FindTrackerByIDHandler: Processing request from %s", req.RemoteAddr)

	id, err := h.extractIDFromPath(req)
	if err != nil {
		h.logger.Warnf("FindTrackerByIDHandler: Invalid ID parameter - %v", err)
		h.sendErrorResponse(w, http.StatusBadRequest,
			"Invalid ID parameter",
			err.Error(),
			"INVALID_ID")
		return
	}

	h.logger.Debugf("FindTrackerByIDHandler: Fetching tracker ID: %d", id)
	tracker, err := h.service.GetTrackerByIDService(id)
	if err != nil {
		h.logger.Errorf("FindTrackerByIDHandler: Service error for ID %d - %v", id, err)
		if strings.Contains(err.Error(), "not found") {
			h.sendErrorResponse(w, http.StatusNotFound,
				"Tracker not found",
				fmt.Sprintf("No tracker exists with ID %d", id),
				"NOT_FOUND")
			return
		}

		h.sendErrorResponse(w, http.StatusInternalServerError,
			"Failed to fetch tracker",
			"An error occurred while retrieving the tracker from database",
			"FETCH_ERROR")
		return
	}

	h.logger.Infof("FindTrackerByIDHandler: Successfully retrieved tracker ID: %d", tracker.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(tracker)
}
