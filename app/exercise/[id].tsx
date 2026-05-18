import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { ExerciseTemplate } from '@/types';
import { getExerciseTemplate, updateExercise } from '@/services/templateService';
import { useSettingsStore } from '@/stores/settingsStore';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exerciseId = parseInt(id, 10);
  const db = useDB();
  const router = useRouter();
  const globalSettings = useSettingsStore((s) => s.settings);

  const [ex, setEx] = useState<ExerciseTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Local form state
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [targetReps, setTargetReps] = useState('');
  const [targetDuration, setTargetDuration] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [wtIncr, setWtIncr] = useState('');
  const [repMin, setRepMin] = useState('');
  const [repMax, setRepMax] = useState('');
  const [restSec, setRestSec] = useState('');
  const [progEnabled, setProgEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getExerciseTemplate(db, exerciseId).then((e) => {
        if (!active || !e) return;
        setEx(e);
        setName(e.name);
        setSets(String(e.sets));
        setTargetReps(e.targetReps != null ? String(e.targetReps) : '');
        setTargetDuration(e.targetDurationSec != null ? String(e.targetDurationSec) : '');
        setWeightKg(e.currentWeightKg != null ? String(e.currentWeightKg) : '');
        setWtIncr(e.progWeightIncrement != null ? String(e.progWeightIncrement) : '');
        setRepMin(e.progRepMin != null ? String(e.progRepMin) : '');
        setRepMax(e.progRepMax != null ? String(e.progRepMax) : '');
        setRestSec(e.progRestSec != null ? String(e.progRestSec) : '');
        setProgEnabled(e.progEnabled);
      });
      return () => { active = false; };
    }, [exerciseId])
  );

  const handleSave = async () => {
    setSaving(true);
    await updateExercise(db, exerciseId, {
      name: name.trim() || undefined,
      sets: sets ? parseInt(sets, 10) : undefined,
      targetReps: targetReps ? parseInt(targetReps, 10) : undefined,
      targetDurationSec: targetDuration ? parseInt(targetDuration, 10) : undefined,
      currentWeightKg: weightKg ? parseFloat(weightKg) : undefined,
      progWeightIncrement: wtIncr ? parseFloat(wtIncr) : undefined,
      progRepMin: repMin ? parseInt(repMin, 10) : undefined,
      progRepMax: repMax ? parseInt(repMax, 10) : undefined,
      progRestSec: restSec ? parseInt(restSec, 10) : undefined,
      progEnabled,
    });
    router.back();
  };

  if (!ex) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Text className="text-text-muted">Loading…</Text>
      </View>
    );
  }

  const showWeight = ex.exerciseType === 'weight_reps' || ex.exerciseType === 'weight_time';
  const showReps = ex.exerciseType === 'weight_reps' || ex.exerciseType === 'bodyweight_reps';
  const showDuration = ex.exerciseType === 'weight_time';

  const ph = (val: number) => String(val);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center px-5 pt-3 pb-4">
          <Pressable onPress={() => router.back()} className="p-2 mr-2">
            <ArrowLeft size={20} color="#9a9a9a" />
          </Pressable>
          <Text className="text-text-primary text-xl font-bold flex-1">Edit Exercise</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="bg-accent px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-semibold text-sm">Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 60 }}>
          {/* Basic */}
          <Text className="text-text-muted text-xs uppercase tracking-widest">Basic</Text>

          <View>
            <Text className="text-text-secondary text-sm mb-1">Name</Text>
            <TextInput
              className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-text-secondary text-sm mb-1">Sets</Text>
              <TextInput
                className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3 text-center"
                keyboardType="number-pad"
                value={sets}
                onChangeText={setSets}
              />
            </View>
            {showReps && (
              <View className="flex-1">
                <Text className="text-text-secondary text-sm mb-1">Target reps</Text>
                <TextInput
                  className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3 text-center"
                  keyboardType="number-pad"
                  value={targetReps}
                  onChangeText={setTargetReps}
                />
              </View>
            )}
            {showDuration && (
              <View className="flex-1">
                <Text className="text-text-secondary text-sm mb-1">Hold (sec)</Text>
                <TextInput
                  className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3 text-center"
                  keyboardType="number-pad"
                  value={targetDuration}
                  onChangeText={setTargetDuration}
                />
              </View>
            )}
            {showWeight && (
              <View className="flex-1">
                <Text className="text-text-secondary text-sm mb-1">Weight (kg)</Text>
                <TextInput
                  className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3 text-center"
                  keyboardType="decimal-pad"
                  value={weightKg}
                  onChangeText={setWeightKg}
                />
              </View>
            )}
          </View>

          {/* Progression */}
          <Text className="text-text-muted text-xs uppercase tracking-widest mt-2">Progression</Text>

          <View className="flex-row items-center justify-between bg-bg-elevated rounded-xl px-4 py-3">
            <Text className="text-text-primary text-base">Enable progression</Text>
            <Switch
              value={progEnabled}
              onValueChange={setProgEnabled}
              trackColor={{ false: '#2a2a2a', true: '#6366f1' }}
              thumbColor="white"
            />
          </View>

          {progEnabled && (
            <>
              {showWeight && (
                <View>
                  <Text className="text-text-secondary text-sm mb-1">
                    Weight increment (kg){' '}
                    <Text className="text-text-muted">
                      (global: {globalSettings.defaultWeightIncrement})
                    </Text>
                  </Text>
                  <TextInput
                    className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3"
                    keyboardType="decimal-pad"
                    placeholder={ph(globalSettings.defaultWeightIncrement)}
                    placeholderTextColor="#555"
                    value={wtIncr}
                    onChangeText={setWtIncr}
                  />
                </View>
              )}

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-text-secondary text-sm mb-1">
                    Rep min{' '}
                    <Text className="text-text-muted">({globalSettings.defaultRepMin})</Text>
                  </Text>
                  <TextInput
                    className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3 text-center"
                    keyboardType="number-pad"
                    placeholder={ph(globalSettings.defaultRepMin)}
                    placeholderTextColor="#555"
                    value={repMin}
                    onChangeText={setRepMin}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-text-secondary text-sm mb-1">
                    Rep max{' '}
                    <Text className="text-text-muted">({globalSettings.defaultRepMax})</Text>
                  </Text>
                  <TextInput
                    className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3 text-center"
                    keyboardType="number-pad"
                    placeholder={ph(globalSettings.defaultRepMax)}
                    placeholderTextColor="#555"
                    value={repMax}
                    onChangeText={setRepMax}
                  />
                </View>
              </View>

              <View>
                <Text className="text-text-secondary text-sm mb-1">
                  Rest timer (sec){' '}
                  <Text className="text-text-muted">(global: {globalSettings.defaultRestSec})</Text>
                </Text>
                <TextInput
                  className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3"
                  keyboardType="number-pad"
                  placeholder={ph(globalSettings.defaultRestSec)}
                  placeholderTextColor="#555"
                  value={restSec}
                  onChangeText={setRestSec}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
