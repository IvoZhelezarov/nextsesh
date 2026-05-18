import { SQLiteDatabase } from 'expo-sqlite';
import { ExerciseType, LoggedSet, WorkoutSession } from '@/types';
import { applyProgression } from './progressionService';
import { getDB } from '@/db/client';

type SettingsRow = {
  default_rest_sec: number;
  default_weight_increment: number;
  default_rep_min: number;
  default_rep_max: number;
};

async function getSettings(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE id = 1');
  return {
    id: 1 as const,
    defaultRestSec: row?.default_rest_sec ?? 90,
    defaultWeightIncrement: row?.default_weight_increment ?? 2.5,
    defaultRepMin: row?.default_rep_min ?? 8,
    defaultRepMax: row?.default_rep_max ?? 12,
  };
}

function rowToSession(row: Record<string, unknown>): WorkoutSession {
  return {
    id: row.id as number,
    workoutTemplateId: row.workout_template_id as number | undefined,
    templateName: row.template_name as string,
    templateColor: row.template_color as string | undefined,
    startedAt: row.started_at as string,
    finishedAt: row.finished_at as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  };
}

function rowToLoggedSet(row: Record<string, unknown>): LoggedSet {
  return {
    id: row.id as number,
    workoutSessionId: row.workout_session_id as number,
    exerciseTemplateId: row.exercise_template_id as number | undefined,
    exerciseName: row.exercise_name as string,
    exerciseType: row.exercise_type as ExerciseType,
    setNumber: row.set_number as number,
    actualWeightKg: row.actual_weight_kg as number | undefined,
    actualReps: row.actual_reps as number | undefined,
    actualDurationSec: row.actual_duration_sec as number | undefined,
    isBodyweight: (row.is_bodyweight as number) === 1,
    targetWeightKg: row.target_weight_kg as number | undefined,
    targetReps: row.target_reps as number | undefined,
    targetDurationSec: row.target_duration_sec as number | undefined,
    markProgress: (row.mark_progress as number) === 1,
    completedAt: row.completed_at as string | undefined,
    createdAt: row.created_at as string,
  };
}

export async function createSession(
  db: SQLiteDatabase,
  workoutTemplateId: number,
  templateName: string,
  templateColor?: string
): Promise<number> {
  const startedAt = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO workout_sessions (workout_template_id, template_name, template_color, started_at) VALUES (?, ?, ?, ?)',
    [workoutTemplateId, templateName, templateColor ?? '#22c55e', startedAt]
  );
  return result.lastInsertRowId;
}

export async function saveLoggedSet(
  db: SQLiteDatabase,
  data: {
    workoutSessionId: number;
    exerciseTemplateId?: number;
    exerciseName: string;
    exerciseType: ExerciseType;
    setNumber: number;
    actualWeightKg?: number;
    actualReps?: number;
    actualDurationSec?: number;
    isBodyweight: boolean;
    targetWeightKg?: number;
    targetReps?: number;
    targetDurationSec?: number;
    markProgress: boolean;
  }
): Promise<number> {
  const completedAt = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO logged_sets
       (workout_session_id, exercise_template_id, exercise_name, exercise_type, set_number,
        actual_weight_kg, actual_reps, actual_duration_sec, is_bodyweight,
        target_weight_kg, target_reps, target_duration_sec,
        mark_progress, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.workoutSessionId,
      data.exerciseTemplateId ?? null,
      data.exerciseName,
      data.exerciseType,
      data.setNumber,
      data.actualWeightKg ?? null,
      data.actualReps ?? null,
      data.actualDurationSec ?? null,
      data.isBodyweight ? 1 : 0,
      data.targetWeightKg ?? null,
      data.targetReps ?? null,
      data.targetDurationSec ?? null,
      data.markProgress ? 1 : 0,
      completedAt,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateLoggedSet(
  db: SQLiteDatabase,
  id: number,
  patch: {
    actualWeightKg?: number;
    actualReps?: number;
    actualDurationSec?: number;
    markProgress?: boolean;
  }
): Promise<void> {
  await db.runAsync(
    `UPDATE logged_sets SET
       actual_weight_kg    = COALESCE(?, actual_weight_kg),
       actual_reps         = COALESCE(?, actual_reps),
       actual_duration_sec = COALESCE(?, actual_duration_sec),
       mark_progress       = COALESCE(?, mark_progress)
     WHERE id = ?`,
    [
      patch.actualWeightKg ?? null,
      patch.actualReps ?? null,
      patch.actualDurationSec ?? null,
      patch.markProgress != null ? (patch.markProgress ? 1 : 0) : null,
      id,
    ]
  );
}

export async function finishSession(
  db: SQLiteDatabase,
  sessionId: number
): Promise<void> {
  const finishedAt = new Date().toISOString();
  await db.runAsync(
    'UPDATE workout_sessions SET finished_at = ? WHERE id = ?',
    [finishedAt, sessionId]
  );

  const settings = await getSettings(db);

  // Collect unique exercise template IDs from this session
  const rows = await db.getAllAsync<{ exercise_template_id: number }>(
    `SELECT DISTINCT exercise_template_id FROM logged_sets
     WHERE workout_session_id = ? AND exercise_template_id IS NOT NULL`,
    [sessionId]
  );

  for (const row of rows) {
    await applyProgression(db, row.exercise_template_id, sessionId, settings);
  }
}

export async function getRecentSessions(
  db: SQLiteDatabase,
  limit = 20,
  offset = 0
): Promise<WorkoutSession[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM workout_sessions WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows.map(rowToSession);
}

export async function getSessionWithSets(
  db: SQLiteDatabase,
  sessionId: number
): Promise<WorkoutSession | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM workout_sessions WHERE id = ?',
    [sessionId]
  );
  if (!row) return null;

  const session = rowToSession(row);
  const setRows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM logged_sets WHERE workout_session_id = ? ORDER BY exercise_template_id ASC, set_number ASC',
    [sessionId]
  );
  session.loggedSets = setRows.map(rowToLoggedSet);
  return session;
}

export async function getRecentSessionsWithSets(
  db: SQLiteDatabase,
  limit = 20,
  offset = 0
): Promise<WorkoutSession[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM workout_sessions WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  if (rows.length === 0) return [];
  const sessions = rows.map(rowToSession);
  const ids = sessions.map((s) => s.id);
  const placeholders = ids.map(() => '?').join(',');
  const setRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM logged_sets WHERE workout_session_id IN (${placeholders}) ORDER BY workout_session_id ASC, exercise_template_id ASC, set_number ASC`,
    ids
  );
  const setsBySession = new Map<number, LoggedSet[]>();
  for (const row of setRows) {
    const sid = row.workout_session_id as number;
    if (!setsBySession.has(sid)) setsBySession.set(sid, []);
    setsBySession.get(sid)!.push(rowToLoggedSet(row));
  }
  for (const s of sessions) {
    s.loggedSets = setsBySession.get(s.id) ?? [];
  }
  return sessions;
}

export async function getInProgressSession(
  db: SQLiteDatabase
): Promise<WorkoutSession | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM workout_sessions WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1'
  );
  return row ? rowToSession(row) : null;
}

export async function getLoggedSetsForSession(
  db: SQLiteDatabase,
  sessionId: number
): Promise<LoggedSet[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM logged_sets WHERE workout_session_id = ? ORDER BY exercise_template_id ASC, set_number ASC',
    [sessionId]
  );
  return rows.map(rowToLoggedSet);
}

export async function deleteLoggedSet(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM logged_sets WHERE id = ?', [id]);
}

export async function deleteSession(db: SQLiteDatabase, sessionId: number): Promise<void> {
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
}
