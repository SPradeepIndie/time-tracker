package migrate

import (
	"database/sql"
	"fmt"
)

func Migrate(db *sql.DB) (error, string) {
	query := `
	CREATE TABLE IF NOT EXISTS tracker (
		id SERIAL PRIMARY KEY,                   
		task TEXT NOT NULL CHECK (length(task) > 0), 
		start_time TIMESTAMP NOT NULL,
		end_time TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("failed to create tracker table: %w", err), query
	}

	return nil, query
}
