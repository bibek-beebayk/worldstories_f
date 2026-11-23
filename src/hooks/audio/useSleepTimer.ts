import { useCallback, useEffect, useRef, useState } from "react";

export type SleepTimerMode = "off" | "minutes" | "chapter";

interface UseSleepTimerOptions {
  onPause: () => void;
  getAudioEl: () => HTMLAudioElement | null;
}

const FADE_SECONDS = 10;

export function useSleepTimer({ onPause, getAudioEl }: UseSleepTimerOptions) {
  const [mode, setMode] = useState<SleepTimerMode>("off");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const targetTimestampRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const onPauseRef = useRef(onPause);
  const getAudioElRef = useRef(getAudioEl);

  useEffect(() => {
    onPauseRef.current = onPause;
    getAudioElRef.current = getAudioEl;
  }, [onPause, getAudioEl]);

  const setVolumeSafely = useCallback((volume: number) => {
    const el = getAudioElRef.current();
    if (!el) return;
    try {
      el.volume = Math.max(0, Math.min(1, volume));
    } catch {
      // iOS Safari ignores programmatic volume changes.
    }
  }, []);

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    targetTimestampRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    clearTimerInterval();
    setVolumeSafely(1);
    setMode("off");
    setRemainingSeconds(null);
  }, [clearTimerInterval, setVolumeSafely]);

  const start = useCallback(
    (minutes: number) => {
      if (!Number.isFinite(minutes) || minutes <= 0) {
        cancel();
        return;
      }
      clearTimerInterval();
      setVolumeSafely(1);
      const totalMs = Math.round(minutes * 60 * 1000);
      targetTimestampRef.current = Date.now() + totalMs;
      setMode("minutes");
      setRemainingSeconds(Math.ceil(totalMs / 1000));

      intervalRef.current = window.setInterval(() => {
        const target = targetTimestampRef.current;
        if (target === null) return;
        const leftMs = target - Date.now();
        if (leftMs <= 0) {
          clearTimerInterval();
          setMode("off");
          setRemainingSeconds(null);
          onPauseRef.current();
          setVolumeSafely(1);
          return;
        }
        const leftSec = Math.ceil(leftMs / 1000);
        setRemainingSeconds(leftSec);
        if (leftSec <= FADE_SECONDS) {
          setVolumeSafely(leftSec / FADE_SECONDS);
        }
      }, 500);
    },
    [cancel, clearTimerInterval, setVolumeSafely],
  );

  const startEndOfChapter = useCallback(() => {
    clearTimerInterval();
    setVolumeSafely(1);
    setMode("chapter");
    setRemainingSeconds(null);
  }, [clearTimerInterval, setVolumeSafely]);

  useEffect(() => {
    return () => {
      clearTimerInterval();
      setVolumeSafely(1);
    };
  }, [clearTimerInterval, setVolumeSafely]);

  return {
    remainingSeconds,
    mode,
    stopAtChapterEnd: mode === "chapter",
    start,
    startEndOfChapter,
    cancel,
  };
}
