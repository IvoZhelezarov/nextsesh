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
}

interface DragRowProps {
  item: ExerciseTemplate;
  index: number;
  total: number;
  onPress: () => void;
  onDelete: () => void;
  onDragStart: (index: number) => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function DragRow({
  item,
  index,
  onPress,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
}: DragRowProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);

  const startDrag = useCallback(() => {
    'worklet';
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    runOnJS(onDragStart)(index);
    scale.value = withSpring(1.03, { damping: 15 });
    zIndex.value = 100;
  }, [index, onDragStart, scale, zIndex]);

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      startDrag();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      runOnJS(onDragMove)(e.translationY);
    })
    .onEnd(() => {
      translateY.value = withSpring(0, { damping: 20 });
      scale.value = withSpring(1, { damping: 15 });
      zIndex.value = 0;
      runOnJS(onDragEnd)();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: isDragging ? translateY.value : 0 },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
    shadowOpacity: isDragging ? 0.25 : 0,
    shadowRadius: isDragging ? 8 : 0,
    elevation: isDragging ? 8 : 0,
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

export default function DraggableExerciseList({ exercises, onPress, onDelete, onReorder }: Props) {
  const dragIndex = useRef<number | null>(null);
  const currentOrder = useRef<ExerciseTemplate[]>(exercises);

  // Keep ref in sync when prop changes (e.g. after add/delete)
  currentOrder.current = exercises;

  const handleDragStart = useCallback((index: number) => {
    dragIndex.current = index;
  }, []);

  const handleDragMove = useCallback((dy: number) => {
    if (dragIndex.current === null) return;
    const steps = Math.round(dy / ITEM_HEIGHT);
    const from = dragIndex.current;
    const to = Math.max(0, Math.min(currentOrder.current.length - 1, from + steps));
    if (to === from) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = [...currentOrder.current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    currentOrder.current = next;
    dragIndex.current = to;
    onReorder(next);
  }, [onReorder]);

  const handleDragEnd = useCallback(() => {
    dragIndex.current = null;
  }, []);

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
          total={exercises.length}
          onPress={() => onPress(item)}
          onDelete={() => onDelete(item)}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          isDragging={false}
        />
      ))}
    </ScrollView>
  );
}
