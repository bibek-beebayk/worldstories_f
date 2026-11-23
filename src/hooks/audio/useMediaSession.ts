import { useEffect, useRef } from "react";

interface UseMediaSessionOptions {
  title: string;
  artist?: string;
  album?: string;
  artwork?: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSeekTo: (time: number) => void;
}

const ACTIONS: MediaSessionAction[] = [
  "play",
  "pause",
  "previoustrack",
  "nexttrack",
  "seekbackward",
  "seekforward",
  "seekto",
];

function toAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

export function useMediaSession({
  title,
  artist,
  album,
  artwork,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onSeekBackward,
  onSeekForward,
  onSeekTo,
}: UseMediaSessionOptions) {
  const handlersRef = useRef({
    onPlay,
    onPause,
    onPrevious,
    onNext,
    onSeekBackward,
    onSeekForward,
    onSeekTo,
  });
  const lastPositionUpdateRef = useRef(0);

  useEffect(() => {
    handlersRef.current = {
      onPlay,
      onPause,
      onPrevious,
      onNext,
      onSeekBackward,
      onSeekForward,
      onSeekTo,
    };
  }, [onPlay, onPause, onPrevious, onNext, onSeekBackward, onSeekForward, onSeekTo]);

  // Register action handlers once; delegate through refs so chapter remounts
  // never leave stale callbacks attached.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const safeSet = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Some browsers reject specific optional actions.
      }
    };

    safeSet("play", () => handlersRef.current.onPlay());
    safeSet("pause", () => handlersRef.current.onPause());
    safeSet("previoustrack", () => handlersRef.current.onPrevious?.());
    safeSet("nexttrack", () => handlersRef.current.onNext?.());
    safeSet("seekbackward", () => handlersRef.current.onSeekBackward());
    safeSet("seekforward", () => handlersRef.current.onSeekForward());
    safeSet("seekto", (details) => {
      if (typeof details.seekTime === "number" && Number.isFinite(details.seekTime)) {
        handlersRef.current.onSeekTo(details.seekTime);
      }
    });

    return () => {
      for (const action of ACTIONS) {
        safeSet(action, null);
      }
    };
  }, []);

  // Update metadata when chapter/story changes.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") {
      return;
    }
    const absoluteArt = toAbsoluteUrl(artwork);
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || "Audiobook",
        artist: artist || "",
        album: album || "",
        artwork: absoluteArt ? [{ src: absoluteArt }] : [],
      });
    } catch {
      // Ignore unsupported MediaMetadata shapes.
    }
  }, [title, artist, album, artwork]);

  // Update playbackState.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {
      // Ignore.
    }
  }, [isPlaying]);

  // Update position state (throttled to once per second).
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator) ||
      typeof navigator.mediaSession.setPositionState !== "function"
    ) {
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) return;
    const now = Date.now();
    if (now - lastPositionUpdateRef.current < 1000) return;
    lastPositionUpdateRef.current = now;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: playbackRate > 0 ? playbackRate : 1,
        position: Math.max(0, Math.min(currentTime, duration)),
      });
    } catch {
      // Ignore invalid position state errors on older browsers.
    }
  }, [currentTime, duration, playbackRate]);
}
