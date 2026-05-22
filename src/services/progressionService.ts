import { SQLiteDatabase } from 'expo-sqlite';
import { ExerciseType, LoggedSet, Settings } from '@/types';
import { getExerciseTemplate } from './templateService';
import { calculateNextTemplate } from '@/utils/progression';
import { rowToLoggedSet } from './serviceUtils';

async function getLoggedSetsForExerciseInSession(
  db: SQLiteDatabase,
  exerciseTemplateId: number,
  sessionId: number
): Promise<LoggedSet[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM logged_sets WHERE workout_session_id = ? AND exercise_template_id = ? ORDER BY set_number ASC',
    [sessionId, exerciseTemplateId]
  );
  return rows.map(rowToLoggedSet);
}

export async function applyProgression(
  db: SQLiteDatabase,
  exerciseTemplateId: number,
  sessionId: number,
  settings: Settings
): Promise<void> {
  const exercise = await getExerciseTemplate(db, exerciseTemplateId);
  if (!exercise) return;

  const loggedSets = await getLoggedSetsForExerciseInSession(db, exerciseTemplateId, sessionId);
  const updates = calculateNextTemplate(exercise, loggedSets, settings);

  if (Object.keys(updates).length === 0) return;

  await db.runAsync(
    `UPDATE exercise_templates
     SET current_weight_kg   = COALESCE(?, current_weight_kg),
         target_reps         = COALESCE(?, target_reps),
         target_duration_sec = COALESCE(?, target_duration_sec),
         updated_at          = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?`,
    [
      updates.currentWeightKg ?? null,
      updates.targetReps ?? null,
      updates.targetDurationSec ?? null,
      exerciseTemplateId,
    ]
  );

  // Auto-progression updated the base template, so per-set overrides are stale.
  // Clear them so the next session loads fresh targets without yellow highlights.
  await db.runAsync(
    `UPDATE exercise_set_targets
     SET target_weight_kg    = NULL,
         target_reps         = NULL,
         target_duration_sec = NULL,
         is_modified         = 0,
         updated_at          = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE exercise_template_id = ?`,
    [exerciseTemplateId]
  );
}
