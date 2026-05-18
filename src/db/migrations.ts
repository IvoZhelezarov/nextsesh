import { SQLiteDatabase } from 'expo-sqlite';

const MIGRATION_001 = `
CREATE TABLE IF NOT EXISTS settings (
  id                       INTEGER PRIMARY KEY DEFAULT 1,
  default_rest_sec         INTEGER NOT NULL DEFAULT 90,
  default_weight_increment REAL    NOT NULL DEFAULT 2.5,
  default_rep_min          INTEGER NOT NULL DEFAULT 8,
  default_rep_max          INTEGER NOT NULL DEFAULT 12,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  notes      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS exercise_templates (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_template_id   INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  name                  TEXT    NOT NULL,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  exercise_type         TEXT    NOT NULL DEFAULT 'weight_reps',
  sets                  INTEGER NOT NULL DEFAULT 3,
  target_reps           INTEGER,
  target_duration_sec   INTEGER,
  current_weight_kg     REAL,
  is_bodyweight         INTEGER NOT NULL DEFAULT 0,
  prog_weight_increment REAL,
  prog_rep_min          INTEGER,
  prog_rep_max          INTEGER,
  prog_rest_sec         INTEGER,
  prog_enabled          INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_template_id INTEGER REFERENCES workout_templates(id) ON DELETE SET NULL,
  template_name       TEXT NOT NULL,
  started_at          TEXT NOT NULL,
  finished_at         TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS logged_sets (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_session_id   INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_template_id INTEGER REFERENCES exercise_templates(id) ON DELETE SET NULL,
  exercise_name        TEXT    NOT NULL,
  exercise_type        TEXT    NOT NULL,
  set_number           INTEGER NOT NULL,
  actual_weight_kg     REAL,
  actual_reps          INTEGER,
  actual_duration_sec  INTEGER,
  is_bodyweight        INTEGER NOT NULL DEFAULT 0,
  target_weight_kg     REAL,
  target_reps          INTEGER,
  target_duration_sec  INTEGER,
  mark_progress        INTEGER NOT NULL DEFAULT 0,
  completed_at         TEXT,
  created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_exercise_templates_workout  ON exercise_templates(workout_template_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_template   ON workout_sessions(workout_template_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started    ON workout_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_logged_sets_session         ON logged_sets(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_logged_sets_exercise        ON logged_sets(exercise_template_id);
`;

const MIGRATION_002 = `
ALTER TABLE exercise_templates ADD COLUMN prog_dur_min INTEGER;
ALTER TABLE exercise_templates ADD COLUMN prog_dur_max INTEGER;
`;

const MIGRATION_003 = `
ALTER TABLE workout_templates ADD COLUMN color TEXT;
ALTER TABLE workout_sessions ADD COLUMN template_color TEXT;
`;

const MIGRATION_004 = `
UPDATE workout_sessions SET template_color = '#22c55e' WHERE template_color IS NULL;
`;

const MIGRATION_005 = `
CREATE TABLE IF NOT EXISTS exercise_set_targets (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_template_id INTEGER NOT NULL REFERENCES exercise_templates(id) ON DELETE CASCADE,
  set_number           INTEGER NOT NULL,
  target_weight_kg     REAL,
  target_reps          INTEGER,
  target_duration_sec  INTEGER,
  is_modified          INTEGER NOT NULL DEFAULT 0,
  updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(exercise_template_id, set_number)
);
CREATE INDEX IF NOT EXISTS idx_set_targets_exercise ON exercise_set_targets(exercise_template_id);
`;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current < 1) {
    await db.execAsync(MIGRATION_001);
    await db.execAsync('PRAGMA user_version = 1');
  }

  if (current < 2) {
    await db.execAsync(MIGRATION_002);
    await db.execAsync('PRAGMA user_version = 2');
  }

  if (current < 3) {
    await db.execAsync(MIGRATION_003);
    await db.execAsync('PRAGMA user_version = 3');
  }

  if (current < 4) {
    await db.execAsync(MIGRATION_004);
    await db.execAsync('PRAGMA user_version = 4');
  }

  if (current < 5) {
    await db.execAsync(MIGRATION_005);
    await db.execAsync('PRAGMA user_version = 5');
  }

  // Seed default settings row if missing
  await db.runAsync(
    `INSERT OR IGNORE INTO settings (id) VALUES (1)`
  );
}
