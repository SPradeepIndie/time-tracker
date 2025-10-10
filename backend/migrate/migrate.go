package migrate

import (
	"database/sql"
)

func Migrate(db *sql.DB) error {
	query := `
	   CREATE TABLE IF NOT EXISTS tracker (
		   id SERIAL PRIMARY KEY,
		   task TEXT NOT NULL,
		   start_time TIMESTAMP NOT NULL,
		   end_time TIMESTAMP
	   );`
	_, err := db.Exec(query)
	return err
}
