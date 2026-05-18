import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useDB } from '@/hooks/useDB';
import { createTemplate } from '@/services/templateService';

export default function NewTemplateScreen() {
  const db = useDB();
  const router = useRouter();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const id = await createTemplate(db, name.trim(), notes.trim() || undefined);
    router.replace(`/template/${id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center px-5 pt-3 pb-4">
          <Pressable onPress={() => router.back()} className="p-2 mr-2">
            <ArrowLeft size={20} color="#9a9a9a" />
          </Pressable>
          <Text className="text-text-primary text-xl font-bold">New Template</Text>
        </View>

        <View className="px-5 gap-4">
          <View>
            <Text className="text-text-secondary text-sm mb-1">Name</Text>
            <TextInput
              className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3"
              placeholder="e.g. Push Day A"
              placeholderTextColor="#555"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View>
            <Text className="text-text-secondary text-sm mb-1">Notes (optional)</Text>
            <TextInput
              className="bg-bg-elevated text-text-primary text-base rounded-xl px-4 py-3"
              placeholder="Any notes…"
              placeholderTextColor="#555"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={!name.trim() || saving}
            className={`py-4 rounded-xl items-center ${name.trim() ? 'bg-accent' : 'bg-bg-elevated'}`}
          >
            <Text className={`font-semibold text-base ${name.trim() ? 'text-white' : 'text-text-muted'}`}>
              Create Template
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
