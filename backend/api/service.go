/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package api

import (
	"timetracker/api/model"
)

type service struct {
	repo *repository
}

func Service(repo *repository) *service {
	return &service{
		repo: repo,
	}
}

func (s *service) GetAllTrackersService() ([]model.Tracker, error) {
	return s.repo.GetAllTrackers()
}
func (s *service) CreateTrackerService(req model.CreateTrackerRequest) (*model.Tracker, error) {
	return s.repo.CreateTracker(req)
}
func (s *service) UpdateTrackerService(id int, req model.UpdateTrackerRequest) (*model.Tracker, error) {
	return s.repo.UpdateTracker(id, req)
}
func (s *service) DeleteTrackerService(id int) error {
	return s.repo.DeleteTracker(id)
}
func (s *service) GetTrackerByIDService(id int) (*model.Tracker, error) {
	return s.repo.GetTrackerByID(id)
}
