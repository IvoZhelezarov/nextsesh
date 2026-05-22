import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { useSessionStore } from '@/stores/sessionStore';
import { finishSession, getInProgressSession, getLoggedSetsForSession } from '@/services/sessionService';
import { getTemplateWithExercises, saveSetTargets } from '@/services/templateService';
import { ExerciseCard } from '@/components/ExerciseCard';
import { ProgressionModal, ExerciseOverride } from '@/components/ProgressionModal';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = parseInt(id, 10);
  const db = useDB();
  const router = useRouter();

  const activeSession = useSessionStore((s) => s.activeSession);
  const resumeSession = useSessionStore((s) => s.resumeSession);
  const clearSession = useSessionStore((s) => s.clearSession);

  const [finishing, setFinishing] = useState(false);
  const [showProgressionModal, setShowProgressionModal] = useState(false);

  // If the store is empty (crash recovery / direct navigation), reload from DB
  useEffect(() => {
    if (!activeSession || activeSession.sessionId !== sessionId) {
      (async () => {
        const session = await getInProgressSession(db);
        if (session && session.id === sessionId && session.workoutTemplateId) {
          const template = await getTemplateWithExercises(db, session.workoutTemplateId);
          if (template) {
            const loggedSets = await getLoggedSetsForSession(db, sessionId);
            resumeSession(sessionId, template, loggedSets, session.startedAt);
          }
        }
      })();
    }
  }, [sessionId]);

  const handleFinish = () => {
    Alert.alert('Finish Workout', 'Mark this workout as complete?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          setFinishing(true);
          await finishSession(db, sessionId);
          // Prompt for progressive overload
          Alert.alert(
            'Progressive overload',
            'Do you want to set new targets for next time?',
            [
              {
                text: 'Skip',
                onPress: () => {
                  clearSession();
                  router.replace('/(tabs)/history');
                },
              },
              {
                text: 'Yes',
                onPress: () => setShowProgressionModal(true),
              },
            ]
          );
        },
      },
    ]);
  };

  const handleProgressionSave = async (overrides: ExerciseOverride[]) => {
    for (const ex of overrides) {
      await saveSetTargets(
        db,
        ex.exerciseTemplateId,
        ex.sets.map((s, i) => ({
          setNumber: i + 1,
          targetWeightKg: s.weightKg,
          targetReps: s.reps,
          targetDurationSec: s.durationSec,
          isModified: s.modified.weight || s.modified.reps || s.modified.duration,
        }))
      );
    }
    setShowProgressionModal(false);
    clearSession();
    router.replace('/(tabs)/history');
  };

  const handleProgressionSkip = () => {
    setShowProgressionModal(false);
    clearSession();
    router.replace('/(tabs)/history');
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout', 'Are you sure? Logged sets will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          const { deleteSession } = await import('@/services/sessionService');
          await deleteSession(db, sessionId);
          clearSession();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  if (!activeSession || activeSession.sessionId !== sessionId) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Text className="text-text-muted">Loading session…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        <Pressable onPress={handleDiscard} className="p-2">
          <X size={20} color="#555" />
        </Pressable>
        <Text className="text-text-primary font-bold text-base">
          {activeSession.workoutTemplate.name}
        </Text>
        <Pressable
          onPress={handleFinish}
          disabled={finishing}
          className="bg-success px-4 py-2 rounded-xl"
        >
          <Text className="text-black font-semibold text-sm">Done</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {activeSession.exercises.map((ex) => (
          <ExerciseCard key={ex.exerciseTemplate.id} exercise={ex} />
        ))}
      </ScrollView>

      {showProgressionModal && (
        <ProgressionModal
          exercises={activeSession.exercises}
          onSave={handleProgressionSave}
          onSkip={handleProgressionSkip}
        />
      )}
    </SafeAreaView>
  );
}
