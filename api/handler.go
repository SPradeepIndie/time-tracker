package api

import (
	"encoding/json"
	"net/http"
)

// Handler returns the main router for the API package.
func Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", RootHandler)
	return mux
}

// RootHandler handles the root route and returns a welcome message.
func RootHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Welcome to the Time Tracker API"})
}

// ...existing code...
