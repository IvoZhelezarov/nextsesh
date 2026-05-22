import { ExerciseType, LoggedSet } from '@/types';

export function rowToLoggedSet(row: Record<string, unknown>): LoggedSet {
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
    completedAt: row.completed_at as string | undefined,
    createdAt: row.created_at as string,
  };
}
