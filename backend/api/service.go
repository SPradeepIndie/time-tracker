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
