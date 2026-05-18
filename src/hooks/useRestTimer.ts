import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { cancelNotification, vibrateSuccess } from '@/services/notificationService';

export function useRestTimer() {
  const { isRunning, remainingSec, notificationId, tick, skip } = useTimerStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (isRunning) {
      hasStartedRef.current = true;
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Vibrate and cancel the scheduled notification when timer reaches zero naturally
  useEffect(() => {
    if (!hasStartedRef.current) return;
    if (!isRunning && remainingSec === 0) {
      vibrateSuccess();
      if (notificationId) {
        cancelNotification(notificationId);
      }
    }
  }, [isRunning, remainingSec]);

  const skipTimer = () => {
    if (notificationId) {
      cancelNotification(notificationId);
    }
    skip();
  };

  return { isRunning, remainingSec, skipTimer };
}
