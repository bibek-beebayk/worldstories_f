import { useCallback, useEffect, useState } from "react";
import {
  SYNC_OFFSET_STEP,
  SYNC_OFFSET_STORAGE_KEY,
  clampSyncOffset,
} from "@/lib/readAlongSyncOffset";

interface UseReadAlongSyncOffsetResult {
  /** Seconds to shift cue highlighting by. Positive delays the highlight. */
  offsetSeconds: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
  setOffsetSeconds: (next: number) => void;
}

/**
 * Locally-persisted "highlight sync" offset for the Read Along page. Lets a
 * reader nudge cue highlighting earlier/later to correct timed cues that run
 * consistently ahead of or behind the audio. Defaults to 0 (and 0 on the
 * server / first client paint); mirrors `useReadAlongAutoScroll`.
 */
export function useReadAlongSyncOffset(): UseReadAlongSyncOffsetResult {
  const [offsetSeconds, setOffsetState] = useState(() =>
    typeof window === "undefined"
      ? 0
      : clampSyncOffset(localStorage.getItem(SYNC_OFFSET_STORAGE_KEY))
  );

  useEffect(() => {
    localStorage.setItem(SYNC_OFFSET_STORAGE_KEY, String(offsetSeconds));
  }, [offsetSeconds]);

  const setOffsetSeconds = useCallback((next: number) => {
    setOffsetState(clampSyncOffset(next));
  }, []);

  const increase = useCallback(() => {
    setOffsetState((current) => clampSyncOffset(current + SYNC_OFFSET_STEP));
  }, []);

  const decrease = useCallback(() => {
    setOffsetState((current) => clampSyncOffset(current - SYNC_OFFSET_STEP));
  }, []);

  const reset = useCallback(() => setOffsetState(0), []);

  return { offsetSeconds, increase, decrease, reset, setOffsetSeconds };
}
