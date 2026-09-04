import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { queueAudioProgress, saveAudioProgressLocally } from "@/lib/progressSync";
import { markStoryFinishedIfComplete, noteServerConfirmedCompletion } from "@/lib/storyCompletion";
import { listLocalProgress } from "@/lib/offlineDb";

export type AudioProgressEntry = {
  progress: number;
  position_seconds: number;
  duration_seconds: number;
};

interface UseAudioProgressOptions {
  storySlug: string | undefined;
  /** Every audio track of the story — used only for the all-tracks-finished check. */
  audios: Array<{ slug: string }>;
  isAuthenticated: boolean;
  currentAudioSlug: string | undefined;
  /**
   * Which `content_type` the ≥99.5% `completion` event is tagged with. Defaults
   * to `"audio"` (the audiobook player); Read Along passes `"read_along"` so
   * admin analytics can split immersive-reading finishes from plain listening.
   */
  completionContentType?: "audio" | "read_along";
}

interface UseAudioProgressResult {
  /** Per-track progress, seeded from the server and updated live as audio plays. */
  liveProgressMap: Record<string, AudioProgressEntry>;
  /**
   * Whether the saved positions have loaded. Before this is true every track
   * reads as 0%, which is indistinguishable from a story nobody has opened —
   * so callers that care about the difference between starting and resuming
   * must wait for it.
   */
  progressDataReady: boolean;
  /** Restores the saved playback position. Call from `<audio onLoadedMetadata>`. */
  handleLoadedMetadata: (el: HTMLAudioElement) => void;
  /** Updates live progress and schedules a debounced save. Call from `<audio onTimeUpdate>`. */
  handleTimeUpdate: (el: HTMLAudioElement) => void;
  /** Persists 100% completion for the track. Call from `<audio onEnded>`. */
  handleEnded: (el: HTMLAudioElement) => void;
  /**
   * Immediately persists every pending debounced save (and cancels its timer).
   * Call before navigating to another track so an in-progress position isn't
   * lost to the debounce window.
   */
  flushPendingSaves: () => void;
}

type PendingSave = {
  timerId: number;
  progress: number;
  position: number;
  duration: number;
};

/**
 * Owns audio playback-position persistence: restores the saved position on
 * load, mirrors live progress into `liveProgressMap`, debounces saves (local
 * always, remote when authenticated, with an offline queue fallback), and
 * writes a final 100% on track end. Treats `AudioReadingProgress` as the
 * source of truth — it never touches `ChapterReadingProgress`.
 */
export function useAudioProgress({
  storySlug,
  audios,
  isAuthenticated,
  currentAudioSlug,
  completionContentType = "audio",
}: UseAudioProgressOptions): UseAudioProgressResult {
  // Keyed by audio slug rather than a single shared timer — with one shared
  // timer, finishing track N and moving to track N+1 would have the new
  // track's very first timeupdate cancel track N's still-pending "100%
  // complete" save before it ever fired, permanently losing that track's
  // final progress and dragging down the book's overall completion. Each
  // entry also carries its pending values so `flushPendingSaves()` can fire
  // them synchronously.
  const saveTimersRef = useRef<Record<string, PendingSave>>({});
  const restoredAudioSlugRef = useRef<string | null>(null);
  const loadedAudioElementRef = useRef<HTMLAudioElement | null>(null);

  const [liveAudioProgressMap, setLiveAudioProgressMap] = useState<
    Record<string, AudioProgressEntry>
  >({});

  const { data: audioProgress, isFetched: isServerProgressFetched } = useQuery({
    queryKey: ["audio-progress", storySlug],
    queryFn: () => storyApi.getAudioProgress(storySlug!),
    enabled: !!storySlug && isAuthenticated,
    retry: false,
  });

  const { data: localProgress, isFetched: isLocalProgressFetched } = useQuery({
    queryKey: ["local-audio-progress", storySlug],
    queryFn: () => listLocalProgress(storySlug),
    enabled: !!storySlug && !isAuthenticated && typeof window !== "undefined",
    retry: false,
  });

  useEffect(() => {
    restoredAudioSlugRef.current = null;
    loadedAudioElementRef.current = null;
  }, [currentAudioSlug]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach((entry) => window.clearTimeout(entry.timerId));
    };
  }, []);

  const audioProgressMap = useMemo(() => {
    const map: Record<string, AudioProgressEntry> = {};
    (audioProgress?.audio_progresses || []).forEach((item) => {
      map[item.audio_slug] = item;
    });
    if (!isAuthenticated) {
      (localProgress || [])
        .filter((item) => item.kind === "audio")
        .forEach((item) => {
          map[item.item_slug] = {
            progress: item.progress,
            position_seconds: item.position_seconds || 0,
            duration_seconds: item.duration_seconds || 0,
          };
        });
    }
    return map;
  }, [audioProgress, isAuthenticated, localProgress]);

  const progressDataReady = isAuthenticated ? isServerProgressFetched : isLocalProgressFetched;

  useEffect(() => {
    setLiveAudioProgressMap(audioProgressMap);
  }, [audioProgressMap]);

  const persistAudioProgress = (
    audioSlug: string,
    progress: number,
    positionSeconds: number,
    durationSeconds: number
  ) => {
    if (!storySlug) return;
    const normalizedProgress = Math.min(1, Math.max(0, progress));
    const normalizedPosition = Math.max(0, positionSeconds);
    const normalizedDuration = Math.max(0, durationSeconds);
    saveAudioProgressLocally(
      storySlug,
      audioSlug,
      normalizedProgress,
      normalizedPosition,
      normalizedDuration,
      completionContentType
    );
    if (isAuthenticated) {
      storyApi
        .saveAudioProgress(storySlug, audioSlug, normalizedProgress, normalizedPosition, normalizedDuration)
        .then((response) => {
          // The server settles completion on the write itself, so it is right
          // about "finished just now" even on a device that has never seen
          // this story before.
          if (response?.story_completed) noteServerConfirmedCompletion(storySlug);
        })
        .catch(() =>
          queueAudioProgress(storySlug, audioSlug, normalizedProgress, normalizedPosition, normalizedDuration)
        );
    } else if (normalizedProgress >= 0.995 && audios && audios.length > 0) {
      // Signed-out readers have no server record, so the local check stands.
      const allTracksFinished = audios.every(
        (audio) =>
          (audio.slug === audioSlug ? normalizedProgress : liveAudioProgressMap[audio.slug]?.progress || 0) >= 0.995
      );
      markStoryFinishedIfComplete(storySlug, allTracksFinished);
    }
  };

  const queueSaveAudioProgress = (
    audioSlug: string,
    progress: number,
    positionSeconds: number,
    durationSeconds: number
  ) => {
    if (!storySlug) return;

    const existing = saveTimersRef.current[audioSlug];
    if (existing) {
      window.clearTimeout(existing.timerId);
    }

    const timerId = window.setTimeout(() => {
      delete saveTimersRef.current[audioSlug];
      persistAudioProgress(audioSlug, progress, positionSeconds, durationSeconds);
    }, 700);
    saveTimersRef.current[audioSlug] = {
      timerId,
      progress,
      position: positionSeconds,
      duration: durationSeconds,
    };
  };

  const flushPendingSaves = () => {
    const pending = saveTimersRef.current;
    for (const slug of Object.keys(pending)) {
      const entry = pending[slug];
      window.clearTimeout(entry.timerId);
      delete pending[slug];
      persistAudioProgress(slug, entry.progress, entry.position, entry.duration);
    }
  };

  const restoreSavedPosition = useCallback((el: HTMLAudioElement) => {
    if (!currentAudioSlug) return;
    if (!progressDataReady) return;
    if (restoredAudioSlugRef.current === currentAudioSlug) return;

    const saved = audioProgressMap[currentAudioSlug];
    if (saved && saved.position_seconds > 0) {
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      const maxSafe = duration > 1 ? duration - 0.5 : duration;
      el.currentTime = Math.min(saved.position_seconds, maxSafe);
    }
    restoredAudioSlugRef.current = currentAudioSlug;
  }, [audioProgressMap, currentAudioSlug, progressDataReady]);

  useEffect(() => {
    const element = loadedAudioElementRef.current;
    if (element) restoreSavedPosition(element);
  }, [restoreSavedPosition]);

  const handleLoadedMetadata = (el: HTMLAudioElement) => {
    loadedAudioElementRef.current = el;
    restoreSavedPosition(el);
  };

  const handleTimeUpdate = (el: HTMLAudioElement) => {
    if (!currentAudioSlug) return;
    const duration = el.duration || 0;
    const position = el.currentTime || 0;
    const progress = duration > 0 ? position / duration : 0;
    setLiveAudioProgressMap((prev) => ({
      ...prev,
      [currentAudioSlug]: {
        progress,
        position_seconds: position,
        duration_seconds: duration,
      },
    }));
    queueSaveAudioProgress(currentAudioSlug, progress, position, duration);
  };

  const handleEnded = (el: HTMLAudioElement) => {
    if (currentAudioSlug) {
      // Drop any near-end debounced save queued milliseconds before `ended` —
      // otherwise it fires (or a flush fires it) right after this 100% write
      // and claws progress back to ~99% with a pre-end position.
      const pending = saveTimersRef.current[currentAudioSlug];
      if (pending) {
        window.clearTimeout(pending.timerId);
        delete saveTimersRef.current[currentAudioSlug];
      }
      const duration = el.duration || 0;
      setLiveAudioProgressMap((prev) => ({
        ...prev,
        [currentAudioSlug]: {
          progress: 1,
          position_seconds: duration,
          duration_seconds: duration,
        },
      }));
      persistAudioProgress(currentAudioSlug, 1, duration, duration);
    }
  };

  return {
    liveProgressMap: liveAudioProgressMap,
    // Whether the saved positions have loaded. Exposed so callers can tell a
    // genuinely fresh start from the momentary zero before restore.
    progressDataReady,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleEnded,
    flushPendingSaves,
  };
}
