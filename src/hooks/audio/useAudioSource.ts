import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/api/client";
import { isIOSDevice } from "@/lib/device";

interface UseAudioSourceOptions {
  storySlug: string | undefined;
  audioSlug: string | undefined;
  /** The public R2 object URL for the track, or null when unknown. */
  directUrl: string | null;
}

interface UseAudioSourceResult {
  /** The URL to feed the `<audio>` element, or null when nothing is resolvable yet. */
  audioSrc: string | null;
  /** Identity of the current source — apply to `<audio key>` so a fresh element mounts per track/source. */
  sourceKey: string;
  /** Whether the range-aware backend proxy stream is being used instead of the direct R2 URL. */
  usingProxy: boolean;
  /**
   * Call from the `<audio>` element's error handler. Returns true when it
   * triggered a direct→proxy fallback (the caller should then suppress its
   * error UI and wait for the remount), false when the error is terminal.
   */
  handleMediaError: () => boolean;
}

/**
 * Resolves the media URL for an audio track: the public R2 object URL by
 * default, or the controlled range-aware API stream on iOS WebKit (a direct
 * media load there can stall without firing an error event, defeating
 * automatic fallback).
 */
export function useAudioSource({
  storySlug,
  audioSlug,
  directUrl,
}: UseAudioSourceOptions): UseAudioSourceResult {
  const [useProxiedAudio, setUseProxiedAudio] = useState(isIOSDevice);

  const directAudioSrc = directUrl || null;
  const proxiedAudioSrc = audioSlug
    ? `${API_BASE_URL}/stories/${encodeURIComponent(storySlug || "")}/audios/${encodeURIComponent(audioSlug)}/stream/`
    : null;
  const audioSrc = !useProxiedAudio && directAudioSrc ? directAudioSrc : proxiedAudioSrc;

  useEffect(() => {
    setUseProxiedAudio(isIOSDevice());
  }, [audioSlug]);

  const handleMediaError = () => {
    if (!useProxiedAudio && directAudioSrc) {
      setUseProxiedAudio(true);
      return true;
    }
    return false;
  };

  return {
    audioSrc,
    sourceKey: `${audioSlug ?? ""}:${useProxiedAudio ? "proxy" : "direct"}`,
    usingProxy: useProxiedAudio,
    handleMediaError,
  };
}
