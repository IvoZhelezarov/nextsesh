import { SQLiteDatabase } from 'expo-sqlite';
import { ExerciseSetTarget, ExerciseTemplate, ExerciseType, WorkoutTemplate } from '@/types';

function rowToTemplate(row: Record<string, unknown>): WorkoutTemplate {
  return {
    id: row.id as number,
    name: row.name as string,
    notes: row.notes as string | undefined,
    color: row.color as string | undefined,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToExercise(row: Record<string, unknown>): ExerciseTemplate {
  return {
    id: row.id as number,
    workoutTemplateId: row.workout_template_id as number,
    name: row.name as string,
    sortOrder: row.sort_order as number,
    exerciseType: row.exercise_type as ExerciseType,
    sets: row.sets as number,
    targetReps: row.target_reps as number | undefined,
    targetDurationSec: row.target_duration_sec as number | undefined,
    currentWeightKg: row.current_weight_kg as number | undefined,
    isBodyweight: (row.is_bodyweight as number) === 1,
    progWeightIncrement: row.prog_weight_increment as number | undefined,
    progRepMin: row.prog_rep_min as number | undefined,
    progRepMax: row.prog_rep_max as number | undefined,
    progDurMin: row.prog_dur_min as number | undefined,
    progDurMax: row.prog_dur_max as number | undefined,
    progRestSec: row.prog_rest_sec as number | undefined,
    progEnabled: (row.prog_enabled as number) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllTemplates(db: SQLiteDatabase): Promise<WorkoutTemplate[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM workout_templates ORDER BY sort_order ASC, id ASC'
  );
  return rows.map(rowToTemplate);
}

export async function getTemplateWithExercises(
  db: SQLiteDatabase,
  id: number
): Promise<WorkoutTemplate | null> {
  const templateRow = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM workout_templates WHERE id = ?',
    [id]
  );
  if (!templateRow) return null;

  const template = rowToTemplate(templateRow);
  const exerciseRows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM exercise_templates WHERE workout_template_id = ? ORDER BY sort_order ASC, id ASC',
    [id]
  );
  const exercises = exerciseRows.map(rowToExercise);

  if (exercises.length > 0) {
    const exIds = exercises.map((e) => e.id);
    const placeholders = exIds.map(() => '?').join(',');
    const targetRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM exercise_set_targets WHERE exercise_template_id IN (${placeholders}) ORDER BY exercise_template_id ASC, set_number ASC`,
      exIds
    );
    const targetsByEx = new Map<number, ExerciseSetTarget[]>();
    for (const row of targetRows) {
      const exId = row.exercise_template_id as number;
      if (!targetsByEx.has(exId)) targetsByEx.set(exId, []);
      targetsByEx.get(exId)!.push({
        setNumber: row.set_number as number,
        targetWeightKg: row.target_weight_kg as number | undefined,
        targetReps: row.target_reps as number | undefined,
        targetDurationSec: row.target_duration_sec as number | undefined,
        isModified: (row.is_modified as number) === 1,
      });
    }
    for (const ex of exercises) {
      ex.setTargets = targetsByEx.get(ex.id) ?? [];
    }
  }

  template.exercises = exercises;
  return template;
}

export async function getSetTargets(
  db: SQLiteDatabase,
  exerciseTemplateId: number
): Promise<ExerciseSetTarget[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM exercise_set_targets WHERE exercise_template_id = ? ORDER BY set_number ASC',
    [exerciseTemplateId]
  );
  return rows.map((row) => ({
    setNumber: row.set_number as number,
    targetWeightKg: row.target_weight_kg as number | undefined,
    targetReps: row.target_reps as number | undefined,
    targetDurationSec: row.target_duration_sec as number | undefined,
    isModified: (row.is_modified as number) === 1,
  }));
}

export async function saveSetTargets(
  db: SQLiteDatabase,
  exerciseTemplateId: number,
  sets: ExerciseSetTarget[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const s of sets) {
      await db.runAsync(
        `INSERT OR REPLACE INTO exercise_set_targets
           (exercise_template_id, set_number, target_weight_kg, target_reps, target_duration_sec, is_modified, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))`,
        [
          exerciseTemplateId,
          s.setNumber,
          s.targetWeightKg ?? null,
          s.targetReps ?? null,
          s.targetDurationSec ?? null,
          s.isModified ? 1 : 0,
        ]
      );
    }
  });
}

export async function clearModifiedFlags(
  db: SQLiteDatabase,
  exerciseTemplateId: number,
  setNumbers: number[]
): Promise<void> {
  if (setNumbers.length === 0) return;
  const placeholders = setNumbers.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE exercise_set_targets SET is_modified = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE exercise_template_id = ? AND set_number IN (${placeholders})`,
    [exerciseTemplateId, ...setNumbers]
  );
}

export async function createTemplate(
  db: SQLiteDatabase,
  name: string,
  notes?: string,
  color?: string
): Promise<number> {
  const maxRow = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM workout_templates'
  );
  const sortOrder = (maxRow?.max_order ?? -1) + 1;
  const result = await db.runAsync(
    'INSERT INTO workout_templates (name, notes, color, sort_order) VALUES (?, ?, ?, ?)',
    [name, notes ?? null, color ?? null, sortOrder]
  );
  return result.lastInsertRowId;
}

export async function updateTemplate(
  db: SQLiteDatabase,
  id: number,
  patch: { name?: string; notes?: string; color?: string | null }
): Promise<void> {
  await db.runAsync(
    `UPDATE workout_templates SET
       name = COALESCE(?, name),
       notes = COALESCE(?, notes),
       color = CASE WHEN ? IS NOT NULL THEN ? ELSE color END,
       updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?`,
    [patch.name ?? null, patch.notes ?? null, patch.color !== undefined ? 1 : null, patch.color ?? null, id]
  );
}

export async function deleteTemplate(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM workout_templates WHERE id = ?', [id]);
}

export async function getExerciseTemplate(
  db: SQLiteDatabase,
  id: number
): Promise<ExerciseTemplate | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM exercise_templates WHERE id = ?',
    [id]
  );
  return row ? rowToExercise(row) : null;
}

export async function createExercise(
  db: SQLiteDatabase,
  workoutTemplateId: number,
  data: Omit<ExerciseTemplate, 'id' | 'workoutTemplateId' | 'createdAt' | 'updatedAt'>
): Promise<number> {
  const maxRow = await db.getFirstAsync<{ max_order: number | null }>(
    'SELECT MAX(sort_order) as max_order FROM exercise_templates WHERE workout_template_id = ?',
    [workoutTemplateId]
  );
  const sortOrder = (maxRow?.max_order ?? -1) + 1;
  const result = await db.runAsync(
    `INSERT INTO exercise_templates
       (workout_template_id, name, sort_order, exercise_type, sets,
        target_reps, target_duration_sec, current_weight_kg, is_bodyweight,
        prog_weight_increment, prog_rep_min, prog_rep_max, prog_dur_min, prog_dur_max, prog_rest_sec, prog_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      workoutTemplateId,
      data.name,
      sortOrder,
      data.exerciseType,
      data.sets,
      data.targetReps ?? null,
      data.targetDurationSec ?? null,
      data.currentWeightKg ?? null,
      data.isBodyweight ? 1 : 0,
      data.progWeightIncrement ?? null,
      data.progRepMin ?? null,
      data.progRepMax ?? null,
      data.progDurMin ?? null,
      data.progDurMax ?? null,
      data.progRestSec ?? null,
      data.progEnabled ? 1 : 0,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateExercise(
  db: SQLiteDatabase,
  id: number,
  patch: Partial<
    Pick<
      ExerciseTemplate,
      | 'name'
      | 'sets'
      | 'targetReps'
      | 'targetDurationSec'
      | 'currentWeightKg'
      | 'progWeightIncrement'
      | 'progRepMin'
      | 'progRepMax'
      | 'progDurMin'
      | 'progDurMax'
      | 'progRestSec'
      | 'progEnabled'
      | 'sortOrder'
    >
  >
): Promise<void> {
  await db.runAsync(
    `UPDATE exercise_templates SET
       name                  = COALESCE(?, name),
       sets                  = COALESCE(?, sets),
       target_reps           = COALESCE(?, target_reps),
       target_duration_sec   = COALESCE(?, target_duration_sec),
       current_weight_kg     = COALESCE(?, current_weight_kg),
       prog_weight_increment = COALESCE(?, prog_weight_increment),
       prog_rep_min          = COALESCE(?, prog_rep_min),
       prog_rep_max          = COALESCE(?, prog_rep_max),
       prog_dur_min          = COALESCE(?, prog_dur_min),
       prog_dur_max          = COALESCE(?, prog_dur_max),
       prog_rest_sec         = COALESCE(?, prog_rest_sec),
       prog_enabled          = COALESCE(?, prog_enabled),
       sort_order            = COALESCE(?, sort_order),
       updated_at            = strftime('%Y-%m-%dT%H:%M:%SZ','now')
     WHERE id = ?`,
    [
      patch.name ?? null,
      patch.sets ?? null,
      patch.targetReps ?? null,
      patch.targetDurationSec ?? null,
      patch.currentWeightKg ?? null,
      patch.progWeightIncrement ?? null,
      patch.progRepMin ?? null,
      patch.progRepMax ?? null,
      patch.progDurMin ?? null,
      patch.progDurMax ?? null,
      patch.progRestSec ?? null,
      patch.progEnabled != null ? (patch.progEnabled ? 1 : 0) : null,
      patch.sortOrder ?? null,
      id,
    ]
  );
}

export async function deleteExercise(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM exercise_templates WHERE id = ?', [id]);
}

export async function reorderExercises(
  db: SQLiteDatabase,
  orderedIds: number[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        `UPDATE exercise_templates SET sort_order = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
        [i, orderedIds[i]]
      );
    }
  });
}

export async function saveLastWeightsForSession(
  db: SQLiteDatabase,
  sessionId: number
): Promise<void> {
  // For each exercise in this session, find the max set_number's actual_weight_kg
  // and persist it as current_weight_kg on the template.
  const rows = await db.getAllAsync<{ exercise_template_id: number; actual_weight_kg: number | null }>(
    `SELECT exercise_template_id, actual_weight_kg
     FROM logged_sets
     WHERE workout_session_id = ?
       AND exercise_template_id IS NOT NULL
       AND set_number = (
         SELECT MAX(s2.set_number) FROM logged_sets s2
         WHERE s2.workout_session_id = logged_sets.workout_session_id
           AND s2.exercise_template_id = logged_sets.exercise_template_id
       )`,
    [sessionId]
  );
  for (const row of rows) {
    if (row.actual_weight_kg != null) {
      await db.runAsync(
        `UPDATE exercise_templates SET current_weight_kg = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
        [row.actual_weight_kg, row.exercise_template_id]
      );
    }
  }
}

export async function resetAllProgression(db: SQLiteDatabase, defaultRepMin: number): Promise<void> {
  await db.runAsync(
    `UPDATE exercise_templates SET target_reps = COALESCE(prog_rep_min, ?), updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
    [defaultRepMin]
  );
  await db.runAsync(
    `UPDATE exercise_set_targets SET target_weight_kg = NULL, target_reps = NULL, target_duration_sec = NULL, is_modified = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`
  );
}
