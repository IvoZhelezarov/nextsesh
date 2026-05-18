import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useDB } from '@/hooks/useDB';
import { WorkoutTemplate, WorkoutSession } from '@/types';
import { getAllTemplates, getTemplateWithExercises } from '@/services/templateService';
import { createSession, getInProgressSession, getLoggedSetsForSession } from '@/services/sessionService';
import { useSessionStore } from '@/stores/sessionStore';
import { WorkoutCard } from '@/components/WorkoutCard';
import { Settings } from 'lucide-react-native';

export default function HomeScreen() {
  const db = useDB();
  const router = useRouter();
  const initSession = useSessionStore((s) => s.initSession);
  const resumeSession = useSessionStore((s) => s.resumeSession);

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [inProgress, setInProgress] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [tmpl, ip] = await Promise.all([
          getAllTemplates(db),
          getInProgressSession(db),
        ]);
        if (!active) return;
        setTemplates(tmpl);
        setInProgress(ip);
        setLoading(false);
      })();
      return () => { active = false; };
    }, [])
  );

  const handleStart = async (template: WorkoutTemplate) => {
    if (starting) return;
    setStarting(true);
    try {
      const full = await getTemplateWithExercises(db, template.id);
      if (!full) return;
      const sessionId = await createSession(db, template.id, template.name, template.color);
      initSession(sessionId, full);
      router.push(`/session/${sessionId}`);
    } finally {
      setStarting(false);
    }
  };

  const handleResume = async () => {
    if (!inProgress) return;
    const full = inProgress.workoutTemplateId
      ? await getTemplateWithExercises(db, inProgress.workoutTemplateId)
      : null;
    if (full) {
      const loggedSets = await getLoggedSetsForSession(db, inProgress.id);
      resumeSession(inProgress.id, full, loggedSets);
    }
    router.push(`/session/${inProgress.id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-text-muted text-sm">
              {format(new Date(), 'EEEE, MMMM d')}
            </Text>
            <Text className="text-text-primary text-3xl font-bold mt-0.5">Today</Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            className="w-10 h-10 items-center justify-center rounded-full bg-bg-elevated"
          >
            <Settings size={18} color="#9a9a9a" />
          </Pressable>
        </View>

        {inProgress && (
          <View className="mb-4">
            <Text className="text-warn text-sm font-medium mb-2">Session in progress</Text>
            <WorkoutCard
              template={{ id: inProgress.workoutTemplateId ?? 0, name: inProgress.templateName, sortOrder: 0, createdAt: '', updatedAt: '' }}
              onPress={handleResume}
              label="Resume Workout"
            />
          </View>
        )}

        {!loading && templates.length === 0 && (
          <View className="items-center mt-20 gap-3">
            <Text className="text-text-secondary text-base">No workout templates yet.</Text>
            <Pressable
              onPress={() => router.push('/template/new')}
              className="bg-accent px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Create Template</Text>
            </Pressable>
          </View>
        )}

        {templates.map((tmpl) => (
          <View key={tmpl.id} className="mb-4">
            <WorkoutCard template={tmpl} onPress={starting ? undefined : () => handleStart(tmpl)} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
