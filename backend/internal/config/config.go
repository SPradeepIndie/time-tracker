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
	DBType   string `json:"dbtype"`
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

	v := reflect.ValueOf(c).Elem()
	t := reflect.TypeOf(c)

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)

		fieldName := t.Field(i).Name

		//(e.g., DBType -> DB_TYPE)
		envVarName := strings.ToUpper(strings.Join(splitCamelCase(fieldName), "_"))

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
