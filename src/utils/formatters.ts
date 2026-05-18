import { format, formatDistanceStrict } from 'date-fns';
import { ExerciseType } from '@/types';

export function formatDate(iso: string): string {
  return format(new Date(iso), 'EEE, MMM d');
}

export function formatDuration(startIso: string, endIso: string): string {
  return formatDistanceStrict(new Date(startIso), new Date(endIso));
}

export function formatSetLabel(
  type: ExerciseType,
  weightKg?: number,
  reps?: number,
  durationSec?: number
): string {
  if (type === 'weight_time') {
    const dur = durationSec ? `${durationSec}s` : '—';
    const w = weightKg != null ? ` @ ${weightKg}kg` : '';
    return `${dur}${w}`;
  }
  if (type === 'bodyweight_reps') {
    return reps != null ? `${reps} reps` : '—';
  }
  const r = reps != null ? `${reps} reps` : '—';
  const w = weightKg != null ? ` @ ${weightKg}kg` : '';
  return `${r}${w}`;
}

export function formatSetSummary(
  sets: number,
  type: ExerciseType,
  weightKg?: number,
  reps?: number,
  durationSec?: number
): string {
  if (type === 'weight_time') {
    const dur = durationSec ? `${durationSec}s` : '—';
    const w = weightKg != null ? ` @ ${weightKg}kg` : '';
    return `${sets}x${dur}${w}`;
  }
  if (type === 'bodyweight_reps') {
    return reps != null ? `${sets}x${reps}` : `${sets} sets`;
  }
  const r = reps != null ? `${sets}x${reps}` : `${sets} sets`;
  const w = weightKg != null ? ` @ ${weightKg}kg` : '';
  return `${r}${w}`;
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}
