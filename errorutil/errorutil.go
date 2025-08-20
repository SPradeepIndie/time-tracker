package errorutil

import (
	"errors"
	"fmt"
)

// Wrap adds context to an error using Go's error wrapping.
func Wrap(err error, msg string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%s: %w", msg, err)
}

// New creates a new error with a message.
func New(msg string) error {
	return errors.New(msg)
}
