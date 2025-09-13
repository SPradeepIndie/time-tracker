package db

import (
	"database/sql"
	"fmt"
	"timetracker/errorutil"
	"timetracker/logger"

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

func (i *postgres) Connect(logger *logger.Logger) error {
	if i.db != nil {
		return nil
	}

	logger.Infof("Connecting to postgres at %s:%d...\n", i.param.Host, i.param.Port)

	db, err := sql.Open("postgres", i.createConnStr())

	if err != nil {
		return errorutil.Wrap(err, "failed to connect to postgres")
	}

	i.db = db
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)

	if err := db.Ping(); err != nil {
		return errorutil.Wrap(err, "failed to ping postgres")
	}

	i.db = db

	logger.Infof("Connected to postgres successfully.\n")
	return nil
}

func (i *postgres) GetDB() *sql.DB {
	return i.db
}

func (i *postgres) Ping(logger *logger.Logger) error {
	logger.Infof("Pinging the database...\n")
	if i.db == nil {
		return errorutil.New("database connection is not established")
	}
	return i.db.Ping()
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
