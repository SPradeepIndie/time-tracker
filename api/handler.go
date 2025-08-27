package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

func Handler() {
	mux := http.NewServeMux()

	mux.HandleFunc("/", handleRoot)

	fmt.Println("Starting server on :8080...")
	http.ListenAndServe(":8080", mux)
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Welcome to the Time Tracker API"})
}

// HealthCheckHandler returns a simple health status and checks DB connectivity.
func HealthCheckHandler(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	w.Header().Set("Content-Type", "application/json")
	if err := db.Ping(); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"status": "db unavailable"})
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
