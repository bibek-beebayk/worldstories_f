import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ArrowLeft,
  Headphones,
  Loader2,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListMusic,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import AdSpace from "@/components/AdSpace";
import Seo from "@/components/Seo";
import { useStory } from "@/hooks/useStory";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { storyApi } from "@/api/story";
import { getDecryptedBinary } from "@/hooks/useOfflineDownload";
import { makeDownloadId } from "@/lib/offlineDb";
import { queueAudioProgress, saveAudioProgressLocally } from "@/lib/progressSync";
import CoverImage from "@/components/CoverImage";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import { API_BASE_URL } from "@/api/client";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const PLAYLIST_CLOSE_DRAG_DISTANCE = 56;
const AUDIOBOOK_AUTOPLAY_STORAGE_KEY = "audiobook-autoplay";

const isIOSDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const AudioPlayerPage = () => {
  const { story_slug, chapter_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Coming from the Downloads page should return there, not to the story
  // page — the entry point passes this via navigation state (see
  // ProfileDownloadedStory.tsx).
  const backHref = (location.state as { backTo?: string } | null)?.backTo || `/story/${story_slug}`;
  const { data: story, isLoading, isError } = useStory(story_slug);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Keyed by audio slug rather than a single shared timer — with one shared
  // timer, finishing chapter N and moving to chapter N+1 would have the new
  // chapter's very first timeupdate cancel chapter N's still-pending "100%
  // complete" save before it ever fired, permanently losing that chapter's
  // final progress and dragging down the book's overall completion.
  const saveTimersRef = useRef<Record<string, number>>({});
  const restoredAudioSlugRef = useRef<string | null>(null);
  const initiallyPreparedStoryRef = useRef<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(
    () => localStorage.getItem(AUDIOBOOK_AUTOPLAY_STORAGE_KEY) !== "false"
  );
  const playlistDragRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const [liveAudioProgressMap, setLiveAudioProgressMap] = useState<
    Record<string, { progress: number; position_seconds: number; duration_seconds: number }>
  >({});
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const { data: audioProgress } = useQuery({
    queryKey: ["audio-progress", story_slug],
    queryFn: () => storyApi.getAudioProgress(story_slug!),
    enabled: !!story_slug && isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (!story?.audios?.length) return;
    const slugToFind = chapter_slug || story.audios[0].slug;
    const idx = story.audios.findIndex((a) => a.slug === slugToFind);
    setCurrentIndex(idx === -1 ? 0 : idx);
  }, [story, chapter_slug]);

  useEffect(() => {
    restoredAudioSlugRef.current = null;
  }, [currentIndex]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const currentAudio = story?.audios[currentIndex];
  useContentSessionAnalytics("listening_session", story_slug, isPlaying, {
    format: "audio",
    item_slug: currentAudio?.slug || chapter_slug || "",
    playback_rate: playbackRate,
  });

  // Online playback normally uses the public R2 object URL. iOS WebKit uses
  // the controlled, range-aware API stream because a direct media load
  // can stall without producing an error event, preventing automatic fallback.
  const [offlineAudioSrc, setOfflineAudioSrc] = useState<string | null>(null);
  const [useProxiedAudio, setUseProxiedAudio] = useState(isIOSDevice);
  const audioObjectUrlRef = useRef<string | null>(null);
  const directAudioSrc = currentAudio?.audio_file?.toString() || null;
  const proxiedAudioSrc = currentAudio
    ? `${API_BASE_URL}/stories/${encodeURIComponent(story_slug || "")}/audios/${encodeURIComponent(currentAudio.slug)}/stream/`
    : null;
  const onlineAudioSrc = !useProxiedAudio && directAudioSrc ? directAudioSrc : proxiedAudioSrc;
  const audioSrc = offlineAudioSrc || onlineAudioSrc;

  useEffect(() => {
    setUseProxiedAudio(isIOSDevice());
  }, [currentAudio?.slug]);

  useEffect(() => {
    let cancelled = false;

    const revokePrevious = () => {
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
    };

    const resolveSrc = async () => {
      if (!currentAudio || !story_slug) {
        if (!cancelled) setOfflineAudioSrc(null);
        return;
      }

      if (!navigator.onLine) {
        const buffer = await getDecryptedBinary(
          makeDownloadId(story_slug, "audio", currentAudio.slug)
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
  }, [currentAudio, story_slug]);

  // The <audio> element below is keyed on the chapter slug, so React mounts
  // a brand-new DOM node per chapter rather than mutating the src of an
  // existing one — browsers don't reliably resume/re-trigger playback on an
  // in-place src change, which was the actual cause of a nasty earlier bug
  // (a "stuck" element reporting a spurious `ended` and cascading through
  // the entire playlist instead of playing anything). A fresh element still
  // needs an explicit play() once it's mounted, though — there's no
  // autoplay attribute — so this effect does that and reflects the *real*
  // outcome: iOS in particular routinely blocks it outright, in which case
  // this leaves the UI on Play rather than pretending playback started.
  useEffect(() => {
    if (!audioSrc) return;
    setPlaybackError(null);
    setIsAudioLoading(true);
    const audioEl = audioRef.current;
    if (!audioEl) return;

    // The initial unmuted play() is not permitted on iOS once navigation and
    // data loading have consumed the original tap activation. Let metadata
    // prepare, then expose the Play button for a fresh, valid user gesture.
    if (isIOSDevice() && initiallyPreparedStoryRef.current !== story_slug) {
      initiallyPreparedStoryRef.current = story_slug || null;
      setIsPlaying(false);
      return;
    }

    audioEl
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        // Expected on iOS: unmuted playback must begin directly from a tap.
        // Return to a usable Play button instead of leaving the UI locked on
        // a disabled loading spinner forever.
        setIsPlaying(false);
        setIsAudioLoading(false);
      });
  }, [audioSrc, story_slug]);

  useEffect(() => {
    if (!isAudioLoading) return;
    const timeout = window.setTimeout(() => {
      // Some WebKit media states produce neither canplay nor error. Never
      // leave the manual Play action hidden behind an endless spinner.
      setIsAudioLoading(false);
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [audioSrc, isAudioLoading]);

  useEffect(() => {
    return () => {
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerContainerRef.current);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    localStorage.setItem(AUDIOBOOK_AUTOPLAY_STORAGE_KEY, String(autoplayEnabled));
  }, [autoplayEnabled]);

  const audioProgressMap = useMemo(() => {
    const map: Record<
      string,
      { progress: number; position_seconds: number; duration_seconds: number }
    > = {};
    (audioProgress?.audio_progresses || []).forEach((item) => {
      map[item.audio_slug] = item;
    });
    return map;
  }, [audioProgress]);

  useEffect(() => {
    setLiveAudioProgressMap(audioProgressMap);
  }, [audioProgressMap]);

  const persistAudioProgress = (
    audioSlug: string,
    progress: number,
    positionSeconds: number,
    durationSeconds: number
  ) => {
    if (!story_slug) return;
    const normalizedProgress = Math.min(1, Math.max(0, progress));
    const normalizedPosition = Math.max(0, positionSeconds);
    const normalizedDuration = Math.max(0, durationSeconds);
    saveAudioProgressLocally(story_slug, audioSlug, normalizedProgress, normalizedPosition, normalizedDuration);
    if (isAuthenticated) {
      storyApi
        .saveAudioProgress(story_slug, audioSlug, normalizedProgress, normalizedPosition, normalizedDuration)
        .catch(() =>
          queueAudioProgress(story_slug, audioSlug, normalizedProgress, normalizedPosition, normalizedDuration)
        );
    }
  };

  const queueSaveAudioProgress = (
    audioSlug: string,
    progress: number,
    positionSeconds: number,
    durationSeconds: number
  ) => {
    if (!story_slug) return;

    const existingTimer = saveTimersRef.current[audioSlug];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    saveTimersRef.current[audioSlug] = window.setTimeout(() => {
      delete saveTimersRef.current[audioSlug];
      persistAudioProgress(audioSlug, progress, positionSeconds, durationSeconds);
    }, 700);
  };

  const jumpToAudio = (targetIndex: number) => {
    if (!story || targetIndex < 0 || targetIndex >= story.audios.length) return;
    const target = story.audios[targetIndex];
    setCurrentIndex(targetIndex);
    navigate(`/listen/${story_slug}/${target.slug}`, { state: location.state });
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

  // isPlaying itself isn't set here — the audioSrc-change effect above
  // handles the actual play() attempt (and whether it succeeded) once the
  // chapter switch lands, so this doesn't optimistically claim success
  // before it's known.
  const playNext = () => {
    if (!story) return;
    if (currentIndex < story.audios.length - 1) {
      jumpToAudio(currentIndex + 1);
    }
  };

  const playPrev = () => {
    if (currentIndex > 0) {
      jumpToAudio(currentIndex - 1);
    }
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

  const cyclePlaybackRate = () => {
    const nextRate = SPEED_OPTIONS[(SPEED_OPTIONS.indexOf(playbackRate) + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  // iPhone Safari cannot fullscreen arbitrary elements, so the state also
  // drives a fixed full-viewport layout. Supporting browsers additionally
  // use the native API to hide their browser chrome where possible.
  const toggleFullscreen = async () => {
    const next = !isFullscreen;
    setPlaylistOpen(false);
    setIsFullscreen(next);

    try {
      if (next && document.fullscreenEnabled && playerContainerRef.current) {
        await playerContainerRef.current.requestFullscreen();
      } else if (!next && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // The CSS full-viewport mode remains active when the native API is not
      // available or the browser rejects the request.
    }
  };

  const formatTime = (rawSeconds: number) => {
    const safe = Number.isFinite(rawSeconds) ? Math.max(0, Math.floor(rawSeconds)) : 0;
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) return <FullScreenLoader />;
  if (isError || !story) return <div>Error loading audio.</div>;

  const currentAudioLiveProgress = currentAudio?.slug
    ? liveAudioProgressMap[currentAudio.slug]?.progress || 0
    : 0;
  const currentAudioCompletion = Math.round(currentAudioLiveProgress * 100);
  const overallAudioProgress =
    story.audios.length > 0
      ? story.audios.reduce((sum, audio) => sum + (liveAudioProgressMap[audio.slug]?.progress || 0), 0) /
        story.audios.length
      : 0;
  const overallAudioCompletion = Math.round(overallAudioProgress * 100);

  const startPlaylistCloseGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;

    playlistDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishPlaylistCloseGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = playlistDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distanceX = Math.abs(event.clientX - drag.startX);
    const distanceY = event.clientY - drag.startY;
    playlistDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (distanceY >= PLAYLIST_CLOSE_DRAG_DISTANCE && distanceY > distanceX) {
      setPlaylistOpen(false);
    }
  };

  const cancelPlaylistCloseGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (playlistDragRef.current?.pointerId === event.pointerId) {
      playlistDragRef.current = null;
    }
  };

  const renderPlaylistItems = (onSelect?: () => void, compact = false) => {
    if (story.audios.length === 0) {
      return <p className="p-4 text-sm text-muted-foreground">No audio available.</p>;
    }

    return story.audios.map((audio, index) => {
      const saved = liveAudioProgressMap[audio.slug];
      const completed = Math.round((saved?.progress || 0) * 100);
      const isActive = index === currentIndex;

      if (compact) {
        return (
          <Link
            to={`/listen/${story_slug}/${audio.slug}`}
            key={audio.slug}
            className="block"
            onClick={onSelect}
          >
            <div
              className={`flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-white/10 ${
                isActive ? "bg-primary/10" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Headphones
                  className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Ch {audio.order}
                  </p>
                  <h3 className="truncate text-sm font-medium">{audio.title}</h3>
                </div>
              </div>

              {isAuthenticated && (
                <span
                  className={`shrink-0 text-xs font-medium ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isActive ? "Now Playing" : `${completed}%`}
                </span>
              )}
            </div>
            {index < story.audios.length - 1 && <Separator className="bg-border/50" />}
          </Link>
        );
      }

      return (
        <Link
          to={`/listen/${story_slug}/${audio.slug}`}
          state={location.state}
          key={audio.slug}
          className="block"
          onClick={onSelect}
        >
          <div className={`p-4 transition-colors hover:bg-muted/50 ${isActive ? "bg-primary/5" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">CHAPTER {audio.order}</p>
                <h3 className="mt-1 line-clamp-2 break-words font-medium">{audio.title}</h3>
              </div>
              <Headphones
                className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>

            {isAuthenticated && (
              <>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{completed}% complete</span>
                  {isActive && <span className="text-primary">Now Playing</span>}
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completed}%` }}
                  />
                </div>
              </>
            )}
          </div>
          {index < story.audios.length - 1 && <Separator />}
        </Link>
      );
    });
  };

  return (
    <div
      ref={playerContainerRef}
      className={`${
        isFullscreen
          ? "fixed inset-0 z-[200] h-[100dvh] overflow-y-auto bg-background"
          : "min-h-screen"
      } bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]`}
    >
      <Seo
        title={`${currentAudio?.title ? `${currentAudio.title} — ` : ""}${story.title} Audiobook | WorldStories`}
        description={`Listen to ${story.title} on WorldStories.`}
        path={`/listen/${story_slug}/${chapter_slug}`}
        noIndex
      />
      <main
        className={
          isFullscreen
            ? "min-h-[100dvh] w-full"
            : "container mx-auto px-3 py-4 sm:px-4 sm:py-8"
        }
      >
        {!isFullscreen && (
          <Link to={backHref} className="mb-4 inline-block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to story
            </Button>
          </Link>
        )}

        <div
          className={
            isFullscreen
              ? "grid min-h-[100dvh] w-full grid-cols-1"
              : "grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.55fr_1fr]"
          }
        >
        <section className={isFullscreen ? "min-h-[100dvh] w-full" : "space-y-4 sm:space-y-6"}>
            <Card
              className={`relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white ${
                isFullscreen ? "min-h-[100dvh] w-full rounded-none shadow-none" : "shadow-xl"
              }`}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full border border-white/20 bg-black/25 text-white backdrop-blur hover:bg-black/40 hover:text-white"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>

              {isAudioLoading && (
                <div
                  role="status"
                  aria-live="polite"
                  className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/20 bg-slate-950/85 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-md"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                  <span>Preparing audio…</span>
                </div>
              )}

              <CardContent
                className={
                  isFullscreen
                    ? "flex min-h-[100dvh] flex-col items-center justify-center gap-5 p-5 sm:flex-row sm:gap-10 sm:p-10 lg:px-[10vw]"
                    : "flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6"
                }
              >
                <div
                  className={`relative shrink-0 overflow-hidden rounded-xl shadow-lg ${
                    isFullscreen ? "w-44 sm:w-72 lg:w-80" : "w-40 sm:w-56"
                  }`}
                >
                  <CoverImage
                    src={story.cover_image}
                    alt={story.title}
                    author={story.author?.name}
                    className="block h-auto w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className={`w-full min-w-0 space-y-4 ${isFullscreen ? "max-w-2xl" : ""}`}>
                  <div className="text-center sm:text-left">
                    <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                      {story.title}
                    </h1>
                    <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <Badge variant="outline" className="border-white/20 bg-white/10 text-slate-200">
                        {story.story_type}
                      </Badge>
                      <Badge variant="outline" className="border-white/20 bg-white/10 text-slate-200">
                        {story.audios.length} tracks
                      </Badge>
                    </div>
                  </div>

                  <div className="text-center sm:text-left">
                    <p className="text-xs uppercase tracking-wide text-cyan-200">
                      Chapter {currentAudio?.order ?? ""}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-xl font-semibold leading-tight sm:text-2xl">
                      {currentAudio?.title || "No chapter selected"}
                    </h2>
                  </div>

                  {/* Scrubber */}
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min={0}
                      max={durationSeconds || 0}
                      step={0.1}
                      value={Math.min(currentTimeSeconds, durationSeconds || 0)}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (audioRef.current) audioRef.current.currentTime = value;
                        setCurrentTimeSeconds(value);
                      }}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-cyan-300"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>{formatTime(currentTimeSeconds)}</span>
                      <span>{formatTime(durationSeconds)}</span>
                    </div>
                  </div>

                  {/* Transport controls */}
                  <div className="flex items-center justify-center gap-2 sm:justify-start sm:gap-3">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={playPrev}
                      disabled={currentIndex === 0}
                      aria-label="Previous chapter"
                      className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => skip(-15)}
                      aria-label="Rewind 15 seconds"
                      className="relative h-9 w-9 rounded-full bg-white/15 hover:bg-white/25"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
                        15
                      </span>
                    </Button>

                    <Button
                      onClick={togglePlay}
                      size="icon"
                      aria-label={isAudioLoading ? "Loading audio — tap to play" : isPlaying ? "Pause" : "Play"}
                      className="h-14 w-14 rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300"
                    >
                      {isAudioLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => skip(15)}
                      aria-label="Forward 15 seconds"
                      className="relative h-9 w-9 rounded-full bg-white/15 hover:bg-white/25"
                    >
                      <RotateCw className="h-4 w-4" />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
                        15
                      </span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={playNext}
                      disabled={currentIndex === story.audios.length - 1}
                      aria-label="Next chapter"
                      className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {playbackError && (
                    <p role="alert" className="text-center text-sm text-rose-200 sm:text-left">
                      {playbackError}
                    </p>
                  )}

                  {currentAudio && audioSrc && (
                    <audio
                      key={`${currentAudio.slug}:${useProxiedAudio ? "proxy" : "direct"}`}
                      ref={audioRef}
                      src={audioSrc}
                      className="hidden"
                      preload="metadata"
                      playsInline
                      onLoadStart={() => setIsAudioLoading(true)}
                      onLoadedMetadata={() => {
                          setIsAudioLoading(false);
                          if (audioRef.current) {
                            setDurationSeconds(audioRef.current.duration || 0);
                            audioRef.current.playbackRate = playbackRate;
                          }
                          if (!isAuthenticated) return;
                          if (!currentAudio?.slug) return;
                          if (restoredAudioSlugRef.current === currentAudio.slug) return;

                          const saved = liveAudioProgressMap[currentAudio.slug];
                          if (saved && saved.position_seconds > 0 && audioRef.current) {
                            const duration = Number.isFinite(audioRef.current.duration)
                              ? audioRef.current.duration
                              : 0;
                            const maxSafe = duration > 1 ? duration - 0.5 : duration;
                            audioRef.current.currentTime = Math.min(saved.position_seconds, maxSafe);
                          }
                          restoredAudioSlugRef.current = currentAudio.slug;
                        }}
                        onTimeUpdate={() => {
                          if (audioRef.current) {
                            setCurrentTimeSeconds(audioRef.current.currentTime || 0);
                            setDurationSeconds(audioRef.current.duration || 0);
                          }
                          if (!audioRef.current || !currentAudio?.slug) return;
                          const duration = audioRef.current.duration || 0;
                          const position = audioRef.current.currentTime || 0;
                          const progress = duration > 0 ? position / duration : 0;
                          setLiveAudioProgressMap((prev) => ({
                            ...prev,
                            [currentAudio.slug]: {
                              progress,
                              position_seconds: position,
                              duration_seconds: duration,
                            },
                          }));
                          queueSaveAudioProgress(currentAudio.slug, progress, position, duration);
                        }}
                        onEnded={() => {
                          if (isAuthenticated && currentAudio?.slug && audioRef.current) {
                            const duration = audioRef.current.duration || 0;
                            setLiveAudioProgressMap((prev) => ({
                              ...prev,
                              [currentAudio.slug]: {
                                progress: 1,
                                position_seconds: duration,
                                duration_seconds: duration,
                              },
                            }));
                            persistAudioProgress(currentAudio.slug, 1, duration, duration);
                          }
                          setIsPlaying(false);
                          if (autoplayEnabled) {
                            playNext();
                          }
                        }}
                        onPlay={() => {
                          setPlaybackError(null);
                          setIsAudioLoading(false);
                          setIsPlaying(true);
                        }}
                        onPause={() => setIsPlaying(false)}
                        onCanPlay={() => setIsAudioLoading(false)}
                        onPlaying={() => setIsAudioLoading(false)}
                        onWaiting={() => setIsAudioLoading(true)}
                        onError={(event) => {
                          setIsPlaying(false);
                          setIsAudioLoading(false);
                          if (!offlineAudioSrc && !useProxiedAudio && directAudioSrc) {
                            setPlaybackError(null);
                            setUseProxiedAudio(true);
                            return;
                          }
                          const mediaError = event.currentTarget.error;
                          // Surfacing the real MediaError code/message (rather
                          // than a single generic string) so the actual cause
                          // — network vs decode vs unsupported format vs
                          // aborted — is visible without needing devtools.
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
                        }}
                      />
                  )}

                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={cyclePlaybackRate}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/20"
                    >
                      {playbackRate}×
                    </button>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoplayEnabled}
                      aria-label={`Autoplay ${autoplayEnabled ? "on" : "off"}`}
                      onClick={() => setAutoplayEnabled((enabled) => !enabled)}
                      className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/20"
                    >
                      <span>Autoplay</span>
                      <span
                        aria-hidden="true"
                        className={`relative h-4 w-7 rounded-full transition-colors ${
                          autoplayEnabled ? "bg-cyan-400" : "bg-white/25"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-3 w-3 rounded-full bg-slate-900 transition-transform ${
                            autoplayEnabled ? "translate-x-3.5" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlaylistOpen(true)}
                      className={`items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/20 ${
                        isFullscreen ? "flex" : "flex xl:hidden"
                      }`}
                    >
                      <ListMusic className="h-3.5 w-3.5" />
                      Playlist
                      <span className="rounded-full bg-white/20 px-1.5 text-[10px]">
                        {story.audios.length}
                      </span>
                    </button>

                  </div>

                  {isAuthenticated ? (
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-cyan-200" />
                        Chapter {currentAudioCompletion}%
                      </span>
                      <span>Audiobook {overallAudioCompletion}%</span>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-300 sm:text-left">
                      <button
                        type="button"
                        onClick={openLoginModal}
                        className="text-cyan-300 underline-offset-2 hover:underline"
                      >
                        Login
                      </button>{" "}
                      to track audiobook progress
                    </p>
                  )}

                </div>
              </CardContent>
            </Card>

            {!isFullscreen && (
              <>
                <AdSpace size="banner" />
                <AdSpace size="rectangle" />
              </>
            )}
        </section>

        {/* Desktop/large-screen only: the original persistent playlist sidebar.
            Below xl, the same list is reached via the in-player "Playlist"
            toggle, which opens it as a bottom sheet instead — there isn't
            enough width for a side-by-side sidebar on those screens. */}
        <aside className={isFullscreen ? "hidden" : "hidden xl:block xl:space-y-4"}>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Playlist
                  </h2>
                </div>
                <Badge variant="secondary">{story.audios.length}</Badge>
              </div>

              <div className="max-h-[65vh] overflow-y-auto">{renderPlaylistItems()}</div>
            </CardContent>
          </Card>
        </aside>
        </div>
      </main>

      <Sheet open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <SheetContent
          side="bottom"
          container={isFullscreen ? playerContainerRef.current ?? undefined : undefined}
          className={`max-h-[80vh] flex-col rounded-t-2xl border-white/20 bg-background/90 p-0 backdrop-blur-xl duration-200 data-[state=closed]:duration-150 data-[state=open]:duration-200 supports-[backdrop-filter]:bg-background/75 ${
            isFullscreen ? "flex" : "flex xl:hidden"
          }`}
        >
          <SheetHeader
            className="relative flex-row touch-none select-none items-center justify-between space-y-0 border-b border-white/10 px-3 pb-3 pt-5 pr-12 text-left cursor-grab active:cursor-grabbing"
            onPointerDown={startPlaylistCloseGesture}
            onPointerUp={finishPlaylistCloseGesture}
            onPointerCancel={cancelPlaylistCloseGesture}
          >
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/40"
            />
            <div className="flex items-center gap-2">
              <ListMusic className="h-4 w-4 text-primary" />
              <SheetTitle className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Playlist
              </SheetTitle>
            </div>
            <Badge variant="secondary">{story.audios.length}</Badge>
          </SheetHeader>

          <div className="overflow-y-auto">
            {renderPlaylistItems(() => setPlaylistOpen(false), true)}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AudioPlayerPage;
