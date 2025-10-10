/*
 *  Copyright © 2025 My personal.
 *
 * All rights reserved.
 */
package errorutil

import (
	"errors"
	"fmt"
)

func Wrap(err error, msg string) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%s: %w", msg, err)
}

func New(msg string) error {
	return errors.New(msg)
}
