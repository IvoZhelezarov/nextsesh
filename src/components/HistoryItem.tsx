import { View, Text, Pressable } from 'react-native';
import { memo, useState } from 'react';
import { WorkoutSession } from '@/types';
import { formatDate, formatDuration, formatSetLabel } from '@/utils/formatters';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react-native';

interface Props {
  session: WorkoutSession;
  onDelete?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export const HistoryItem = memo(function HistoryItem({ session, onDelete, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);

  const duration =
    session.finishedAt
      ? formatDuration(session.startedAt, session.finishedAt)
      : 'In progress';

  const byExercise = (session.loggedSets ?? []).reduce<
    Record<string, typeof session.loggedSets>
  >((acc, s) => {
    if (!s) return acc;
    const key = s.exerciseName;
    acc[key] = acc[key] ?? [];
    acc[key]!.push(s);
    return acc;
  }, {});

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      onLongPress={() => onDelete?.(session.id)}
      className="bg-bg-card rounded-xl px-4 py-3 mb-3 active:opacity-80 overflow-hidden"
      style={session.templateColor ? { borderLeftWidth: 3, borderLeftColor: session.templateColor } : undefined}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-text-primary font-semibold text-base">
            {session.templateName}
          </Text>
          <Text className="text-text-muted text-xs mt-0.5">
            {formatDate(session.startedAt)} · {duration}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {expanded && onEdit && (
            <Pressable
              onPress={() => onEdit(session.id)}
              hitSlop={8}
              className="active:opacity-60"
            >
              <Pencil size={15} color="#9a9a9a" />
            </Pressable>
          )}
          {expanded && onDelete && (
            <Pressable
              onPress={() => onDelete(session.id)}
              hitSlop={8}
              className="active:opacity-60"
            >
              <Trash2 size={15} color="#ef4444" />
            </Pressable>
          )}
          {expanded ? (
            <ChevronUp size={16} color="#555" />
          ) : (
            <ChevronDown size={16} color="#555" />
          )}
        </View>
      </View>

      {expanded && (
        <View className="mt-3 pt-3 border-t border-border gap-3">
          {Object.entries(byExercise).map(([name, sets]) => (
            <View key={name}>
              <Text className="text-text-secondary text-sm font-medium mb-1">{name}</Text>
              <View className="gap-0.5">
                {sets?.map((s) => (
                  <Text key={s.id} className="text-text-muted text-xs">
                    Set {s.setNumber}:{' '}
                    {formatSetLabel(
                      s.exerciseType,
                      s.actualWeightKg,
                      s.actualReps,
                      s.actualDurationSec
                    )}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
});
