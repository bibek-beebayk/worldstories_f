import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { storyApi } from "@/api/story";
import { loadYouTubeApi } from "@/lib/youtube";
import { trackCompletionOnce } from "@/lib/analytics";
import { markStoryFinishedIfComplete } from "@/lib/storyCompletion";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import type { Video } from "@/api/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface WatchModalProps {
  storySlug: string;
  storyTitle: string;
  videos: Video[];
  initialVideoSlug?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  /** Called after a progress save so the parent can refresh its query. */
  onProgressSaved?: () => void;
}

const resumeKey = (storySlug: string, videoSlug: string) =>
  `worldstories_watch_pos:${storySlug}:${videoSlug}`;

function readLocalResume(storySlug: string, videoSlug: string): number {
  try {
    const raw = window.localStorage.getItem(resumeKey(storySlug, videoSlug));
    return raw ? Math.max(0, Number(raw) || 0) : 0;
  } catch {
    return 0;
  }
}

function writeLocalResume(storySlug: string, videoSlug: string, seconds: number) {
  try {
    window.localStorage.setItem(resumeKey(storySlug, videoSlug), String(Math.round(seconds)));
  } catch {
    // best-effort
  }
}

function buildEmbedSrc(youtubeId: string, startAt: number): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    enablejsapi: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    // Explicitly no autoplay — playback only starts on a user click.
    autoplay: "0",
  });
  if (origin) params.set("origin", origin);
  if (startAt > 2) params.set("start", String(Math.round(startAt)));
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
}

export default function WatchModal({
  storySlug,
  storyTitle,
  videos,
  initialVideoSlug,
  open,
  onOpenChange,
  isAuthenticated,
  onProgressSaved,
}: WatchModalProps) {
  const orderedVideos = useMemo(
    () => [...videos].sort((a, b) => a.order - b.order),
    [videos]
  );

  const [currentSlug, setCurrentSlug] = useState<string>(
    initialVideoSlug || orderedVideos[0]?.slug || ""
  );
  const [isPlaying, setIsPlaying] = useState(false);

  const currentVideo = useMemo(
    () => orderedVideos.find((v) => v.slug === currentSlug) || orderedVideos[0],
    [orderedVideos, currentSlug]
  );

  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef(0);

  // When the dialog opens, honor the requested starting video.
  useEffect(() => {
    if (open && initialVideoSlug) setCurrentSlug(initialVideoSlug);
  }, [open, initialVideoSlug]);

  useContentSessionAnalytics(
    "watching_session",
    open ? { storySlug } : undefined,
    open && isPlaying,
    { format: "video", item_slug: currentVideo?.slug || "" }
  );

  const persistProgress = useCallback(
    (progress: number, position: number, duration: number) => {
      if (!currentVideo) return;
      const slug = currentVideo.slug;
      writeLocalResume(storySlug, slug, position);

      if (isAuthenticated) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          void storyApi
            .saveVideoProgress(storySlug, slug, progress, position, duration)
            .then(() => onProgressSaved?.())
            .catch(() => undefined);
        }, 700);
      }

      if (progress >= 0.995) {
        trackCompletionOnce(storySlug, "video", slug);
        const allFinished = orderedVideos.every((v) => {
          if (v.slug === slug) return true;
          const dur = v.duration_seconds || 0;
          if (!dur) return false;
          return readLocalResume(storySlug, v.slug) / dur >= 0.995;
        });
        markStoryFinishedIfComplete(storySlug, allFinished);
      }
    },
    [currentVideo, storySlug, isAuthenticated, orderedVideos, onProgressSaved]
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== "function") return;
      const position = player.getCurrentTime() || 0;
      const duration = player.getDuration() || 0;
      if (!duration) return;
      const progress = Math.min(1, position / duration);
      if (Math.abs(position - lastSavedRef.current) >= 5) {
        lastSavedRef.current = position;
        persistProgress(progress, position, duration);
      }
    }, 1000);
  }, [persistProgress, stopPolling]);

  const flushCurrentPosition = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.getCurrentTime !== "function" || !currentVideo) return;
    const position = player.getCurrentTime() || 0;
    const duration = player.getDuration() || 0;
    if (!duration) return;
    writeLocalResume(storySlug, currentVideo.slug, position);
    if (isAuthenticated) {
      void storyApi
        .saveVideoProgress(
          storySlug,
          currentVideo.slug,
          Math.min(1, position / duration),
          position,
          duration
        )
        .then(() => onProgressSaved?.())
        .catch(() => undefined);
    }
  }, [currentVideo, storySlug, isAuthenticated, onProgressSaved]);

  const goToVideo = useCallback(
    (slug: string) => {
      flushCurrentPosition();
      setCurrentSlug(slug);
    },
    [flushCurrentPosition]
  );

  // Attach the JS Player API to the already-rendered <iframe> for progress
  // tracking. The <iframe> shows the video on its own even if this never runs
  // (API script blocked, offline, etc.) — tracking just degrades gracefully.
  useEffect(() => {
    if (!open || !currentVideo || !iframeRef.current) return;
    let cancelled = false;
    const iframeEl = iframeRef.current;
    lastSavedRef.current = Math.round(readLocalResume(storySlug, currentVideo.slug));

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !YT?.Player) return;
        playerRef.current = new YT.Player(iframeEl, {
          events: {
            onStateChange: (event: any) => {
              const state = event.data;
              if (state === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                startPolling();
              } else if (state === YT.PlayerState.ENDED) {
                setIsPlaying(false);
                stopPolling();
                const duration =
                  event.target.getDuration() || currentVideo.duration_seconds || 0;
                persistProgress(1, duration, duration);
                const idx = orderedVideos.findIndex((v) => v.slug === currentVideo.slug);
                if (idx >= 0 && idx < orderedVideos.length - 1) {
                  setCurrentSlug(orderedVideos[idx + 1].slug);
                }
              } else {
                setIsPlaying(false);
                stopPolling();
              }
            },
          },
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      stopPolling();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      flushCurrentPosition();
      const player = playerRef.current;
      if (player && typeof player.destroy === "function") {
        try {
          player.destroy();
        } catch {
          // ignore
        }
      }
      playerRef.current = null;
      setIsPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentVideo?.slug]);

  if (!currentVideo) return null;

  const startAt = readLocalResume(storySlug, currentVideo.slug);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">
            {storyTitle}
            {orderedVideos.length > 1 && currentVideo.title
              ? ` · ${currentVideo.title}`
              : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-black">
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            {open && (
              <iframe
                key={currentVideo.slug}
                ref={iframeRef}
                className="absolute inset-0 h-full w-full"
                src={buildEmbedSrc(currentVideo.youtube_id, startAt)}
                title={currentVideo.title || storyTitle}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>
        </div>

        {orderedVideos.length > 1 && (
          <div className="max-h-56 overflow-y-auto border-t">
            {orderedVideos.map((video, index) => {
              const active = video.slug === currentVideo.slug;
              return (
                <button
                  key={video.slug}
                  type="button"
                  onClick={() => goToVideo(video.slug)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60",
                    active && "bg-muted"
                  )}
                >
                  <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  {active ? (
                    <Play className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <span className={cn("flex-1 truncate", active && "font-medium")}>
                    {video.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!isAuthenticated && (
          <p className="px-4 py-2 text-xs text-muted-foreground border-t">
            Log in to track your watch progress across devices.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
