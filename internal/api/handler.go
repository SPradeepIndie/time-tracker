package api

import (
	   "database/sql"
	   "encoding/json"
	   "net/http"
)

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
