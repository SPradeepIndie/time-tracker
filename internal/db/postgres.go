package db

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

func NewPostgresDB(connStr string) (*sql.DB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	fmt.Println("Connected to PostgreSQL!")
	return db, nil
}

// Migrate creates the tracker table if it does not exist.
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
