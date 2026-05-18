import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getDB } from '@/db/client';
import { runMigrations } from '@/db/migrations';
import { useSettingsStore } from '@/stores/settingsStore';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    (async () => {
      try {
        const db = getDB();
        await runMigrations(db);
        await loadSettings();
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  if (error) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-danger text-base">{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Text style={{ color: '#ffffff', fontSize: 38, fontWeight: '800', letterSpacing: -1 }}>
          Next<Text style={{ color: '#6366f1' }}>Sesh</Text>
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-bg">
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f0f0f' } }} />
    </GestureHandlerRootView>
  );
}
