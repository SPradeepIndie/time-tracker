package config

import (
	"embed"
	"encoding/json"
	"fmt"
)

//go:embed config.json
var configFS embed.FS

// Config holds application configuration values.
type Config struct {
	PostgresDSN string `json:"postgres_dsn"`
	Port        string `json:"port"`
}

var cfg *Config

// LoadConfig parses the embedded config.json and returns a Config instance.
func LoadConfig() (*Config, error) {
	if cfg != nil {
		return cfg, nil
	}
	var c Config
	data, err := configFS.ReadFile("config.json")
	if err != nil {
		return nil, fmt.Errorf("failed to read config.json: %w", err)
	}
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}
	cfg = &c
	return cfg, nil
}

// GetPostgresDSN returns the Postgres DSN from config.
func (c *Config) GetPostgresDSN() string {
	return c.PostgresDSN
}

// GetPort returns the server port from config.
func (c *Config) GetPort() string {
	return c.Port
}
