import { View, Text, TextInput, Pressable } from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';
import { ActiveSet } from '@/types';

interface Props {
  set: ActiveSet;
  isActive: boolean;
  canUndo: boolean;
  onDone: (data: {
    actualWeightKg?: number;
    actualReps?: number;
    actualDurationSec?: number;
    markProgress: boolean;
  }) => void;
  onUndo: () => void;
  onChange: (patch: Partial<Pick<ActiveSet, 'actualWeightKg' | 'actualReps' | 'actualDurationSec'>>) => void;
}

export function PillStepper({
  value,
  placeholder,
  step,
  decimals,
  unit,
  editable,
  isWeight,
  highlighted,
  onChange,
}: {
  value: number | undefined;
  placeholder: number | undefined;
  step: number;
  decimals: number;
  unit: string;
  editable: boolean;
  isWeight?: boolean;
  highlighted?: boolean;
  onChange: (v: number | undefined) => void;
}) {
  // For weight pills: treat 0 and undefined the same — nothing entered yet
  const hasValue = isWeight ? (value != null && value > 0) : value != null;

  const display = hasValue
    ? (decimals > 0 ? value!.toFixed(decimals).replace(/\.?0+$/, '') : String(value))
    : '';
  const placeholderStr = placeholder != null && (!isWeight || placeholder > 0)
    ? (decimals > 0 ? placeholder.toFixed(decimals).replace(/\.?0+$/, '') : String(placeholder))
    : '—';

  const adjust = (delta: number) => {
    const base = hasValue ? value! : (placeholder ?? 0);
    const next = Math.max(0, parseFloat((base + delta).toFixed(decimals)));
    if (isWeight) {
      onChange(next > 0 ? next : undefined);
    } else {
      onChange(next);
    }
  };

  const showMinus = !isWeight || hasValue;

  return (
    <View
      className="flex-row items-center flex-1 rounded-full overflow-hidden h-10"
      style={{ backgroundColor: highlighted ? '#f59e0b26' : '#1a1a1a' }}
    >
      {showMinus ? (
        <Pressable
          onPress={() => adjust(-step)}
          disabled={!editable}
          className={`w-10 h-10 items-center justify-center ${!editable ? 'opacity-30' : ''}`}
          hitSlop={4}
        >
          <Minus size={12} color={highlighted ? '#f59e0b' : '#9a9a9a'} strokeWidth={2.5} />
        </Pressable>
      ) : (
        <View className="w-10 h-10" />
      )}

      <View className="flex-1 flex-row items-center justify-center gap-1">
        <TextInput
          className="text-xs text-center min-w-6"
          style={{ color: highlighted ? '#f59e0b' : '#e5e5e5' }}
          keyboardType={decimals > 0 ? 'decimal-pad' : 'number-pad'}
          value={display}
          placeholder={placeholderStr}
          placeholderTextColor={highlighted ? '#f59e0b99' : '#555'}
          editable={editable}
          onChangeText={(v) => {
            if (!v) { onChange(isWeight ? undefined : undefined); return; }
            const n = parseFloat(v);
            if (isNaN(n)) return;
            onChange(isWeight && n === 0 ? undefined : n);
          }}
        />
        <Text className="text-xs" style={{ color: highlighted ? '#f59e0b99' : '#9a9a9a' }}>{unit}</Text>
      </View>

      <Pressable
        onPress={() => adjust(step)}
        disabled={!editable}
        className={`w-10 h-10 items-center justify-center ${!editable ? 'opacity-30' : ''}`}
        hitSlop={4}
      >
        <Plus size={12} color={highlighted ? '#f59e0b' : '#9a9a9a'} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

// Bodyweight optional weight pill: shows only + when no extra weight added.
export function BodyweightWeightPill({
  value,
  editable,
  onChange,
}: {
  value: number | undefined;
  editable: boolean;
  onChange: (v: number | undefined) => void;
}) {
  const hasWeight = value != null && value > 0;

  if (!hasWeight) {
    return (
      <View className="flex-row items-center flex-1 bg-bg-card rounded-full overflow-hidden h-10 justify-center">
        <Pressable
          onPress={() => editable && onChange(1.25)}
          disabled={!editable}
          className={`w-10 h-10 items-center justify-center ${!editable ? 'opacity-30' : ''}`}
          hitSlop={4}
        >
          <Plus size={12} color="#9a9a9a" strokeWidth={2.5} />
        </Pressable>
        <Text className="text-text-muted text-xs pr-2">kg</Text>
      </View>
    );
  }

  const display = value.toFixed(2).replace(/\.?0+$/, '');
  const adjust = (delta: number) => {
    const next = Math.max(0, parseFloat((value + delta).toFixed(2)));
    onChange(next === 0 ? undefined : next);
  };

  return (
    <View className="flex-row items-center flex-1 bg-bg-card rounded-full overflow-hidden h-10">
      <Pressable
        onPress={() => adjust(-1.25)}
        disabled={!editable}
        className={`w-10 h-10 items-center justify-center ${!editable ? 'opacity-30' : ''}`}
        hitSlop={4}
      >
        <Minus size={12} color="#9a9a9a" strokeWidth={2.5} />
      </Pressable>

      <View className="flex-1 flex-row items-center justify-center gap-1">
        <TextInput
          className="text-text-primary text-xs text-center min-w-6"
          keyboardType="decimal-pad"
          value={display}
          editable={editable}
          onChangeText={(v) => {
            const n = parseFloat(v);
            onChange(!v || isNaN(n) ? undefined : n);
          }}
        />
        <Text className="text-text-muted text-xs">kg</Text>
      </View>

      <Pressable
        onPress={() => adjust(1.25)}
        disabled={!editable}
        className={`w-10 h-10 items-center justify-center ${!editable ? 'opacity-30' : ''}`}
        hitSlop={4}
      >
        <Plus size={12} color="#9a9a9a" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

export function SetRow({ set, isActive, canUndo, onDone, onUndo, onChange }: Props) {
  const markProgress = true;

  const showWeight = set.exerciseType === 'weight_reps' || set.exerciseType === 'weight_time';
  const showReps = set.exerciseType === 'weight_reps' || set.exerciseType === 'bodyweight_reps';
  const showDuration = set.exerciseType === 'weight_time';
  const isBodyweightWithOptionalWeight = set.exerciseType === 'bodyweight_reps';

  const canEdit = isActive && !set.isDone;

  const handleRowPress = () => {
    if (set.isDone || !isActive) return;
    onDone({
      actualWeightKg: set.actualWeightKg,
      actualReps: set.actualReps,
      actualDurationSec: set.actualDurationSec,
      markProgress,
    });
  };

  return (
    <Pressable
      onPress={handleRowPress}
      className={`flex-row items-center gap-2 px-3 py-2 rounded-xl mb-2 ${
        set.isDone
          ? 'bg-success/20'
          : isActive
          ? 'bg-bg-elevated'
          : 'bg-bg-card opacity-50'
      }`}
    >
      <Text className={`w-5 text-center text-xs ${set.isDone ? 'text-success' : 'text-text-muted'}`}>
        {set.setNumber}
      </Text>

      {showWeight && (
        <PillStepper
          value={set.actualWeightKg}
          placeholder={set.targetWeightKg}
          step={1.25}
          decimals={2}
          unit="kg"
          editable={canEdit}
          isWeight
          highlighted={!!set.isModified}
          onChange={(v) => onChange({ actualWeightKg: v })}
        />
      )}

      {isBodyweightWithOptionalWeight && (
        <BodyweightWeightPill
          value={set.actualWeightKg}
          editable={canEdit}
          onChange={(v) => onChange({ actualWeightKg: v })}
        />
      )}

      {showReps && (
        <PillStepper
          value={set.actualReps}
          placeholder={set.targetReps}
          step={1}
          decimals={0}
          unit="reps"
          editable={canEdit}
          highlighted={!!set.isModified}
          onChange={(v) => onChange({ actualReps: v != null ? Math.round(v) : undefined })}
        />
      )}

      {showDuration && (
        <PillStepper
          value={set.actualDurationSec}
          placeholder={set.targetDurationSec}
          step={5}
          decimals={0}
          unit="sec"
          editable={canEdit}
          highlighted={!!set.isModified}
          onChange={(v) => onChange({ actualDurationSec: v != null ? Math.round(v) : undefined })}
        />
      )}

      {set.isDone ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (canUndo) onUndo();
          }}
          className={`w-7 h-7 rounded-full items-center justify-center bg-success border border-success ${!canUndo ? 'opacity-40' : ''}`}
          hitSlop={6}
        >
          <Check size={13} color="#0f0f0f" strokeWidth={3} />
        </Pressable>
      ) : (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (!isActive) return;
            onDone({
              actualWeightKg: set.actualWeightKg,
              actualReps: set.actualReps,
              actualDurationSec: set.actualDurationSec,
              markProgress,
            });
          }}
          disabled={!isActive}
          className={`w-7 h-7 rounded-full items-center justify-center border border-border ${!isActive ? 'opacity-30' : ''}`}
          hitSlop={6}
        />
      )}
    </Pressable>
  );
}
