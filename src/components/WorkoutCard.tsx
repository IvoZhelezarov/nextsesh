import { View, Text, Pressable } from 'react-native';
import { WorkoutTemplate } from '@/types';
import { formatSetSummary } from '@/utils/formatters';
import { ChevronRight } from 'lucide-react-native';

interface Props {
  template: WorkoutTemplate;
  onPress: () => void;
  label?: string;
}

export function WorkoutCard({ template, onPress, label = 'Start Workout' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-bg-card rounded-2xl p-5 active:opacity-80"
      style={template.color ? { borderLeftWidth: 3, borderLeftColor: template.color } : undefined}
    >
      <Text className="text-text-primary text-2xl font-bold mb-1">{template.name}</Text>
      {template.notes ? (
        <Text className="text-text-secondary text-sm mb-3">{template.notes}</Text>
      ) : null}

      <View className="gap-1 mb-4">
        {(template.exercises ?? []).slice(0, 5).map((ex) => (
          <Text key={ex.id} className="text-text-secondary text-sm">
            {ex.name} —{' '}
            {formatSetSummary(
              ex.sets,
              ex.exerciseType,
              ex.currentWeightKg,
              ex.targetReps,
              ex.targetDurationSec
            )}
          </Text>
        ))}
        {(template.exercises?.length ?? 0) > 5 && (
          <Text className="text-text-muted text-xs">
            +{(template.exercises?.length ?? 0) - 5} more
          </Text>
        )}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-text-muted text-xs">
          {template.exercises?.length ?? 0} exercise
          {(template.exercises?.length ?? 0) !== 1 ? 's' : ''}
        </Text>
        <View className="flex-row items-center bg-accent rounded-xl px-4 py-2 gap-1">
          <Text className="text-white font-semibold text-sm">{label}</Text>
          <ChevronRight size={14} color="white" />
        </View>
      </View>
    </Pressable>
  );
}
