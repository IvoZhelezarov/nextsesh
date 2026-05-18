import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { WorkoutSession } from '@/types';
import { formatDate, formatDuration, formatSetLabel } from '@/utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

interface Props {
  session: WorkoutSession;
}

export function HistoryItem({ session }: Props) {
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
        {expanded ? (
          <ChevronUp size={16} color="#555" />
        ) : (
          <ChevronDown size={16} color="#555" />
        )}
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
}
