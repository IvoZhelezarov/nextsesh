import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ActiveExercise } from '@/types';
import { PillStepper, BodyweightWeightPill } from './SetRow';

interface SetModified {
  weight: boolean;
  reps: boolean;
  duration: boolean;
}

interface SetOverride {
  weightKg: number | undefined;
  reps: number | undefined;
  durationSec: number | undefined;
  modified: SetModified;
}

export interface ExerciseOverride {
  exerciseTemplateId: number;
  name: string;
  sets: SetOverride[];
}

interface Props {
  exercises: ActiveExercise[];
  onSave: (overrides: ExerciseOverride[]) => void;
  onSkip: () => void;
}

export function ProgressionModal({ exercises, onSave, onSkip }: Props) {
  const initialValues = exercises.map((ex) =>
    ex.sets.map((s) => ({
      weightKg: s.actualWeightKg ?? s.targetWeightKg,
      reps: s.actualReps ?? s.targetReps,
      durationSec: s.actualDurationSec ?? s.targetDurationSec,
    }))
  );

  const [overrides, setOverrides] = useState<ExerciseOverride[]>(() =>
    exercises.map((ex, exIdx) => ({
      exerciseTemplateId: ex.exerciseTemplate.id,
      name: ex.exerciseTemplate.name,
      sets: ex.sets.map((s, setIdx) => ({
        weightKg: initialValues[exIdx][setIdx].weightKg,
        reps: initialValues[exIdx][setIdx].reps,
        durationSec: initialValues[exIdx][setIdx].durationSec,
        modified: { weight: false, reps: false, duration: false },
      })),
    }))
  );

  const fieldToKey: Record<keyof SetModified, keyof Omit<SetOverride, 'modified'>> = {
    weight: 'weightKg',
    reps: 'reps',
    duration: 'durationSec',
  };

  const updateSet = (
    exIdx: number,
    setIdx: number,
    patch: Partial<Omit<SetOverride, 'modified'>>,
    modifiedField?: keyof SetModified
  ) => {
    setOverrides((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => {
            if (si !== setIdx) return s;
            const updated = { ...s, ...patch };
            const modified = modifiedField
              ? {
                  ...s.modified,
                  [modifiedField]:
                    updated[fieldToKey[modifiedField]] !==
                    initialValues[exIdx][setIdx][fieldToKey[modifiedField]],
                }
              : s.modified;
            return { ...updated, modified };
          }),
        };
      })
    );
  };

  const showWeight = (ex: ActiveExercise) =>
    ex.exerciseTemplate.exerciseType === 'weight_reps' ||
    ex.exerciseTemplate.exerciseType === 'weight_time';
  const showReps = (ex: ActiveExercise) =>
    ex.exerciseTemplate.exerciseType === 'weight_reps' ||
    ex.exerciseTemplate.exerciseType === 'bodyweight_reps';
  const showDuration = (ex: ActiveExercise) =>
    ex.exerciseTemplate.exerciseType === 'weight_time';
  const isBodyweight = (ex: ActiveExercise) =>
    ex.exerciseTemplate.exerciseType === 'bodyweight_reps';

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.overlay]} className="justify-end">
      <View className="bg-bg rounded-t-3xl" style={{ maxHeight: '85%', flex: 1 }}>
        <View className="px-5 pt-5 pb-3">
          <Text className="text-text-primary text-lg font-bold">Next workout targets</Text>
          <Text className="text-text-muted text-xs mt-1">
            Adjust what you want to aim for next time. Changed values are highlighted.
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.map((ex, exIdx) => (
            <View key={ex.exerciseTemplate.id} className="mb-5">
              <Text className="text-text-secondary text-sm font-semibold mb-2">
                {ex.exerciseTemplate.name}
              </Text>

              {overrides[exIdx]?.sets.map((s, setIdx) => (
                <View key={setIdx} className="flex-row items-center gap-2 mb-2">
                  <Text className="text-text-muted text-xs w-5 text-center">{setIdx + 1}</Text>

                  {showWeight(ex) && (
                    <PillStepper
                      value={s.weightKg}
                      placeholder={undefined}
                      step={1.25}
                      decimals={2}
                      unit="kg"
                      editable
                      isWeight
                      highlighted={s.modified.weight}
                      onChange={(v) => updateSet(exIdx, setIdx, { weightKg: v }, 'weight')}
                    />
                  )}

                  {isBodyweight(ex) && (
                    <BodyweightWeightPill
                      value={s.weightKg}
                      editable
                      onChange={(v) => {
                        updateSet(exIdx, setIdx, { weightKg: v }, 'weight');
                      }}
                    />
                  )}

                  {showReps(ex) && (
                    <PillStepper
                      value={s.reps}
                      placeholder={undefined}
                      step={1}
                      decimals={0}
                      unit="reps"
                      editable
                      highlighted={s.modified.reps}
                      onChange={(v) => updateSet(exIdx, setIdx, { reps: v }, 'reps')}
                    />
                  )}

                  {showDuration(ex) && (
                    <PillStepper
                      value={s.durationSec}
                      placeholder={undefined}
                      step={5}
                      decimals={0}
                      unit="sec"
                      editable
                      highlighted={s.modified.duration}
                      onChange={(v) => updateSet(exIdx, setIdx, { durationSec: v }, 'duration')}
                    />
                  )}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <View className="flex-row gap-3 px-5 py-4 border-t border-border">
          <Pressable
            onPress={onSkip}
            className="flex-1 py-3 rounded-xl bg-bg-elevated items-center"
          >
            <Text className="text-text-secondary font-semibold text-sm">Skip</Text>
          </Pressable>
          <Pressable
            onPress={() => onSave(overrides)}
            className="flex-1 py-3 rounded-xl bg-accent items-center"
          >
            <Text className="text-white font-semibold text-sm">Save targets</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
