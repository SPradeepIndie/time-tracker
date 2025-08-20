package db

import (
	"database/sql"
	"fmt"
	"timetracker/errorutil"

	_ "github.com/lib/pq"
)

type postgres struct {
	db    *sql.DB
	param PostgresParam
}

type PostgresParam struct {
	Host     string
	Port     int
	User     string
	Password string
	Dbname   string
}

func Postgres(param PostgresParam) *postgres {
	return &postgres{
		param: param,
	}
}

func (i *postgres) Connect() error {
	if i.db != nil {
		return nil
	}

	connStr := i.createConnStr()
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return errorutil.Wrap(err, "failed to connect to PostgreSQL")
	}

	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)

	if err := db.Ping(); err != nil {
		return errorutil.Wrap(err, "failed to ping PostgreSQL")
	}

	i.db = db
	return nil
}

func (i *postgres) Ping() error {
	if i.db == nil {
		return errorutil.New("database connection is not established")
	}
	return i.db.Ping()
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

func (i *postgres) Close() error {
	if i.db != nil {
		return i.db.Close()
	}
	return nil
}

func (i *postgres) createConnStr() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		i.param.Host, i.param.Port, i.param.User, i.param.Password, i.param.Dbname)
}
