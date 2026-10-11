package migrate

import (
	"database/sql"
	"fmt"
)

// Migrate runs the initial database schema creation.
// All statements are idempotent (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
func Migrate(db *sql.DB) (error, string) {
	migrations := []struct {
		name string
		sql  string
	}{
		{
			name: "init_schema",
			sql: `
			-- 1. tracker
			CREATE TABLE IF NOT EXISTS tracker (
				id                   SERIAL PRIMARY KEY,
				task                 TEXT NOT NULL CHECK (length(task) > 0),
				title                TEXT,
				description          TEXT DEFAULT '',
				status               TEXT NOT NULL DEFAULT 'created'
				                       CHECK (status IN ('created','pending','time-allocated','in-progress','completed')),
				priority             TEXT NOT NULL DEFAULT 'medium'
				                       CHECK (priority IN ('low','medium','high')),
				task_type            TEXT NOT NULL DEFAULT 'unallocated'
				                       CHECK (task_type IN ('unallocated','allocated')),
				time_input_mode      TEXT CHECK (time_input_mode IN ('start-end','start-duration','duration-only')),
				allocated_start_time TIMESTAMP,
				allocated_end_time   TIMESTAMP,
				block_multiplier     INTEGER,
				duration_minutes     INTEGER,
				position             INTEGER NOT NULL DEFAULT 0,
				start_time           TIMESTAMP NOT NULL,
				end_time             TIMESTAMP,
				created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 2. tags
			CREATE TABLE IF NOT EXISTS tags (
				id        SERIAL PRIMARY KEY,
				track_id  INTEGER NOT NULL REFERENCES tracker(id) ON DELETE CASCADE,
				name      TEXT    NOT NULL,
				UNIQUE(track_id, name)
			);

			-- 3. daily_goals
			CREATE TABLE IF NOT EXISTS daily_goals (
				id           SERIAL PRIMARY KEY,
				date         DATE NOT NULL,
				text         TEXT NOT NULL CHECK (length(text) > 0),
				status       VARCHAR(32) NOT NULL DEFAULT 'pending',
				is_completed BOOLEAN NOT NULL DEFAULT FALSE,
				position     INTEGER NOT NULL DEFAULT 0,
				created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 4. weekly_goal_categories
			CREATE TABLE IF NOT EXISTS weekly_goal_categories (
				id         SERIAL PRIMARY KEY,
				name       TEXT    NOT NULL UNIQUE,
				color      TEXT    NOT NULL DEFAULT '#7C3AED',
				is_default BOOLEAN NOT NULL DEFAULT FALSE,
				position   INTEGER NOT NULL DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			INSERT INTO weekly_goal_categories (name, color, is_default, position)
			VALUES
				('Uni',      '#7C3AED', TRUE, 0),
				('Work',     '#06B6D4', TRUE, 1),
				('Personal', '#10B981', TRUE, 2)
			ON CONFLICT (name) DO NOTHING;

			-- 5. weekly_goals
			CREATE TABLE IF NOT EXISTS weekly_goals (
				id           SERIAL PRIMARY KEY,
				week_label   TEXT    NOT NULL,
				category_id  INTEGER NOT NULL REFERENCES weekly_goal_categories(id) ON DELETE CASCADE,
				parent_id    INTEGER REFERENCES weekly_goals(id) ON DELETE CASCADE,
				tier         INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1, 2, 3)),
				text         TEXT    NOT NULL CHECK (length(text) > 0),
				status       VARCHAR(32) NOT NULL DEFAULT 'pending',
				is_completed BOOLEAN NOT NULL DEFAULT FALSE,
				position     INTEGER NOT NULL DEFAULT 0,
				created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 6. routines
			CREATE TABLE IF NOT EXISTS routines (
				id          SERIAL PRIMARY KEY,
				name        TEXT    NOT NULL,
				description TEXT    DEFAULT '',
				color       TEXT    NOT NULL DEFAULT '#7C3AED',
				position    INTEGER NOT NULL DEFAULT 0,
				is_active   BOOLEAN NOT NULL DEFAULT TRUE,
				created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 7. routine_sub_activities
			CREATE TABLE IF NOT EXISTS routine_sub_activities (
				id         SERIAL PRIMARY KEY,
				routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
				text       TEXT    NOT NULL CHECK (length(text) > 0),
				position   INTEGER NOT NULL DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 8. routine_reminders
			CREATE TABLE IF NOT EXISTS routine_reminders (
				id         SERIAL PRIMARY KEY,
				routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
				hour       INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
				minute     INTEGER NOT NULL CHECK (minute BETWEEN 0 AND 59),
				is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 9. routine_activity_logs
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

			-- 10. checklists
			CREATE TABLE IF NOT EXISTS checklists (
				id         VARCHAR(64) PRIMARY KEY,
				title      TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 11. checklist_items
			CREATE TABLE IF NOT EXISTS checklist_items (
				id           VARCHAR(64) PRIMARY KEY,
				list_id      VARCHAR(64) NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
				text         TEXT NOT NULL,
				is_completed BOOLEAN NOT NULL DEFAULT FALSE,
				position     INTEGER NOT NULL DEFAULT 0,
				created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 12. sticky_notes
			CREATE TABLE IF NOT EXISTS sticky_notes (
				id         VARCHAR(64) PRIMARY KEY,
				content    VARCHAR(255) NOT NULL,
				color      VARCHAR(32) NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- 13. Performance Indexes
			CREATE INDEX IF NOT EXISTS idx_tracker_status_type ON tracker(status, task_type);
			CREATE INDEX IF NOT EXISTS idx_tracker_created_at ON tracker(created_at);
			CREATE INDEX IF NOT EXISTS idx_tags_track_id ON tags(track_id);
			CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date);
			CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week_label);
			CREATE INDEX IF NOT EXISTS idx_weekly_goals_cat ON weekly_goals(category_id);
			CREATE INDEX IF NOT EXISTS idx_weekly_goals_week_cat ON weekly_goals(week_label, category_id);
			CREATE INDEX IF NOT EXISTS idx_routine_subs_routine_id ON routine_sub_activities(routine_id);
			CREATE INDEX IF NOT EXISTS idx_routine_reminders_routine_id ON routine_reminders(routine_id);
			CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_date ON routine_activity_logs(routine_id, date);
			CREATE INDEX IF NOT EXISTS idx_checklist_items_list_id ON checklist_items(list_id);
			CREATE INDEX IF NOT EXISTS idx_sticky_notes_created_at ON sticky_notes(created_at);
			`,
		},
	}

	for _, m := range migrations {
		if _, err := db.Exec(m.sql); err != nil {
			return fmt.Errorf("migration %s failed: %w", m.name, err), m.sql
		}
	}

	return nil, ""
}
