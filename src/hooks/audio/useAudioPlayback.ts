import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { isIOSDevice } from "@/lib/device";

export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

interface UseAudioPlaybackOptions {
  audioSrc: string | null;
  storySlug: string | undefined;
  /** Runs after the hook records duration + applies playback rate. */
  onLoadedMetadata?: (el: HTMLAudioElement) => void;
  /** Runs after the hook records current time + duration. */
  onTimeUpdate?: (el: HTMLAudioElement) => void;
  /** Runs before the hook flips `isPlaying` to false. */
  onEnded?: (el: HTMLAudioElement) => void;
  /**
   * Called on a media error before any error UI is shown. Return true if a
   * source fallback was triggered — the hook then clears its error and waits
   * for the element to remount.
   */
  onMediaError?: () => boolean;
}

/**
 * Owns the `<audio>` element lifecycle and transport state for a single
 * track: play/pause (with the iOS user-gesture and initial-prepare rules),
 * seek and ±N-second skip, current time / duration, playback rate, a
 * loading-timeout guard, and error state with a real `MediaError` readout.
 * A fresh element is mounted per source via `<audio key={sourceKey}>` from
 * `useAudioSource`; this hook attaches to it through `audioRef`.
 */
export function useAudioPlayback({
  audioSrc,
  storySlug,
  onLoadedMetadata,
  onTimeUpdate,
  onEnded,
  onMediaError,
}: UseAudioPlaybackOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initiallyPreparedStoryRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // The <audio> element is keyed on the source (see useAudioSource.sourceKey),
  // so React mounts a brand-new DOM node per track rather than mutating the
  // src of an existing one — browsers don't reliably resume/re-trigger
  // playback on an in-place src change, which caused a nasty earlier bug (a
  // "stuck" element reporting a spurious `ended` and cascading through the
  // whole playlist). A fresh element still needs an explicit play() once
  // mounted (there's no autoplay attribute), so this effect does that and
  // reflects the *real* outcome: iOS in particular routinely blocks it, in
  // which case the UI stays on Play rather than pretending playback started.
  useEffect(() => {
    if (!audioSrc) return;
    setPlaybackError(null);
    setIsAudioLoading(true);
    const audioEl = audioRef.current;
    if (!audioEl) return;

    // The initial unmuted play() is not permitted on iOS once navigation and
    // data loading have consumed the original tap activation. Let metadata
    // prepare, then expose the Play button for a fresh, valid user gesture.
    if (isIOSDevice() && initiallyPreparedStoryRef.current !== storySlug) {
      initiallyPreparedStoryRef.current = storySlug || null;
      setIsPlaying(false);
      return;
    }

    audioEl
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Expected on iOS: unmuted playback must begin directly from a tap.
        setIsPlaying(false);
        setIsAudioLoading(false);
      });
  }, [audioSrc, storySlug]);

  useEffect(() => {
    if (!isAudioLoading) return;
    const timeout = window.setTimeout(() => {
      // Some WebKit media states produce neither canplay nor error. Never
      // leave the manual Play action hidden behind an endless spinner.
      setIsAudioLoading(false);
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [audioSrc, isAudioLoading]);

  const setPlaybackRate = (rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const cyclePlaybackRate = () => {
    const nextRate = SPEED_OPTIONS[(SPEED_OPTIONS.indexOf(playbackRate) + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(nextRate);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      setPlaybackError(null);
      setIsAudioLoading(true);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((error: unknown) => {
          setIsPlaying(false);
          setIsAudioLoading(false);
          setPlaybackError(
            error instanceof DOMException && error.name === "NotAllowedError"
              ? "Your browser blocked playback. Tap Play again to start listening."
              : "This audio could not be played. Please check your connection and try again."
          );
        });
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const play = () => {
    if (audioRef.current?.paused) togglePlay();
  };

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) togglePlay();
  };

  const seek = (seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
    setCurrentTimeSeconds(seconds);
  };

  const skip = (deltaSeconds: number) => {
    if (!audioRef.current) return;
    const duration = Number.isFinite(audioRef.current.duration)
      ? audioRef.current.duration
      : durationSeconds;
    const next = Math.min(Math.max(0, audioRef.current.currentTime + deltaSeconds), duration || 0);
    audioRef.current.currentTime = next;
    setCurrentTimeSeconds(next);
  };

  const clearError = () => setPlaybackError(null);

  const audioElementProps = {
    preload: "metadata" as const,
    playsInline: true,
    className: "hidden",
    onLoadStart: () => setIsAudioLoading(true),
    onLoadedMetadata: (event: SyntheticEvent<HTMLAudioElement>) => {
      setIsAudioLoading(false);
      const el = event.currentTarget;
      setDurationSeconds(el.duration || 0);
      el.playbackRate = playbackRate;
      onLoadedMetadata?.(el);
    },
    onTimeUpdate: (event: SyntheticEvent<HTMLAudioElement>) => {
      const el = event.currentTarget;
      setCurrentTimeSeconds(el.currentTime || 0);
      setDurationSeconds(el.duration || 0);
      onTimeUpdate?.(el);
    },
    onEnded: (event: SyntheticEvent<HTMLAudioElement>) => {
      onEnded?.(event.currentTarget);
      setIsPlaying(false);
    },
    onPlay: () => {
      setPlaybackError(null);
      setIsAudioLoading(false);
      setIsPlaying(true);
    },
    onPause: () => setIsPlaying(false),
    onCanPlay: () => setIsAudioLoading(false),
    onPlaying: () => setIsAudioLoading(false),
    onWaiting: () => setIsAudioLoading(true),
    onError: (event: SyntheticEvent<HTMLAudioElement, Event>) => {
      setIsPlaying(false);
      setIsAudioLoading(false);
      if (onMediaError?.()) {
        setPlaybackError(null);
        return;
      }
      const mediaError = event.currentTarget.error;
      // Surfacing the real MediaError code/message (rather than a single
      // generic string) so the actual cause — network vs decode vs
      // unsupported format vs aborted — is visible without needing devtools.
      const codeNames: Record<number, string> = {
        1: "MEDIA_ERR_ABORTED",
        2: "MEDIA_ERR_NETWORK",
        3: "MEDIA_ERR_DECODE",
        4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
      };
      const codeName = mediaError ? codeNames[mediaError.code] || String(mediaError.code) : "unknown";
      console.error("Audio playback error", {
        code: mediaError?.code,
        codeName,
        message: mediaError?.message,
        src: audioSrc,
      });
      setPlaybackError(
        `This audio could not be loaded (${codeName}${
          mediaError?.message ? `: ${mediaError.message}` : ""
        }). Please check your connection and try again.`
      );
    },
  };

  return {
    audioRef,
    audioElementProps,
    isPlaying,
    isLoading: isAudioLoading,
    currentTime: currentTimeSeconds,
    duration: durationSeconds,
    error: playbackError,
    playbackRate,
    speedOptions: SPEED_OPTIONS,
    togglePlay,
    play,
    pause,
    seek,
    skip,
    cyclePlaybackRate,
    setPlaybackRate,
    clearError,
  };
}
