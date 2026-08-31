import { useEffect, useState, type MutableRefObject, type RefObject } from "react";
import { cueAtOrBefore, type NormalizedCue } from "@/lib/readAlongCues";

interface UseCueAutoScrollOptions {
  cues: NormalizedCue[];
  activeIndex: number;
  currentTime: number;
  cueRefs: MutableRefObject<(HTMLElement | null)[]>;
  scrollContainerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  reducedMotion: boolean;
  /** Changing this (e.g. the audio slug) clears the suspended state. */
  resetKey: unknown;
}

interface UseCueAutoScrollResult {
  isSuspended: boolean;
  resume: () => void;
}

const SUSPEND_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

/**
 * Keeps the active cue centered in the transcript scroll region while audio
 * plays. Auto-scroll suspends the moment the reader scrolls by hand (wheel /
 * touch drag / arrow keys — unambiguous user intent, so we never have to
 * disambiguate our own programmatic scroll) and stays suspended until they
 * press "Resume" or change tracks.
 */
export function useCueAutoScroll({
  cues,
  activeIndex,
  currentTime,
  cueRefs,
  scrollContainerRef,
  enabled,
  reducedMotion,
  resetKey,
}: UseCueAutoScrollOptions): UseCueAutoScrollResult {
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    setIsSuspended(false);
  }, [resetKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const suspend = () => setIsSuspended(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (SUSPEND_KEYS.has(event.key)) suspend();
    };

    container.addEventListener("wheel", suspend, { passive: true });
    container.addEventListener("touchmove", suspend, { passive: true });
    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("wheel", suspend);
      container.removeEventListener("touchmove", suspend);
      container.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, scrollContainerRef]);

  const target =
    activeIndex >= 0 ? activeIndex : cueAtOrBefore(cues, currentTime);

  useEffect(() => {
    if (!enabled || isSuspended || target < 0) return;
    cueRefs.current[target]?.scrollIntoView({
      block: "center",
      behavior: reducedMotion ? "auto" : "smooth",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSuspended, target, reducedMotion]);

  return { isSuspended, resume: () => setIsSuspended(false) };
}
