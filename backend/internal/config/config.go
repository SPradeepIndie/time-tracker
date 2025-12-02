/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package config

import (
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"strconv"
	"strings"
)

//go:embed config.json
var configFS embed.FS

// Config holds application configuration values.
type Config struct {
	Type       string `json:"dbtype"`
	Host       string `json:"host"`
	Port       int    `json:"port"`
	User       string `json:"user"`
	Password   string `json:"password"`
	SchemaName string `json:"schema_name"`
	AppPort    string `json:"app_port"`
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

	// Reflect automatically converts env vars to relevant type of the struct fields
	v := reflect.ValueOf(&c).Elem()
	t := v.Type()

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)

		fieldName := t.Field(i).Name

		//(e.g., Type -> DB_TYPE, User -> DB_USER, with DB_ prefix to avoid system var collisions)
		envVarName := "DB_" + strings.ToUpper(strings.Join(splitCamelCase(fieldName), "_"))

		if envVal := os.Getenv(envVarName); envVal != "" {
			switch field.Kind() {
			case reflect.String:
				field.SetString(envVal)
			case reflect.Int:
				if intVal, err := strconv.Atoi(envVal); err == nil {
					field.SetInt(int64(intVal))
				}
			}
		}
	}
	cfg = &c
	return cfg, nil
}

func splitCamelCase(s string) []string {
	var words []string
	var currentWord strings.Builder

	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			words = append(words, currentWord.String())
			currentWord.Reset()
		}
		currentWord.WriteRune(r)
	}
	words = append(words, currentWord.String())
	return words
}
