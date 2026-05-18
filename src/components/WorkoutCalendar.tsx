import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { WorkoutSession } from '@/types';

interface Props {
  sessions: WorkoutSession[];
  onDayPress?: (session: WorkoutSession) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sun..6=Sat, shift to Mon-start (0=Mon..6=Sun)
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function WorkoutCalendar({ sessions, onDayPress }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Build maps: "YYYY-MM-DD" -> color and -> last session of that day
  const dayColorMap = new Map<string, string>();
  const daySessionMap = new Map<string, WorkoutSession>();
  for (const s of sessions) {
    const d = s.startedAt.slice(0, 10);
    daySessionMap.set(d, s);
    if (s.templateColor) dayColorMap.set(d, s.templateColor);
    else if (!dayColorMap.has(d)) dayColorMap.set(d, '#6366f1');
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  const todayStr = today.toISOString().slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');

  // Build grid cells: nulls for leading empty days, then 1..daysInMonth
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View className="px-4 pt-2">
      {/* Month nav */}
      <View className="flex-row items-center justify-between mb-4">
        <Pressable onPress={prevMonth} className="p-2" hitSlop={8}>
          <ChevronLeft size={18} color="#9a9a9a" />
        </Pressable>
        <Text className="text-text-primary font-semibold text-base">
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable onPress={nextMonth} className="p-2" hitSlop={8}>
          <ChevronRight size={18} color="#9a9a9a" />
        </Pressable>
      </View>

      {/* Day labels */}
      <View className="flex-row mb-1">
        {DAY_LABELS.map((l, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text className="text-text-muted text-xs">{l}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} className="flex-row mb-1">
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={{ flex: 1 }} />;
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const color = dayColorMap.get(dateStr);
            const isToday = dateStr === todayStr;
            const session = daySessionMap.get(dateStr);
            const pressable = !!session && !!onDayPress;

            return (
              <View key={col} style={{ flex: 1, alignItems: 'center', paddingVertical: 3 }}>
                <Pressable
                  onPress={pressable ? () => onDayPress!(session!) : undefined}
                  style={[
                    {
                      width: 32, height: 32, borderRadius: 16,
                      alignItems: 'center', justifyContent: 'center',
                    },
                    color ? { backgroundColor: color } : undefined,
                    isToday && !color ? { borderWidth: 1, borderColor: '#6366f1' } : undefined,
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isToday ? '700' : '400',
                      color: color ? '#fff' : isToday ? '#6366f1' : '#9a9a9a',
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
