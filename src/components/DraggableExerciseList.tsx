import { useRef, useCallback } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GripVertical, Trash2, ChevronRight } from 'lucide-react-native';
import { ExerciseTemplate } from '@/types';
import { formatSetSummary } from '@/utils/formatters';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ITEM_HEIGHT = 72; // approximate row height + margin

interface Props {
  exercises: ExerciseTemplate[];
  onPress: (ex: ExerciseTemplate) => void;
  onDelete: (ex: ExerciseTemplate) => void;
  onReorder: (reordered: ExerciseTemplate[]) => void;
  onReorderCommit: (reordered: ExerciseTemplate[]) => void;
}

interface DragRowProps {
  item: ExerciseTemplate;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  onDragStart: (index: number) => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}

function DragRow({
  item,
  index,
  onPress,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: DragRowProps) {
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);
  const active = useSharedValue(0);

  const startDrag = useCallback(() => {
    'worklet';
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    runOnJS(onDragStart)(index);
    scale.value = withSpring(1.03, { damping: 15 });
    zIndex.value = 100;
    active.value = 1;
  }, [index, onDragStart, scale, zIndex, active]);

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      startDrag();
    })
    .onUpdate((e) => {
      runOnJS(onDragMove)(e.translationY);
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15 });
      zIndex.value = 0;
      active.value = 0;
      runOnJS(onDragEnd)();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    zIndex: zIndex.value,
    shadowOpacity: active.value ? 0.25 : 0,
    shadowRadius: active.value ? 8 : 0,
    elevation: active.value ? 8 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animStyle} className="mb-3">
        <Pressable
          onPress={onPress}
          className="bg-bg-card rounded-xl px-4 py-4 flex-row items-center active:opacity-80"
        >
          <View className="pr-3 py-1">
            <GripVertical size={18} color="#444" />
          </View>
          <View className="flex-1 mr-3">
            <Text className="text-text-primary font-semibold text-base">{item.name}</Text>
            <Text className="text-text-muted text-xs mt-0.5">
              {formatSetSummary(
                item.sets,
                item.exerciseType,
                item.currentWeightKg,
                item.targetReps,
                item.targetDurationSec
              )}
            </Text>
          </View>
          <Pressable onPress={onDelete} className="p-2 mr-1" hitSlop={8}>
            <Trash2 size={15} color="#555" />
          </Pressable>
          <ChevronRight size={15} color="#555" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export default function DraggableExerciseList({ exercises, onPress, onDelete, onReorder, onReorderCommit }: Props) {
  const startIndex = useRef<number | null>(null);
  const lastTo = useRef<number | null>(null);
  const orderSnapshot = useRef<ExerciseTemplate[]>([]);
  const currentOrder = useRef<ExerciseTemplate[]>(exercises);

  // Keep ref in sync when prop changes (e.g. after add/delete)
  currentOrder.current = exercises;

  const handleDragStart = useCallback((index: number) => {
    startIndex.current = index;
    lastTo.current = index;
    orderSnapshot.current = currentOrder.current;
  }, []);

  const handleDragMove = useCallback((dy: number) => {
    if (startIndex.current === null) return;
    // Absolute target slot from the drag origin — never from the item's
    // already-moved position, or every gesture frame compounds another step.
    const from = startIndex.current;
    const to = Math.max(
      0,
      Math.min(orderSnapshot.current.length - 1, from + Math.round(dy / ITEM_HEIGHT))
    );
    if (to === lastTo.current) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...orderSnapshot.current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    currentOrder.current = next;
    lastTo.current = to;
    onReorder(next);
  }, [onReorder]);

  const handleDragEnd = useCallback(() => {
    const moved = lastTo.current !== null && lastTo.current !== startIndex.current;
    startIndex.current = null;
    lastTo.current = null;
    orderSnapshot.current = [];
    if (moved) onReorderCommit(currentOrder.current);
  }, [onReorderCommit]);

  if (exercises.length === 0) {
    return (
      <View className="items-center mt-10">
        <Text className="text-text-muted text-sm">No exercises yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      scrollEventThrottle={16}
    >
      {exercises.map((item, index) => (
        <DragRow
          key={item.id}
          item={item}
          index={index}
          onPress={() => onPress(item)}
          onDelete={() => onDelete(item)}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        />
      ))}
    </ScrollView>
  );
}
