import { useEffect, useRef, useState } from "react";
import { getDecryptedBinary } from "@/hooks/useOfflineDownload";
import { makeDownloadId } from "@/lib/offlineDb";
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
  /** Whether a downloaded, decrypted offline blob is the active source. */
  isOfflineSource: boolean;
  /**
   * Call from the `<audio>` element's error handler. Returns true when it
   * triggered a direct→proxy fallback (the caller should then suppress its
   * error UI and wait for the remount), false when the error is terminal.
   */
  handleMediaError: () => boolean;
}

/**
 * Resolves the media URL for an audio track: the public R2 object URL by
 * default, the controlled range-aware API stream on iOS WebKit (a direct
 * media load there can stall without firing an error event, defeating
 * automatic fallback), or a decrypted offline blob when the device is
 * offline and the track has been downloaded. Owns object-URL cleanup.
 */
export function useAudioSource({
  storySlug,
  audioSlug,
  directUrl,
}: UseAudioSourceOptions): UseAudioSourceResult {
  const [offlineAudioSrc, setOfflineAudioSrc] = useState<string | null>(null);
  const [useProxiedAudio, setUseProxiedAudio] = useState(isIOSDevice);
  const audioObjectUrlRef = useRef<string | null>(null);

  const directAudioSrc = directUrl || null;
  const proxiedAudioSrc = audioSlug
    ? `${API_BASE_URL}/stories/${encodeURIComponent(storySlug || "")}/audios/${encodeURIComponent(audioSlug)}/stream/`
    : null;
  const onlineAudioSrc = !useProxiedAudio && directAudioSrc ? directAudioSrc : proxiedAudioSrc;
  const audioSrc = offlineAudioSrc || onlineAudioSrc;

  useEffect(() => {
    setUseProxiedAudio(isIOSDevice());
  }, [audioSlug]);

  useEffect(() => {
    let cancelled = false;

    const revokePrevious = () => {
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
    };

    const resolveSrc = async () => {
      if (!audioSlug || !storySlug) {
        if (!cancelled) setOfflineAudioSrc(null);
        return;
      }

      if (!navigator.onLine || !directUrl) {
        const buffer = await getDecryptedBinary(
          makeDownloadId(storySlug, "audio", audioSlug)
        ).catch(() => null);
        if (buffer && !cancelled) {
          revokePrevious();
          const objectUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/mpeg" }));
          audioObjectUrlRef.current = objectUrl;
          setOfflineAudioSrc(objectUrl);
          return;
        }
      }

      if (!cancelled) {
        revokePrevious();
        setOfflineAudioSrc(null);
      }
    };

    resolveSrc();
    return () => {
      cancelled = true;
    };
  }, [audioSlug, directUrl, storySlug]);

  useEffect(() => {
    return () => {
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    };
  }, []);

  const handleMediaError = () => {
    if (!offlineAudioSrc && !useProxiedAudio && directAudioSrc) {
      setUseProxiedAudio(true);
      return true;
    }
    return false;
  };

  return {
    audioSrc,
    sourceKey: `${audioSlug ?? ""}:${offlineAudioSrc ? "offline" : useProxiedAudio ? "proxy" : "direct"}`,
    usingProxy: useProxiedAudio,
    isOfflineSource: !!offlineAudioSrc,
    handleMediaError,
  };
}
