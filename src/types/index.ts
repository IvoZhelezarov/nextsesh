export type ResourceId = number;

export interface ExerciseSetTarget {
  setNumber: number;
  targetWeightKg?: number;
  targetReps?: number;
  targetDurationSec?: number;
  isModified: boolean;
}

export type ExerciseType = 'weight_reps' | 'weight_time' | 'bodyweight_reps';

export interface Settings {
  id: 1;
  defaultRestSec: number;
  defaultWeightIncrement: number;
  defaultRepMin: number;
  defaultRepMax: number;
}

export interface WorkoutTemplate {
  id: ResourceId;
  name: string;
  notes?: string;
  color?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  exercises?: ExerciseTemplate[];
}

export interface ExerciseTemplate {
  id: ResourceId;
  workoutTemplateId: ResourceId;
  name: string;
  sortOrder: number;
  exerciseType: ExerciseType;
  sets: number;
  targetReps?: number;
  targetDurationSec?: number;
  currentWeightKg?: number;
  isBodyweight: boolean;
  progWeightIncrement?: number;
  progRepMin?: number;
  progRepMax?: number;
  progDurMin?: number;
  progDurMax?: number;
  progRestSec?: number;
  progEnabled: boolean;
  setTargets?: ExerciseSetTarget[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: ResourceId;
  workoutTemplateId?: ResourceId;
  templateName: string;
  templateColor?: string;
  startedAt: string;
  finishedAt?: string;
  notes?: string;
  createdAt: string;
  loggedSets?: LoggedSet[];
}

export interface LoggedSet {
  id: ResourceId;
  workoutSessionId: ResourceId;
  exerciseTemplateId?: ResourceId;
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
  completedAt?: string;
  createdAt: string;
}

export interface ActiveSet {
  localId: string;
  exerciseTemplateId?: ResourceId;
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
  isDone: boolean;
  dbId?: ResourceId;
  isModified?: boolean;
}

export interface ActiveExercise {
  exerciseTemplate: ExerciseTemplate;
  sets: ActiveSet[];
}

export interface ActiveSession {
  sessionId: ResourceId;
  workoutTemplate: WorkoutTemplate;
  exercises: ActiveExercise[];
  startedAt: string;
}
