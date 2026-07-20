import { useCallback, useState } from 'react';
import { View, Text, Pressable, Alert, TextInput } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Pencil, Check } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { ExerciseTemplate, WorkoutTemplate } from '@/types';
import { getTemplateWithExercises, updateTemplate, deleteExercise, reorderExercises } from '@/services/templateService';
import DraggableExerciseList from '@/components/DraggableExerciseList';

const PALETTE = [
  '#6366f1', // indigo (accent)
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#a855f7', // purple
  '#64748b', // slate
];

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateId = parseInt(id, 10);
  const db = useDB();
  const router = useRouter();

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTemplateWithExercises(db, templateId).then((t) => {
        if (!active || !t) return;
        setTemplate(t);
        setNameInput(t.name);
      });
      return () => { active = false; };
    }, [templateId])
  );

  const saveName = async () => {
    if (!nameInput.trim() || !template) return;
    await updateTemplate(db, templateId, { name: nameInput.trim() });
    setTemplate((t) => t ? { ...t, name: nameInput.trim() } : t);
    setEditingName(false);
  };

  const handleColorSelect = async (color: string) => {
    if (!template) return;
    const next = template.color === color ? null : color;
    await updateTemplate(db, templateId, { color: next });
    setTemplate((t) => t ? { ...t, color: next ?? undefined } : t);
  };

  const handleDeleteExercise = (ex: ExerciseTemplate) => {
    Alert.alert('Remove Exercise', `Remove "${ex.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteExercise(db, ex.id);
          setTemplate((t) =>
            t ? { ...t, exercises: t.exercises?.filter((e) => e.id !== ex.id) } : t
          );
        },
      },
    ]);
  };

  const handleReorder = (reordered: ExerciseTemplate[]) => {
    setTemplate((t) => t ? { ...t, exercises: reordered } : t);
  };

  const handleReorderCommit = async (reordered: ExerciseTemplate[]) => {
    await reorderExercises(db, reordered.map((e) => e.id));
  };

  if (!template) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Text className="text-text-muted">Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center px-5 pt-3 pb-2">
        <Pressable onPress={() => router.back()} className="p-2 mr-2">
          <ArrowLeft size={20} color="#9a9a9a" />
        </Pressable>

        {editingName ? (
          <TextInput
            className="flex-1 text-text-primary text-xl font-bold bg-bg-elevated rounded-xl px-3 py-2 mr-2"
            value={nameInput}
            onChangeText={setNameInput}
            onBlur={saveName}
            onSubmitEditing={saveName}
            autoFocus
          />
        ) : (
          <Pressable onPress={() => setEditingName(true)} className="flex-row items-center flex-1 gap-2">
            {template.color && (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: template.color }} />
            )}
            <Text className="text-text-primary text-xl font-bold flex-1">{template.name}</Text>
            <Pencil size={14} color="#555" />
          </Pressable>
        )}
      </View>

      {/* Color picker */}
      <View className="flex-row gap-2 px-5 pb-3 flex-wrap">
        {PALETTE.map((c) => (
          <Pressable
            key={c}
            onPress={() => handleColorSelect(c)}
            style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}
          >
            {template.color === c && <Check size={13} color="white" strokeWidth={3} />}
          </Pressable>
        ))}
      </View>

      <DraggableExerciseList
        exercises={template.exercises ?? []}
        onPress={(ex) => router.push(`/exercise/${ex.id}`)}
        onDelete={handleDeleteExercise}
        onReorder={handleReorder}
        onReorderCommit={handleReorderCommit}
      />

      <Pressable
        onPress={() => router.push(`/exercise/new?templateId=${templateId}`)}
        className="absolute bottom-8 right-6 bg-accent w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Plus size={24} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
