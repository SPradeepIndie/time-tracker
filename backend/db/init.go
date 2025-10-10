/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */

package db

import (
	"database/sql"
	"timetracker/internal/config"
	"timetracker/logger"
)

type initDB struct {
	db *sql.DB
}

func Init(logger *logger.Logger) *initDB {
	logger.Infof("Loading configuration...")

	cfg, err := config.LoadConfig()

	if err != nil {
		logger.Errorf("Failed to load config: %v", err)
		return nil
	}

	logger.Infof("Configuration loaded successfully.")

	pg := Postgres(PostgresParam{
		Host:     cfg.Host,
		Port:     cfg.Port,
		User:     cfg.User,
		Password: cfg.Password,
		Dbname:   cfg.Dbname,
	})

	if err := pg.Connect(logger); err != nil {
		logger.Errorf("Failed to connect to DB: %v", err)
		return nil
	}

	logger.Infof("Database connection initialized and ready.\n")

	return &initDB{db: pg.GetDB()}
}

func (i *initDB) GetDB() *sql.DB {
	return i.db
}

func (i *initDB) CloseDB() {
	if i.db != nil {
		i.db.Close()
	}
}

func (i *initDB) PingDB() {
	if i.db != nil {
		i.db.Ping()
	}
}
