import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { createExercise } from '@/services/templateService';
import { ExerciseType } from '@/types';

const TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'weight_reps', label: 'Weight + Reps' },
  { value: 'weight_time', label: 'Weight + Hold' },
  { value: 'bodyweight_reps', label: 'Bodyweight + Reps' },
];

export default function NewExerciseScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const db = useDB();
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('weight_reps');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('30');
  const [saving, setSaving] = useState(false);

  const showWeight = type === 'weight_reps' || type === 'weight_time';
  const showReps = type === 'weight_reps' || type === 'bodyweight_reps';
  const showDuration = type === 'weight_time';
  const isBodyweight = type === 'bodyweight_reps';

  const handleCreate = async () => {
    if (!name.trim() || !templateId) return;
    setSaving(true);
    await createExercise(db, parseInt(templateId, 10), {
      name: name.trim(),
      sortOrder: 0,
      exerciseType: type,
      sets: parseInt(sets, 10) || 3,
      targetReps: showReps ? (parseInt(reps, 10) || undefined) : undefined,
      targetDurationSec: showDuration ? (parseInt(duration, 10) || undefined) : undefined,
      currentWeightKg: showWeight && weight ? parseFloat(weight) : undefined,
      isBodyweight,
      progEnabled: true,
    });
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center px-5 pt-3 pb-4">
          <Pressable onPress={() => router.back()} className="p-2 mr-2">
            <ArrowLeft size={20} color="#9a9a9a" />
          </Pressable>
          <Text className="text-text-primary text-xl font-bold">Add Exercise</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 40 }}>
          <View>
            <Text className="text-text-secondary text-sm mb-1">Exercise name</Text>
            <TextInput
              className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3"
              placeholder="e.g. Shoulder Press"
              placeholderTextColor="#555"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View>
            <Text className="text-text-secondary text-sm mb-2">Type</Text>
            <View className="gap-2">
              {TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setType(t.value)}
                  className={`px-4 py-3 rounded-xl border ${
                    type === t.value ? 'border-accent bg-accent/10' : 'border-border bg-bg-elevated'
                  }`}
                >
                  <Text className={type === t.value ? 'text-accent font-semibold' : 'text-text-secondary'}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
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
                  value={reps}
                  onChangeText={setReps}
                />
              </View>
            )}
            {showDuration && (
              <View className="flex-1">
                <Text className="text-text-secondary text-sm mb-1">Hold (sec)</Text>
                <TextInput
                  className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3 text-center"
                  keyboardType="number-pad"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            )}
            {showWeight && (
              <View className="flex-1">
                <Text className="text-text-secondary text-sm mb-1">Start weight (kg)</Text>
                <TextInput
                  className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3 text-center"
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#555"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
            )}
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={!name.trim() || saving}
            className={`py-4 rounded-xl items-center mt-2 ${name.trim() ? 'bg-accent' : 'bg-bg-elevated'}`}
          >
            <Text className={`font-semibold text-base ${name.trim() ? 'text-white' : 'text-text-muted'}`}>
              Add Exercise
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
