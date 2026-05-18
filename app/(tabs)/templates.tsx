import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ChevronRight, Trash2 } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { WorkoutTemplate } from '@/types';
import { getAllTemplates, deleteTemplate } from '@/services/templateService';

export default function TemplatesScreen() {
  const db = useDB();
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAllTemplates(db).then((t) => { if (active) setTemplates(t); });
      return () => { active = false; };
    }, [])
  );

  const handleDelete = (tmpl: WorkoutTemplate) => {
    Alert.alert(
      'Delete Template',
      `Delete "${tmpl.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(db, tmpl.id);
            setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
        <Text className="text-text-primary text-3xl font-bold">Templates</Text>
        <Pressable
          onPress={() => router.push('/template/new')}
          className="w-10 h-10 bg-accent rounded-full items-center justify-center"
        >
          <Plus size={20} color="white" />
        </Pressable>
      </View>

      {templates.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-text-secondary text-base">No templates yet.</Text>
          <Pressable
            onPress={() => router.push('/template/new')}
            className="bg-accent px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Create First Template</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/template/${item.id}`)}
              className="bg-bg-card rounded-xl px-4 py-4 mb-3 flex-row items-center active:opacity-80"
            >
              <Text className="text-text-primary font-semibold text-base flex-1">{item.name}</Text>
              <Pressable
                onPress={() => handleDelete(item)}
                className="p-2 mr-1"
                hitSlop={8}
              >
                <Trash2 size={16} color="#555" />
              </Pressable>
              <ChevronRight size={16} color="#555" />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
