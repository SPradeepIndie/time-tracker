package model

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

func InsertInto(db *sql.DB, t Tracker) error {
	query := `
        INSERT INTO tracker (task, start_time, end_time)
        VALUES ($1, $2, $3)
        RETURNING id;
    `
	err := db.QueryRow(query, t.Task, t.StartTime, t.EndTime).Scan(&t.ID)
	return err
}
