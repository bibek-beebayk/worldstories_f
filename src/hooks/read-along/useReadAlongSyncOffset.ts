import { useCallback, useEffect, useState } from "react";
import {
  SYNC_OFFSET_STEP,
  SYNC_OFFSET_STORAGE_KEY,
  clampSyncOffset,
} from "@/lib/readAlongSyncOffset";

interface UseReadAlongSyncOffsetResult {
  /** Effective offset in seconds: the reader's per-track override, else the backend default. */
  offsetSeconds: number;
  /** The backend-set default for this track (clamped), for "nothing to save" checks. */
  defaultOffsetSeconds: number;
  /** True when the reader has a personal per-track override layered on the default. */
  isOverridden: boolean;
  increase: () => void;
  decrease: () => void;
  /** Drop the personal override and follow the backend default again. */
  reset: () => void;
  setOffsetSeconds: (next: number) => void;
}

/**
 * Read Along "highlight sync" offset for one track. The reader's manual
 * adjustment is a **per-track** override kept in localStorage; a track with no
 * override follows `defaultOffsetSeconds` (set on the backend by a superuser).
 * SSR / no track slug → the backend default (0 on the server).
 */
export function useReadAlongSyncOffset(
  audioSlug: string | undefined,
  defaultOffsetSeconds: number
): UseReadAlongSyncOffsetResult {
  const storageKey = audioSlug ? `${SYNC_OFFSET_STORAGE_KEY}:${audioSlug}` : null;

  const readOverride = useCallback((): number | null => {
    if (typeof window === "undefined" || !storageKey) return null;
    const raw = localStorage.getItem(storageKey);
    return raw === null ? null : clampSyncOffset(raw);
  }, [storageKey]);

  const [override, setOverride] = useState<number | null>(readOverride);

  // Switching tracks swaps the storage key — reload that track's override.
  useEffect(() => {
    setOverride(readOverride());
  }, [readOverride]);

  const clampedDefault = clampSyncOffset(defaultOffsetSeconds);
  const offsetSeconds = override ?? clampedDefault;

  const persist = useCallback(
    (next: number | null) => {
      setOverride(next);
      if (!storageKey) return;
      if (next === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, String(next));
    },
    [storageKey]
  );

  const increase = useCallback(
    () => persist(clampSyncOffset(offsetSeconds + SYNC_OFFSET_STEP)),
    [offsetSeconds, persist]
  );
  const decrease = useCallback(
    () => persist(clampSyncOffset(offsetSeconds - SYNC_OFFSET_STEP)),
    [offsetSeconds, persist]
  );
  const reset = useCallback(() => persist(null), [persist]);
  const setOffsetSeconds = useCallback(
    (next: number) => persist(clampSyncOffset(next)),
    [persist]
  );

  return {
    offsetSeconds,
    defaultOffsetSeconds: clampedDefault,
    isOverridden: override !== null,
    increase,
    decrease,
    reset,
    setOffsetSeconds,
  };
}
