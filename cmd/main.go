/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package main

import (
	"fmt"
	"timetracker/db"
	"timetracker/db/model"
	"timetracker/internal/config"
	"timetracker/logger"
)

func main() {
	// Load config using constructor
	cfg, err := config.LoadConfig()

	if err != nil {
		fmt.Printf("Failed to load config: %v", err)
	}

	logger := logger.NewLogger("app", "./run-time.log")

	postgres := db.Postgres(db.PostgresParam{
		Host:     cfg.Host,
		Port:     cfg.Port,
		User:     cfg.User,
		Password: cfg.Password,
		Dbname:   cfg.Dbname,
	})

	if err := postgres.Connect(logger); err != nil {
		logger.Errorf("Failed to connect to DB: %v", err)
	}

	defer func() {
		if err := postgres.Close(); err != nil {
			logger.Errorf("Error closing DB: %v", err)
		}
		logger.Infof("Database connection closed.\n")
	}()

	// Run DB migration
	if err := model.Migrate(postgres.GetDB()); err != nil {
		logger.Errorf("Failed to migrate database: %v", err)
	}

	// mux := http.NewServeMux()
	// // Pass DB to handler via closure
	// mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
	// 	api.HealthCheckHandler(w, r, connection)
	// })

	// port := cfg.Port
	// if port == "" {
	// 	port = "8080"
	// }
	// srv := &http.Server{
	// 	Addr:    ":" + port,
	// 	Handler: mux,
	// }

	// // Graceful shutdown
	// quit := make(chan os.Signal, 1)
	// signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	// go func() {
	// 	<-quit
	// 	log.Println("Shutting down server...")
	// 	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	// 	defer cancel()
	// 	if err := srv.Shutdown(ctx); err != nil {
	// 		log.Fatalf("Server forced to shutdown: %v", err)
	// 	}
	// }()

	// log.Printf("Starting server on :%s...", port)
	// if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
	// 	log.Fatalf("Server failed: %v", err)
	// }
}
