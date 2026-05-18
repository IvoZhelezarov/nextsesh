import { ExerciseTemplate, LoggedSet, Settings } from '@/types';

export interface ProgressionUpdate {
  currentWeightKg?: number;
  targetReps?: number;
  targetDurationSec?: number;
}

export function calculateNextTemplate(
  exercise: ExerciseTemplate,
  loggedSets: LoggedSet[],
  settings: Settings
): ProgressionUpdate {
  if (!exercise.progEnabled) return {};

  const progressedSets = loggedSets.filter((s) => s.markProgress);
  if (progressedSets.length === 0) return {};

  const repMin = exercise.progRepMin ?? settings.defaultRepMin;
  const repMax = exercise.progRepMax ?? settings.defaultRepMax;
  const wtIncr = exercise.progWeightIncrement ?? settings.defaultWeightIncrement;
  const allComplete = progressedSets.length === exercise.sets;

  if (exercise.exerciseType === 'weight_reps' || exercise.exerciseType === 'bodyweight_reps') {
    const curReps = exercise.targetReps ?? repMin;

    if (!allComplete) return {};

    if (curReps >= repMax) {
      const curWt = exercise.currentWeightKg ?? 0;
      return {
        currentWeightKg: exercise.isBodyweight ? undefined : curWt + wtIncr,
        targetReps: repMin,
      };
    }

    return { targetReps: curReps + 1 };
  }

  if (exercise.exerciseType === 'weight_time') {
    if (!allComplete) return {};
    const curDur = exercise.targetDurationSec ?? 30;
    const curWt = exercise.currentWeightKg ?? 0;
    // Increment hold time by 5s until 60s threshold, then bump weight and reset
    const durMax = exercise.progDurMax ?? 60;
    const durMin = exercise.progDurMin ?? 20;
    if (curDur >= durMax) {
      return {
        currentWeightKg: curWt + wtIncr,
        targetDurationSec: durMin,
      };
    }
    return { targetDurationSec: curDur + 5 };
  }

  return {};
}
