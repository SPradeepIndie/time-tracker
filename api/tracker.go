package api

type Tracker struct {
	ID        int    `json:"id"`
	Task      string `json:"task"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}
