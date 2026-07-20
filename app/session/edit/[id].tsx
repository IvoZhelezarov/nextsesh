import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Trash2 } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { LoggedSet, WorkoutSession } from '@/types';
import { getSessionWithSets, updateSessionSets } from '@/services/sessionService';
import { PillStepper, BodyweightWeightPill } from '@/components/SetRow';
import { formatDate } from '@/utils/formatters';

interface ExerciseGroup {
  key: string;
  name: string;
  sets: LoggedSet[];
}

function groupByExercise(sets: LoggedSet[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  const byKey = new Map<string, ExerciseGroup>();
  for (const s of sets) {
    const key = `${s.exerciseTemplateId ?? 'x'}-${s.exerciseName}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, name: s.exerciseName, sets: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.sets.push(s);
  }
  return groups;
}

export default function EditSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = parseInt(id, 10);
  const db = useDB();
  const router = useRouter();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await getSessionWithSets(db, sessionId);
      if (loaded) {
        setSession(loaded);
        setSets(loaded.loggedSets ?? []);
      }
    })();
  }, [sessionId]);

  const handleChange = (
    setId: number,
    patch: Partial<Pick<LoggedSet, 'actualWeightKg' | 'actualReps' | 'actualDurationSec'>>
  ) => {
    setSets((prev) => prev.map((s) => (s.id === setId ? { ...s, ...patch } : s)));
  };

  const handleDeleteSet = (setId: number) => {
    setSets((prev) => prev.filter((s) => s.id !== setId));
    setDeletedIds((prev) => [...prev, setId]);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateSessionSets(
        db,
        sets.map((s) => ({
          id: s.id,
          actualWeightKg: s.actualWeightKg,
          actualReps: s.actualReps,
          actualDurationSec: s.actualDurationSec,
        })),
        deletedIds
      );
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Text className="text-text-muted">Loading workout…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        <Pressable onPress={() => router.back()} className="p-2">
          <X size={20} color="#555" />
        </Pressable>
        <View className="items-center">
          <Text className="text-text-primary font-bold text-base">{session.templateName}</Text>
          <Text className="text-text-muted text-xs mt-0.5">{formatDate(session.startedAt)}</Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-success px-4 py-2 rounded-xl"
        >
          <Text className="text-black font-semibold text-sm">Save</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {sets.length === 0 && (
          <Text className="text-text-muted text-sm text-center mt-10">
            No sets left in this workout.
          </Text>
        )}

        {groupByExercise(sets).map((group) => (
          <View key={group.key} className="mb-6">
            <Text className="text-text-primary text-lg font-semibold mb-3">{group.name}</Text>

            {group.sets.map((set) => {
              const showWeight =
                set.exerciseType === 'weight_reps' || set.exerciseType === 'weight_time';
              const showReps =
                set.exerciseType === 'weight_reps' || set.exerciseType === 'bodyweight_reps';
              const showDuration = set.exerciseType === 'weight_time';

              return (
                <View
                  key={set.id}
                  className="flex-row items-center gap-2 px-3 py-2 rounded-xl mb-2 bg-bg-elevated"
                >
                  <Text className="w-5 text-center text-xs text-text-muted">{set.setNumber}</Text>

                  {showWeight && (
                    <PillStepper
                      value={set.actualWeightKg}
                      placeholder={set.targetWeightKg}
                      step={1.25}
                      decimals={2}
                      unit="kg"
                      editable
                      isWeight
                      onChange={(v) => handleChange(set.id, { actualWeightKg: v })}
                    />
                  )}

                  {set.exerciseType === 'bodyweight_reps' && (
                    <BodyweightWeightPill
                      value={set.actualWeightKg}
                      editable
                      onChange={(v) => handleChange(set.id, { actualWeightKg: v })}
                    />
                  )}

                  {showReps && (
                    <PillStepper
                      value={set.actualReps}
                      placeholder={set.targetReps}
                      step={1}
                      decimals={0}
                      unit="reps"
                      editable
                      onChange={(v) =>
                        handleChange(set.id, { actualReps: v != null ? Math.round(v) : undefined })
                      }
                    />
                  )}

                  {showDuration && (
                    <PillStepper
                      value={set.actualDurationSec}
                      placeholder={set.targetDurationSec}
                      step={5}
                      decimals={0}
                      unit="sec"
                      editable
                      onChange={(v) =>
                        handleChange(set.id, {
                          actualDurationSec: v != null ? Math.round(v) : undefined,
                        })
                      }
                    />
                  )}

                  <Pressable
                    onPress={() => handleDeleteSet(set.id)}
                    hitSlop={6}
                    className="w-7 h-7 items-center justify-center active:opacity-60"
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
