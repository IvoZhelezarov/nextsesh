import { View, Text } from 'react-native';
import { ActiveExercise, ActiveSet } from '@/types';
import { SetRow } from './SetRow';
import { useSessionStore } from '@/stores/sessionStore';
import { updateLoggedSet } from '@/services/sessionService';
import { getDB } from '@/db/client';

interface Props {
  exercise: ActiveExercise;
}

const TYPE_LABEL: Record<string, string> = {
  weight_reps: 'Weight · Reps',
  weight_time: 'Weight · Hold',
  bodyweight_reps: 'Bodyweight · Reps',
};

export function ExerciseCard({ exercise }: Props) {
  const markSetDone = useSessionStore((s) => s.markSetDone);
  const unmarkSetDone = useSessionStore((s) => s.unmarkSetDone);

  const firstPendingLocalId = exercise.sets.find((s) => !s.isDone)?.localId ?? null;
  const lastDoneLocalId = [...exercise.sets].reverse().find((s) => s.isDone)?.localId ?? null;

  const handleDone = async (set: ActiveSet, data: Parameters<typeof markSetDone>[2]) => {
    await markSetDone(exercise.exerciseTemplate.id, set.localId, data);
  };

  const handleUndo = async (set: ActiveSet) => {
    await unmarkSetDone(exercise.exerciseTemplate.id, set.localId);
  };

  const handleChange = (
    localId: string,
    patch: Partial<Pick<ActiveSet, 'actualWeightKg' | 'actualReps' | 'actualDurationSec'>>
  ) => {
    useSessionStore.setState((state) => {
      if (!state.activeSession) return state;
      const exercises = state.activeSession.exercises.map((ex) => {
        if (ex.exerciseTemplate.id !== exercise.exerciseTemplate.id) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.localId === localId ? { ...s, ...patch } : s)),
        };
      });
      return { activeSession: { ...state.activeSession, exercises } };
    });

    const session = useSessionStore.getState().activeSession;
    const currentEx = session?.exercises.find(
      (ex) => ex.exerciseTemplate.id === exercise.exerciseTemplate.id
    );
    const currentSet = currentEx?.sets.find((s) => s.localId === localId);
    if (currentSet?.isDone === true && currentSet.dbId != null) {
      updateLoggedSet(getDB(), currentSet.dbId, patch).catch(() => {});
    }
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-baseline justify-between mb-3">
        <Text className="text-text-primary text-lg font-semibold flex-1 mr-2">
          {exercise.exerciseTemplate.name}
        </Text>
        <Text className="text-text-muted text-xs">
          {TYPE_LABEL[exercise.exerciseTemplate.exerciseType]}
        </Text>
      </View>

      {exercise.sets.map((set) => (
        <SetRow
          key={set.localId}
          set={set}
          isActive={set.isDone || set.localId === firstPendingLocalId}
          canUndo={set.localId === lastDoneLocalId}
          onDone={(data) => handleDone(set, data)}
          onUndo={() => handleUndo(set)}
          onChange={(patch) => handleChange(set.localId, patch)}
        />
      ))}
    </View>
  );
}
