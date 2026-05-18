import { View, Text, Pressable, Modal } from 'react-native';
import { useTimerStore } from '@/stores/timerStore';
import { useRestTimer } from '@/hooks/useRestTimer';
import { formatSeconds } from '@/utils/formatters';

export function RestTimerOverlay() {
  const { isRunning, totalSec } = useTimerStore();
  const { remainingSec, skipTimer } = useRestTimer();

  if (!isRunning && remainingSec === 0) return null;

  const progress = totalSec > 0 ? remainingSec / totalSec : 0;
  const pct = Math.round(progress * 100);

  return (
    <Modal transparent animationType="fade" visible={isRunning || remainingSec > 0}>
      <View className="flex-1 bg-black/70 items-center justify-center px-6">
        <View className="bg-bg-elevated rounded-2xl p-8 w-full max-w-sm items-center gap-4">
          <Text className="text-text-secondary text-sm uppercase tracking-widest">Rest</Text>
          <Text className="text-text-primary text-7xl font-bold tabular-nums">
            {formatSeconds(remainingSec)}
          </Text>
          <View className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
            <View
              className="h-full bg-accent rounded-full"
              style={{ width: `${pct}%` }}
            />
          </View>
          <Pressable
            onPress={skipTimer}
            className="mt-2 px-8 py-3 rounded-xl bg-bg-card active:bg-border"
          >
            <Text className="text-text-secondary text-base">Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
