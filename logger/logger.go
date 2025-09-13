/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package logger

import (
	"fmt"
	"log"
	"os"
)

// Logger holds separate loggers for db, api, and app.
type Logger struct {
	FilePath string
	name     string
}

// NewLogger initializes loggers writing to separate files in the given dir.
func NewLogger(name, filePath string) *Logger {
	return &Logger{
		FilePath: filePath,
		name:     name,
	}
}

func (l *Logger) Infof(format string, v ...any) {
	l.write(format, v...)
}

func (l *Logger) Errorf(format string, v ...any) {
	l.write(format, v...)
}

func (l *Logger) Warnf(format string, v ...any) {
	l.write(format, v...)
}

func (l *Logger) Debugf(format string, v ...any) {
	l.write(format, v...)
}

func (l *Logger) write(format string, v ...any) {
	logFile, err := os.OpenFile(l.FilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		fmt.Printf("Logger error: %v", err)
		return
	}

	defer logFile.Close()

	logger := log.New(logFile, l.name+": ", log.LstdFlags)
	logger.Printf(format, v...)
}
