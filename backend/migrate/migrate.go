package migrate

import (
	"database/sql"
	"fmt"
)

// Migrate runs all database migrations in order.
// Each migration is idempotent (CREATE TABLE IF NOT EXISTS).
func Migrate(db *sql.DB) (error, string) {
	migrations := []struct {
		name string
		sql  string
	}{
		{
			name: "v1_tracker",
			sql: `
			CREATE TABLE IF NOT EXISTS tracker (
				id          SERIAL PRIMARY KEY,
				task        TEXT NOT NULL CHECK (length(task) > 0),
				start_time  TIMESTAMP NOT NULL,
				end_time    TIMESTAMP,
				created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);`,
		},
		{
			name: "v2_tracker_extended",
			sql: `
			-- Extend tracker table with full task management fields
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS title       TEXT;
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'created'
			    CHECK (status IN ('created','pending','time-allocated','in-progress','completed'));
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS priority    TEXT NOT NULL DEFAULT 'medium'
			    CHECK (priority IN ('low','medium','high'));
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS task_type   TEXT NOT NULL DEFAULT 'unallocated'
			    CHECK (task_type IN ('unallocated','allocated'));
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS time_input_mode TEXT
			    CHECK (time_input_mode IN ('start-end','start-duration','duration-only'));
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS allocated_start_time TIMESTAMP;
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS allocated_end_time   TIMESTAMP;
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS block_multiplier     INTEGER;
			ALTER TABLE tracker ADD COLUMN IF NOT EXISTS duration_minutes     INTEGER;`,
		},
		{
			name: "v2_tags",
			sql: `
			CREATE TABLE IF NOT EXISTS tags (
				id        SERIAL PRIMARY KEY,
				track_id  INTEGER NOT NULL REFERENCES tracker(id) ON DELETE CASCADE,
				name      TEXT    NOT NULL,
				UNIQUE(track_id, name)
			);`,
		},
		{
			name: "v3_daily_goals",
			sql: `
			-- Daily goals (Plan for Tomorrow pattern, max 10 per day)
			CREATE TABLE IF NOT EXISTS daily_goals (
				id           SERIAL PRIMARY KEY,
				date         DATE NOT NULL,
				text         TEXT NOT NULL CHECK (length(text) > 0),
				is_completed BOOLEAN NOT NULL DEFAULT FALSE,
				position     INTEGER NOT NULL DEFAULT 0,
				created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
			CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date);`,
		},
		{
			name: "v3_weekly_goal_categories",
			sql: `
			-- Weekly goal categories (Uni, Work, Personal + custom)
			CREATE TABLE IF NOT EXISTS weekly_goal_categories (
				id         SERIAL PRIMARY KEY,
				name       TEXT    NOT NULL UNIQUE,
				color      TEXT    NOT NULL DEFAULT '#7C3AED',
				is_default BOOLEAN NOT NULL DEFAULT FALSE,
				position   INTEGER NOT NULL DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- Seed default categories
			INSERT INTO weekly_goal_categories (name, color, is_default, position)
			VALUES
				('Uni',      '#7C3AED', TRUE, 0),
				('Work',     '#06B6D4', TRUE, 1),
				('Personal', '#10B981', TRUE, 2)
			ON CONFLICT (name) DO NOTHING;`,
		},
		{
			name: "v3_weekly_goals",
			sql: `
			-- Weekly goals: 3-tier hierarchy (Goal > Sub-Goal > Sub-Sub-Goal)
			-- Max 5 children per parent enforced at application layer
			CREATE TABLE IF NOT EXISTS weekly_goals (
				id           SERIAL PRIMARY KEY,
				week_label   TEXT    NOT NULL,         -- e.g., "2026-W36"
				category_id  INTEGER NOT NULL REFERENCES weekly_goal_categories(id) ON DELETE CASCADE,
				parent_id    INTEGER REFERENCES weekly_goals(id) ON DELETE CASCADE,
				tier         INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1, 2, 3)),
				text         TEXT    NOT NULL CHECK (length(text) > 0),
				is_completed BOOLEAN NOT NULL DEFAULT FALSE,
				position     INTEGER NOT NULL DEFAULT 0,
				created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
			CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week_label);
			CREATE INDEX IF NOT EXISTS idx_weekly_goals_cat  ON weekly_goals(category_id);`,
		},
		{
			name: "v4_routines",
			sql: `
			-- Routines: named behavioral checklists
			CREATE TABLE IF NOT EXISTS routines (
				id          SERIAL PRIMARY KEY,
				name        TEXT    NOT NULL,
				description TEXT    DEFAULT '',
				color       TEXT    NOT NULL DEFAULT '#7C3AED',
				position    INTEGER NOT NULL DEFAULT 0,
				is_active   BOOLEAN NOT NULL DEFAULT TRUE,
				created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);`,
		},
		{
			name: "v4_routine_sub_activities",
			sql: `
			-- Sub-activities: granular steps inside a routine
			CREATE TABLE IF NOT EXISTS routine_sub_activities (
				id         SERIAL PRIMARY KEY,
				routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
				text       TEXT    NOT NULL CHECK (length(text) > 0),
				position   INTEGER NOT NULL DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);`,
		},
		{
			name: "v4_routine_reminders",
			sql: `
			-- Reminder matrix: multiple configurable alert times per routine
			CREATE TABLE IF NOT EXISTS routine_reminders (
				id         SERIAL PRIMARY KEY,
				routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
				hour       INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
				minute     INTEGER NOT NULL CHECK (minute BETWEEN 0 AND 59),
				is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);`,
		},
		{
			name: "v4_routine_activity_logs",
			sql: `
			-- Daily activity logs: per-day completion record per sub-activity
			CREATE TABLE IF NOT EXISTS routine_activity_logs (
				id              SERIAL PRIMARY KEY,
				routine_id      INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
				sub_activity_id INTEGER NOT NULL REFERENCES routine_sub_activities(id) ON DELETE CASCADE,
				date            DATE    NOT NULL,
				is_checked      BOOLEAN NOT NULL DEFAULT FALSE,
				checked_at      TIMESTAMP,
				created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(sub_activity_id, date)
			);
			CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON routine_activity_logs(date);`,
		},
	}

	for _, m := range migrations {
		if _, err := db.Exec(m.sql); err != nil {
			return fmt.Errorf("migration %s failed: %w", m.name, err), m.sql
		}
	}

	return nil, ""
}
