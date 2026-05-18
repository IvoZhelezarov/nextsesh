import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { resetAllProgression } from '@/services/templateService';
import { useDB } from '@/hooks/useDB';

export default function SettingsScreen() {
  const router = useRouter();
  const db = useDB();
  const { settings, updateSettings } = useSettingsStore();

  const [restSec, setRestSec] = useState(String(settings.defaultRestSec));
  const [wtIncr, setWtIncr] = useState(String(settings.defaultWeightIncrement));
  const [repMin, setRepMin] = useState(String(settings.defaultRepMin));
  const [repMax, setRepMax] = useState(String(settings.defaultRepMax));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({
      defaultRestSec: parseInt(restSec, 10) || settings.defaultRestSec,
      defaultWeightIncrement: parseFloat(wtIncr) || settings.defaultWeightIncrement,
      defaultRepMin: parseInt(repMin, 10) || settings.defaultRepMin,
      defaultRepMax: parseInt(repMax, 10) || settings.defaultRepMax,
    });
    router.back();
  };

  const handleResetProgression = () => {
    Alert.alert(
      'Reset All Progression',
      'This will reset target reps to rep-min for all exercises. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAllProgression(db, settings.defaultRepMin);
            Alert.alert('Done', 'Progression has been reset for all exercises.');
          },
        },
      ]
    );
  };

  const field = (label: string, value: string, onChange: (v: string) => void, decimal = false) => (
    <View>
      <Text className="text-text-secondary text-sm mb-1">{label}</Text>
      <TextInput
        className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        value={value}
        onChangeText={onChange}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <View className="flex-row items-center">
            <Pressable onPress={() => router.back()} className="p-2 mr-2">
              <ArrowLeft size={20} color="#9a9a9a" />
            </Pressable>
            <Text className="text-text-primary text-xl font-bold">Settings</Text>
          </View>
          <Pressable onPress={handleSave} disabled={saving} className="bg-accent px-4 py-2 rounded-xl">
            <Text className="text-white font-semibold text-sm">Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 40 }}>
          <Text className="text-text-muted text-xs uppercase tracking-widest">Defaults</Text>
          {field('Rest timer (seconds)', restSec, setRestSec)}
          {field('Weight increment (kg)', wtIncr, setWtIncr, true)}
          {field('Rep range — minimum', repMin, setRepMin)}
          {field('Rep range — maximum', repMax, setRepMax)}

          <View className="mt-4 pt-4 border-t border-border">
            <Text className="text-text-muted text-xs uppercase tracking-widest mb-3">Danger Zone</Text>
            <Pressable
              onPress={handleResetProgression}
              className="py-4 rounded-xl border border-danger items-center"
            >
              <Text className="text-danger font-semibold">Reset All Progression</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
