import { create } from 'zustand';

interface TimerState {
  isRunning: boolean;
  remainingSec: number;
  totalSec: number;
  exerciseName: string;
  notificationId: string | null;
  start: (durationSec: number, exerciseName: string, notificationId?: string) => void;
  tick: () => void;
  skip: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  isRunning: false,
  remainingSec: 0,
  totalSec: 0,
  exerciseName: '',
  notificationId: null,

  start: (durationSec, exerciseName, notificationId) => {
    set({
      isRunning: true,
      remainingSec: durationSec,
      totalSec: durationSec,
      exerciseName,
      notificationId: notificationId ?? null,
    });
  },

  tick: () => {
    set((state) => {
      const next = state.remainingSec - 1;
      if (next <= 0) {
        return { isRunning: false, remainingSec: 0 };
      }
      return { remainingSec: next };
    });
  },

  skip: () => {
    set({ isRunning: false, remainingSec: 0 });
  },
}));
