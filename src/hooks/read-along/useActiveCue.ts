import { useEffect, useRef, useState, type RefObject } from "react";
import { findActiveCueIndex, type NormalizedCue } from "@/lib/readAlongCues";

interface UseActiveCueOptions {
  cues: NormalizedCue[];
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  /** `player.currentTime` — the recompute trigger for the paused/seek path. */
  currentTime: number;
  /**
   * Reader-set "highlight sync" offset in seconds. Cue lookup happens at
   * `currentTime - offsetSeconds`, so a positive value delays the highlight.
   */
  offsetSeconds: number;
  enabled: boolean;
}

/**
 * Tracks which cue is currently spoken.
 *
 * While playing, a `requestAnimationFrame` loop reads the `<audio>` element's
 * `currentTime` directly (not the ~4 Hz React state) so the highlight stays
 * tight to the audio. State only updates when the active index actually
 * changes. While paused (or on seek / track restoration), a lightweight effect
 * recomputes from `currentTime` — `player.seek`/`player.skip` set that state
 * synchronously, and a restored position surfaces via `timeupdate`.
 */
export function useActiveCue({
  cues,
  audioRef,
  isPlaying,
  currentTime,
  offsetSeconds,
  enabled,
}: UseActiveCueOptions): number {
  const [activeIndex, setActiveIndex] = useState(-1);
  const lastIndexRef = useRef(-1);

  // Read live inside the rAF loop so nudging the offset doesn't tear down and
  // restart the loop (same pattern as `playerRef` in ReadAlongReader).
  const offsetRef = useRef(offsetSeconds);
  offsetRef.current = offsetSeconds;

  const commit = (next: number) => {
    if (next !== lastIndexRef.current) {
      lastIndexRef.current = next;
      setActiveIndex(next);
    }
  };

  // A fresh cue set (new track) must clear the change-guard, otherwise the
  // first real index for the new track could be suppressed as "unchanged".
  useEffect(() => {
    lastIndexRef.current = -1;
    setActiveIndex(-1);
  }, [cues]);

  // Playing: rAF loop.
  useEffect(() => {
    if (!enabled || !isPlaying) return;
    let frame = 0;
    const tick = () => {
      const el = audioRef.current;
      if (el) commit(findActiveCueIndex(cues, el.currentTime - offsetRef.current));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isPlaying, cues]);

  // Paused / seek / restore: recompute from the trigger.
  useEffect(() => {
    if (!enabled || isPlaying) return;
    const el = audioRef.current;
    commit(findActiveCueIndex(cues, (el ? el.currentTime : currentTime) - offsetSeconds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isPlaying, currentTime, offsetSeconds, cues]);

  return activeIndex;
}
