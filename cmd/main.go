package main

import (
	"log"
	"timetracker/db"
	"timetracker/internal/config"
)

func main() {
	// Load config using constructor
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	if cfg.GetPostgresDSN() == "" {
		log.Fatal("postgres_dsn is required in config.json")
	}

	postgres := db.Postgres(db.PostgresParam{
		Host:     "",
		Port:     0,
		User:     "",
		Password: "",
		Dbname:   "",
	})

	if err := postgres.Connect(); err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}

	defer func() {
		if err := postgres.Close(); err != nil {
			log.Printf("Error closing DB: %v", err)
		}
	}()

	// // Run DB migration
	// if err := db.Migrate(connection); err != nil {
	// 	log.Fatalf("Failed to migrate database: %v", err)
	// }

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
