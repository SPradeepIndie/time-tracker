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
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Dbname   string `json:"dbname"`
	AppPort  string `json:"app_port"`
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

// GetPostgresDSN builds and returns the Postgres DSN from config fields.
func (c *Config) GetPostgresDSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable", c.User, c.Password, c.Host, c.Port, c.Dbname)
}

// GetPort returns the server port from config.
func (c *Config) GetPort() string {
	return c.AppPort
}
