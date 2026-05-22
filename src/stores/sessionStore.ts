import { create } from 'zustand';
import { ActiveExercise, ActiveSession, ActiveSet, LoggedSet, WorkoutTemplate } from '@/types';
import { getDB } from '@/db/client';
import { saveLoggedSet, deleteLoggedSet } from '@/services/sessionService';
import { clearModifiedFlags } from '@/services/templateService';

interface SessionState {
  activeSession: ActiveSession | null;
  initSession: (sessionId: number, template: WorkoutTemplate) => void;
  resumeSession: (
    sessionId: number,
    template: WorkoutTemplate,
    loggedSets: LoggedSet[],
    startedAt?: string
  ) => void;
  markSetDone: (
    exerciseTemplateId: number,
    localId: string,
    data: {
      actualWeightKg?: number;
      actualReps?: number;
      actualDurationSec?: number;
      markProgress: boolean;
    }
  ) => Promise<number | null>;
  unmarkSetDone: (exerciseTemplateId: number, localId: string) => Promise<void>;
  clearSession: () => void;
}

function buildActiveSets(exercise: ActiveExercise['exerciseTemplate']): ActiveSet[] {
  return Array.from({ length: exercise.sets }, (_, i) => {
    const setNum = i + 1;
    const perSet = exercise.setTargets?.find((t) => t.setNumber === setNum);
    const targetWeightKg = perSet?.targetWeightKg ?? exercise.currentWeightKg;
    const targetReps = perSet?.targetReps ?? exercise.targetReps;
    const targetDurationSec = perSet?.targetDurationSec ?? exercise.targetDurationSec;
    return {
      localId: `${exercise.id}-${setNum}-${Date.now()}`,
      exerciseTemplateId: exercise.id,
      exerciseName: exercise.name,
      exerciseType: exercise.exerciseType,
      setNumber: setNum,
      actualWeightKg: targetWeightKg,
      actualReps: targetReps,
      actualDurationSec: targetDurationSec,
      isBodyweight: exercise.isBodyweight,
      targetWeightKg,
      targetReps,
      targetDurationSec,
      markProgress: false,
      isDone: false,
      isModified: perSet?.isModified ?? false,
    };
  });
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,

  initSession: (sessionId, template) => {
    const exercises: ActiveExercise[] = (template.exercises ?? []).map((et) => ({
      exerciseTemplate: et,
      sets: buildActiveSets(et),
    }));

    set({
      activeSession: {
        sessionId,
        workoutTemplate: template,
        exercises,
        startedAt: new Date().toISOString(),
      },
    });
  },

  resumeSession: (sessionId, template, loggedSets, startedAt) => {
    const exercises: ActiveExercise[] = (template.exercises ?? []).map((et) => ({
      exerciseTemplate: et,
      sets: buildActiveSets(et),
    }));

    for (const ls of loggedSets) {
      const exIdx = exercises.findIndex(
        (e) => e.exerciseTemplate.id === ls.exerciseTemplateId
      );
      if (exIdx === -1) continue;
      const setIdx = exercises[exIdx].sets.findIndex((s) => s.setNumber === ls.setNumber);
      if (setIdx === -1) continue;
      exercises[exIdx].sets[setIdx] = {
        ...exercises[exIdx].sets[setIdx],
        isDone: true,
        dbId: ls.id,
        actualWeightKg: ls.actualWeightKg,
        actualReps: ls.actualReps,
        actualDurationSec: ls.actualDurationSec,
        markProgress: ls.markProgress,
      };
    }

    set({
      activeSession: {
        sessionId,
        workoutTemplate: template,
        exercises,
        startedAt: startedAt ?? new Date().toISOString(),
      },
    });
  },

  markSetDone: async (exerciseTemplateId, localId, data) => {
    const session = get().activeSession;
    if (!session) return null;

    const db = getDB();
    const exIdx = session.exercises.findIndex(
      (e) => e.exerciseTemplate.id === exerciseTemplateId
    );
    if (exIdx === -1) return null;

    const setIdx = session.exercises[exIdx].sets.findIndex((s) => s.localId === localId);
    if (setIdx === -1) return null;

    const currentSet = session.exercises[exIdx].sets[setIdx];

    // Eager DB write
    const dbId = await saveLoggedSet(db, {
      workoutSessionId: session.sessionId,
      exerciseTemplateId,
      exerciseName: currentSet.exerciseName,
      exerciseType: currentSet.exerciseType,
      setNumber: currentSet.setNumber,
      actualWeightKg: data.actualWeightKg,
      actualReps: data.actualReps,
      actualDurationSec: data.actualDurationSec,
      isBodyweight: currentSet.isBodyweight,
      targetWeightKg: currentSet.targetWeightKg,
      targetReps: currentSet.targetReps,
      targetDurationSec: currentSet.targetDurationSec,
      markProgress: data.markProgress,
    });

    // Clear the modified flag for this set now that the user has acknowledged it by completing it
    if (currentSet.isModified && exerciseTemplateId != null) {
      await clearModifiedFlags(db, exerciseTemplateId, [currentSet.setNumber]);
    }

    // Update in-memory state
    set((state) => {
      if (!state.activeSession) return state;
      const exercises = state.activeSession.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => {
            if (si !== setIdx) return s;
            return {
              ...s,
              ...data,
              isDone: true,
              dbId,
              isModified: false,
            };
          }),
        };
      });
      return { activeSession: { ...state.activeSession, exercises } };
    });

    return dbId;
  },

  unmarkSetDone: async (exerciseTemplateId, localId) => {
    const session = get().activeSession;
    if (!session) return;

    const exIdx = session.exercises.findIndex(
      (e) => e.exerciseTemplate.id === exerciseTemplateId
    );
    if (exIdx === -1) return;
    const setIdx = session.exercises[exIdx].sets.findIndex((s) => s.localId === localId);
    if (setIdx === -1) return;

    const currentSet = session.exercises[exIdx].sets[setIdx];
    if (currentSet.dbId != null) {
      await deleteLoggedSet(getDB(), currentSet.dbId);
    }

    set((state) => {
      if (!state.activeSession) return state;
      const exercises = state.activeSession.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => {
            if (si !== setIdx) return s;
            return { ...s, isDone: false, dbId: undefined };
          }),
        };
      });
      return { activeSession: { ...state.activeSession, exercises } };
    });
  },

  clearSession: () => {
    set({ activeSession: null });
  },
}));
