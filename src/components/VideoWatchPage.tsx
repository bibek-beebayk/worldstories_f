import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { loadYouTubeApi } from "@/lib/youtube";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import VideoCard from "@/components/VideoCard";
import type { PublicVideoDetail } from "@/api/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const resumeKey = (videoId: number) => `worldstories_watch_pos:video:${videoId}`;

function readLocalResume(videoId: number): number {
  try {
    return Math.max(0, Number(window.localStorage.getItem(resumeKey(videoId))) || 0);
  } catch {
    return 0;
  }
}

function writeLocalResume(videoId: number, seconds: number) {
  try {
    window.localStorage.setItem(resumeKey(videoId), String(Math.round(seconds)));
  } catch {
    // best-effort
  }
}

function buildEmbedSrc(youtubeId: string, startAt: number): string {
  const params = new URLSearchParams({
    enablejsapi: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    autoplay: "0",
  });
  if (typeof window !== "undefined") params.set("origin", window.location.origin);
  if (startAt > 2) params.set("start", String(Math.round(startAt)));
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?${params.toString()}`;
}

export default function VideoWatchPage({ video }: { video: PublicVideoDetail }) {
  const isAuthenticated = useIsLoggedIn();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef(0);

  // Server-side resume point (per video, not per story) for signed-in users.
  const { data: saved, isFetched } = useQuery({
    queryKey: ["watch-progress", video.id],
    queryFn: () => storyApi.getWatchProgress(video.id),
    enabled: isAuthenticated === true,
  });
  const serverPosition = saved && saved.progress < 0.995 ? saved.position_seconds : 0;
  // Don't mount the iframe until the saved position is known, so it starts at
  // the right place instead of reloading.
  const ready = isAuthenticated !== true || isFetched;
  const startRef = useRef<number | null>(null);
  if (ready && startRef.current === null) {
    startRef.current = Math.max(readLocalResume(video.id), serverPosition);
  }

  useContentSessionAnalytics(
    "watching_session",
    { videoId: video.id },
    isPlaying,
    { format: "video", item_slug: video.slug || String(video.id) }
  );

  const save = useCallback(
    (position: number, duration: number) => {
      if (!duration) return;
      writeLocalResume(video.id, position);
      if (isAuthenticated) {
        void storyApi
          .saveWatchProgress(video.id, Math.min(1, position / duration), position, duration)
          .catch(() => undefined);
      }
    },
    [video.id, isAuthenticated]
  );

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  useEffect(() => {
    if (!ready || !iframeRef.current) return;
    let cancelled = false;
    const iframeEl = iframeRef.current;
    lastSavedRef.current = startRef.current ?? 0;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !YT?.Player) return;
        playerRef.current = new YT.Player(iframeEl, {
          events: {
            onStateChange: (event: any) => {
              if (event.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                stopPolling();
                pollRef.current = setInterval(() => {
                  const player = playerRef.current;
                  if (!player || typeof player.getCurrentTime !== "function") return;
                  const position = player.getCurrentTime() || 0;
                  if (Math.abs(position - lastSavedRef.current) >= 5) {
                    lastSavedRef.current = position;
                    save(position, player.getDuration() || 0);
                  }
                }, 1000);
              } else if (event.data === YT.PlayerState.ENDED) {
                setIsPlaying(false);
                stopPolling();
                const duration = event.target.getDuration() || video.duration_seconds || 0;
                save(duration, duration);
                const next = video.suggested[0];
                if (next) navigate(`/watch/${next.id}`);
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
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === "function") {
        save(player.getCurrentTime() || 0, player.getDuration() || 0);
      }
      try {
        player?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
      setIsPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, video.id]);

  const portrait = video.aspect_ratio === "9:16";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto grid gap-6 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="overflow-hidden rounded-lg bg-black">
            <div
              className="relative mx-auto w-full"
              style={{ aspectRatio: portrait ? "9 / 16" : "16 / 9", maxHeight: portrait ? "80vh" : undefined }}
            >
              {ready && (
                <iframe
                  key={video.id}
                  ref={iframeRef}
                  className="absolute inset-0 h-full w-full"
                  src={buildEmbedSrc(video.youtube_id, startRef.current ?? 0)}
                  title={video.title}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              )}
            </div>
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">{video.title}</h1>
          {video.story && (
            <p className="mt-1 text-sm text-muted-foreground">
              From the story{" "}
              <Link to={`/read/${video.story.slug}`} className="font-medium text-primary hover:underline">
                {video.story.title}
              </Link>
            </p>
          )}
          {!isAuthenticated && (
            <p className="mt-3 text-xs text-muted-foreground">Log in to track your watch progress across devices.</p>
          )}
        </div>

        <aside>
          <h2 className="mb-3 text-base font-semibold">Suggested</h2>
          <div className="flex flex-col gap-3">
            {video.suggested.map((item) => (
              <VideoCard key={item.id} video={item} horizontal />
            ))}
            {video.suggested.length === 0 && (
              <p className="text-sm text-muted-foreground">No other videos yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
