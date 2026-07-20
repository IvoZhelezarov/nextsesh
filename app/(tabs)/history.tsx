import { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, CalendarDays, Pencil, X } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { WorkoutSession } from '@/types';
import { getRecentSessionsWithSets, deleteSession } from '@/services/sessionService';
import { HistoryItem } from '@/components/HistoryItem';
import { WorkoutCalendar } from '@/components/WorkoutCalendar';
import { formatDate, formatDuration, formatSetLabel } from '@/utils/formatters';

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const db = useDB();
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  // For calendar we need all sessions (not just first page); load up to 200 to cover a year+
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([]);

  const loadSessions = async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    const loaded = await getRecentSessionsWithSets(db, PAGE_SIZE, currentOffset);

    if (reset) {
      setSessions(loaded);
      setOffset(PAGE_SIZE);
    } else {
      setSessions((prev) => [...prev, ...loaded]);
      setOffset((o) => o + PAGE_SIZE);
    }
    setHasMore(loaded.length === PAGE_SIZE);
  };

  const loadAllForCalendar = async () => {
    const loaded = await getRecentSessionsWithSets(db, 200, 0);
    setAllSessions(loaded);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await Promise.all([loadSessions(true), loadAllForCalendar()]);
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [])
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore || view === 'calendar') return;
    setLoadingMore(true);
    await loadSessions();
    setLoadingMore(false);
  };

  const handleEdit = (sessionId: number) => {
    setSelectedSession(null);
    router.push(`/session/edit/${sessionId}`);
  };

  const handleDelete = (sessionId: number) => {
    Alert.alert('Delete Workout', 'This will permanently remove the session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(db, sessionId);
          setSessions((prev) => prev.filter((s) => s.id !== sessionId));
          setAllSessions((prev) => prev.filter((s) => s.id !== sessionId));
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
        <Text className="text-text-primary text-3xl font-bold">History</Text>

        {/* Toggle */}
        <View className="flex-row bg-bg-elevated rounded-xl overflow-hidden">
          <Pressable
            onPress={() => setView('list')}
            className={`px-3 py-2 ${view === 'list' ? 'bg-accent' : ''}`}
          >
            <List size={16} color={view === 'list' ? '#fff' : '#555'} />
          </Pressable>
          <Pressable
            onPress={() => setView('calendar')}
            className={`px-3 py-2 ${view === 'calendar' ? 'bg-accent' : ''}`}
          >
            <CalendarDays size={16} color={view === 'calendar' ? '#fff' : '#555'} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : view === 'calendar' ? (
        <ScrollView className="flex-1">
          <WorkoutCalendar sessions={allSessions} onDayPress={setSelectedSession} />
        </ScrollView>
      ) : sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted text-base">No workouts logged yet.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => (
            <HistoryItem session={item} onDelete={handleDelete} onEdit={handleEdit} />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#6366f1" style={{ marginVertical: 12 }} /> : null
          }
        />
      )}

      {/* Day detail bottom sheet */}
      {selectedSession && (
        <DayDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onEdit={handleEdit}
        />
      )}
    </SafeAreaView>
  );
}

function DayDetailModal({
  session,
  onClose,
  onEdit,
}: {
  session: WorkoutSession;
  onClose: () => void;
  onEdit: (id: number) => void;
}) {
  const duration = session.finishedAt
    ? formatDuration(session.startedAt, session.finishedAt)
    : 'In progress';

  const byExercise = (session.loggedSets ?? []).reduce<Record<string, typeof session.loggedSets>>(
    (acc, s) => {
      if (!s) return acc;
      acc[s.exerciseName] = acc[s.exerciseName] ?? [];
      acc[s.exerciseName]!.push(s);
      return acc;
    },
    {}
  );

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.overlay]} className="justify-end">
      <View className="bg-bg rounded-t-3xl" style={{ maxHeight: '80%' }}>
        <View className="px-5 pt-5 pb-3 flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2">
              {session.templateColor && (
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: session.templateColor }} />
              )}
              <Text className="text-text-primary text-lg font-bold">{session.templateName}</Text>
            </View>
            <Text className="text-text-muted text-xs mt-1">
              {formatDate(session.startedAt)} · {duration}
            </Text>
          </View>
          <View className="flex-row items-center gap-4 mt-1">
            <Pressable onPress={() => onEdit(session.id)} hitSlop={8} className="active:opacity-60">
              <Pencil size={16} color="#9a9a9a" />
            </Pressable>
            <Pressable onPress={onClose} hitSlop={8} className="active:opacity-60">
              <X size={18} color="#9a9a9a" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        >
          {Object.entries(byExercise).map(([name, sets]) => (
            <View key={name} className="mb-4">
              <Text className="text-text-secondary text-sm font-semibold mb-1">{name}</Text>
              <View className="gap-0.5">
                {sets?.map((s) => (
                  <Text key={s.id} className="text-text-muted text-xs">
                    Set {s.setNumber}:{' '}
                    {formatSetLabel(s.exerciseType, s.actualWeightKg, s.actualReps, s.actualDurationSec)}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
