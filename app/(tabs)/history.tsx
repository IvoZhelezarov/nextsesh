import { useCallback, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, CalendarDays } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { WorkoutSession } from '@/types';
import { getRecentSessionsWithSets } from '@/services/sessionService';
import { HistoryItem } from '@/components/HistoryItem';
import { WorkoutCalendar } from '@/components/WorkoutCalendar';

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const db = useDB();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');

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
          <WorkoutCalendar sessions={allSessions} />
        </ScrollView>
      ) : sessions.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-muted text-base">No workouts logged yet.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => String(s.id)}
          renderItem={({ item }) => <HistoryItem session={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#6366f1" style={{ marginVertical: 12 }} /> : null
          }
        />
      )}
    </SafeAreaView>
  );
}
