import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, BookOpen, ListMusic, Maximize2, Minimize2, Search, X } from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import NotFoundBody from "@/components/NotFoundBody";
import AdSpace from "@/components/AdSpace";
import CoverImage from "@/components/CoverImage";
import { AudiobookCard } from "@/components/audiobooks/AudiobookCard";
import { buildAudiobookMeta, buildAudiobookNotFoundMeta } from "@/lib/audiobookMeta";
import { isAudiobookNotFoundData, loadAudiobookOrRedirect } from "@/lib/audiobookLoader";
import { formatLeft, formatLong } from "@/lib/formatDuration";
import { audiobookUrl, readAlongUrl } from "@/lib/urls";
import { useAudiobook } from "@/hooks/useAudiobooks";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import { useStoryReadingEvents } from "@/hooks/useStoryReadingEvents";
import { useAudioSource } from "@/hooks/audio/useAudioSource";
import { useAudioProgress } from "@/hooks/audio/useAudioProgress";
import { SPEED_OPTIONS, useAudioPlayback } from "@/hooks/audio/useAudioPlayback";
import { useAutoplayPreference } from "@/hooks/audio/useAutoplayPreference";
import { useSleepTimer } from "@/hooks/audio/useSleepTimer";
import { useMediaSession } from "@/hooks/audio/useMediaSession";
import { usePlayerShortcuts } from "@/hooks/audio/usePlayerShortcuts";
import { AudioTimeline } from "@/components/audio/AudioTimeline";
import { AudioTransportControls } from "@/components/audio/AudioTransportControls";
import { AutoplayToggle } from "@/components/audio/AutoplayToggle";
import { AudioLoadingOverlay } from "@/components/audio/AudioLoadingOverlay";
import { AudioErrorMessage } from "@/components/audio/AudioErrorMessage";
import { SpeedPicker } from "@/components/audio/SpeedPicker";
import { SleepTimerControl } from "@/components/audio/SleepTimerControl";
import { ShortcutsPopover } from "@/components/audio/ShortcutsPopover";
import { ChapterRow } from "@/components/audio/ChapterRow";
import { PlayerMiniBar } from "@/components/audio/PlayerMiniBar";
import { ApiError } from "@/api/client";
import type { Route } from "./+types/AudiobookPlayer";

export async function loader({ params }: Route.LoaderArgs) {
  return loadAudiobookOrRedirect(params.story_slug!, params.chapter_slug);
}

// Always noIndex: this is a playback UI; `/listen/:slug` is the canonical audiobook surface.
export function meta({ data: audiobook, params }: Route.MetaArgs) {
  if (!audiobook || isAudiobookNotFoundData(audiobook)) {
    return buildAudiobookNotFoundMeta(params.story_slug);
  }
  return buildAudiobookMeta(audiobook, {
    mode: "player",
    trackSlug: params.chapter_slug,
    noIndex: true,
  });
}

const PLAYLIST_CLOSE_DRAG_DISTANCE = 56;

const AudioPlayerPage = ({ loaderData }: Route.ComponentProps) => {
  const { story_slug, chapter_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNotFound = isAudiobookNotFoundData(loaderData);
  const initialAudiobook = !isNotFound && loaderData ? loaderData : undefined;
  const {
    data: audiobook,
    isLoading,
    isError,
    error,
  } = useAudiobook(isNotFound ? undefined : story_slug, initialAudiobook);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerCardRef = useRef<HTMLDivElement | null>(null);
  const activeDesktopRowRef = useRef<HTMLAnchorElement | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chapterSearch, setChapterSearch] = useState("");
  const [isMainCardVisible, setIsMainCardVisible] = useState(true);
  const [autoplayEnabled, setAutoplayEnabled] = useAutoplayPreference();
  const playlistDragRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  const tracks = useMemo(() => audiobook?.tracks ?? [], [audiobook?.tracks]);

  useEffect(() => {
    if (!tracks.length) return;
    const slugToFind = chapter_slug || tracks[0].slug;
    const idx = tracks.findIndex((a) => a.slug === slugToFind || String(a.order) === slugToFind);
    setCurrentIndex(idx === -1 ? 0 : idx);
  }, [tracks, chapter_slug]);

  const currentAudio = tracks[currentIndex];
  const activeSlug = audiobook?.slug || story_slug || "";
  const linkedStorySlug = audiobook?.story?.slug;

  const backHref =
    (location.state as { backTo?: string } | null)?.backTo ||
    (linkedStorySlug ? `/story/${linkedStorySlug}` : audiobookUrl(activeSlug));

  const jumpToAudio = useCallback(
    (targetIndex: number) => {
      if (!audiobook || targetIndex < 0 || targetIndex >= tracks.length) return;
      const target = tracks[targetIndex];
      setCurrentIndex(targetIndex);
      navigate(audiobookUrl(audiobook.slug, target.slug), { state: location.state });
    },
    [audiobook, tracks, navigate, location.state],
  );

  const playNext = useCallback(() => {
    if (currentIndex < tracks.length - 1) {
      jumpToAudio(currentIndex + 1);
    }
  }, [tracks.length, currentIndex, jumpToAudio]);

  const playPrev = useCallback(() => {
    if (currentIndex > 0) {
      jumpToAudio(currentIndex - 1);
    }
  }, [currentIndex, jumpToAudio]);

  const source = useAudioSource({
    audiobookSlug: audiobook?.slug,
    storySlug: linkedStorySlug,
    audioSlug: currentAudio?.slug,
    directUrl: currentAudio?.audio_file?.toString() || null,
  });

  const progress = useAudioProgress({
    audiobookSlug: audiobook?.slug,
    storySlug: linkedStorySlug,
    audios: tracks,
    isAuthenticated,
    currentAudioSlug: currentAudio?.slug,
  });

  // Ref bridge so useAudioPlayback's onEnded always reads the latest sleep timer state.
  const sleepTimerRef = useRef<{ stopAtChapterEnd: boolean; cancel: () => void }>({
    stopAtChapterEnd: false,
    cancel: () => {},
  });

  const player = useAudioPlayback({
    audioSrc: source.audioSrc,
    storySlug: activeSlug,
    onLoadedMetadata: progress.handleLoadedMetadata,
    onTimeUpdate: progress.handleTimeUpdate,
    onEnded: (el) => {
      progress.handleEnded(el);
      if (sleepTimerRef.current.stopAtChapterEnd) {
        sleepTimerRef.current.cancel();
        return;
      }
      if (autoplayEnabled) playNext();
    },
    onMediaError: source.handleMediaError,
  });

  const sleepTimer = useSleepTimer({
    onPause: () => player.pause(),
    getAudioEl: () => player.audioRef.current,
  });

  useEffect(() => {
    sleepTimerRef.current = {
      stopAtChapterEnd: sleepTimer.stopAtChapterEnd,
      cancel: sleepTimer.cancel,
    };
  }, [sleepTimer.stopAtChapterEnd, sleepTimer.cancel]);

  const liveAudioProgressMap = progress.liveProgressMap;

  const overallListeningProgress = useMemo(() => {
    if (tracks.length === 0) return 0;
    const total = tracks.reduce(
      (sum, audio) => sum + Math.min(1, Math.max(0, liveAudioProgressMap[audio.slug]?.progress || 0)),
      0,
    );
    return total / tracks.length;
  }, [tracks, liveAudioProgressMap]);

  useStoryReadingEvents({
    storySlug: linkedStorySlug,
    format: "audio",
    progress: overallListeningProgress,
    ready: Boolean(linkedStorySlug) && progress.progressDataReady && tracks.length > 0,
  });

  useContentSessionAnalytics(
    "listening_session",
    linkedStorySlug ? { storySlug: linkedStorySlug } : undefined,
    player.isPlaying,
    {
      format: "audio",
      item_slug: currentAudio?.slug || chapter_slug || "",
      playback_rate: player.playbackRate,
    },
  );

  // Lock-screen / OS media controls
  useMediaSession({
    title: currentAudio?.title || audiobook?.title || "Audiobook",
    artist: audiobook?.author || audiobook?.narrator || "",
    album: audiobook?.title || "",
    artwork: audiobook?.cover_image || null,
    isPlaying: player.isPlaying,
    currentTime: player.currentTime,
    duration: player.duration,
    playbackRate: player.playbackRate,
    onPlay: player.play,
    onPause: player.pause,
    onPrevious: currentIndex > 0 ? playPrev : undefined,
    onNext: currentIndex < tracks.length - 1 ? playNext : undefined,
    onSeekBackward: () => player.skip(-15),
    onSeekForward: () => player.skip(15),
    onSeekTo: player.seek,
  });

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

  const toggleFullscreen = useCallback(async () => {
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
      // CSS full-viewport mode remains active.
    }
  }, [isFullscreen]);

  // Keyboard shortcuts
  usePlayerShortcuts({
    togglePlay: player.togglePlay,
    seekBack: () => player.skip(-15),
    seekForward: () => player.skip(15),
    prev: playPrev,
    next: playNext,
    speedUp: () => {
      const idx = SPEED_OPTIONS.indexOf(player.playbackRate);
      const nextIdx = idx === -1 ? 1 : Math.min(SPEED_OPTIONS.length - 1, idx + 1);
      player.setPlaybackRate(SPEED_OPTIONS[nextIdx]);
    },
    speedDown: () => {
      const idx = SPEED_OPTIONS.indexOf(player.playbackRate);
      const nextIdx = idx === -1 ? 0 : Math.max(0, idx - 1);
      player.setPlaybackRate(SPEED_OPTIONS[nextIdx]);
    },
    toggleMute: () => {
      if (player.audioRef.current) {
        player.audioRef.current.muted = !player.audioRef.current.muted;
      }
    },
    toggleFullscreen: () => {
      void toggleFullscreen();
    },
  });

  // Mini-player visibility observer on the main player card
  useEffect(() => {
    const cardEl = playerCardRef.current;
    if (!cardEl || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        setIsMainCardVisible(entries[0]?.isIntersecting ?? true);
      },
      { threshold: 0 },
    );
    observer.observe(cardEl);
    return () => observer.disconnect();
  }, [audiobook?.slug]);

  // Scroll active chapter row into view inside the desktop sidebar container
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    activeDesktopRowRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [currentIndex, audiobook?.slug]);

  // Remaining audiobook duration (only shown when every chapter has a known duration)
  const bookRemainingText = useMemo(() => {
    if (tracks.length === 0) return "";
    if (!tracks.every((a) => typeof a.duration_seconds === "number" && a.duration_seconds > 0)) {
      return "";
    }
    let remainingSec = 0;
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      const dur = track.duration_seconds as number;
      if (i === currentIndex) {
        const currentDur = player.duration > 0 ? player.duration : dur;
        remainingSec += Math.max(0, currentDur - player.currentTime);
      } else {
        const p = Math.min(1, Math.max(0, liveAudioProgressMap[track.slug]?.progress || 0));
        remainingSec += (1 - p) * dur;
      }
    }
    return formatLong(remainingSec);
  }, [tracks, currentIndex, player.duration, player.currentTime, liveAudioProgressMap]);

  const filteredAudios = useMemo(() => {
    const q = chapterSearch.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((a) => a.title.toLowerCase().includes(q) || String(a.order).includes(q));
  }, [tracks, chapterSearch]);

  if (isNotFound) return <NotFoundBody />;
  if (isLoading) return <FullScreenLoader />;
  if (!audiobook && error instanceof ApiError && error.status === 404) return <NotFoundBody />;
  if (isError || !audiobook)
    return <div className="p-6 text-center text-sm text-muted-foreground">Error loading audio.</div>;

  const overallAudioCompletion = Math.round(overallListeningProgress * 100);
  const chapterRemainingLabel =
    player.duration > 0 ? formatLeft(Math.max(0, player.duration - player.currentTime)) : undefined;
  const showMiniBar = !isMainCardVisible && !isFullscreen && Boolean(currentAudio);
  const showChapterSearch = tracks.length > 10;
  const authorAndNarrator = [audiobook.author, audiobook.narrator ? `Narrated by ${audiobook.narrator}` : null]
    .filter(Boolean)
    .join(" · ");

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

  const renderChapterRows = (isDesktop: boolean, onSelect?: () => void) => {
    if (tracks.length === 0) {
      return <p className="p-4 text-sm text-muted-foreground">No audio available.</p>;
    }
    if (filteredAudios.length === 0) {
      return <p className="p-6 text-center text-sm text-muted-foreground">No chapters match</p>;
    }

    return filteredAudios.map((audio) => {
      const isActive = audio.slug === currentAudio?.slug;
      const savedProgress = isAuthenticated ? (liveAudioProgressMap[audio.slug]?.progress ?? 0) : null;
      return (
        <ChapterRow
          key={audio.slug}
          ref={isDesktop && isActive ? activeDesktopRowRef : undefined}
          storySlug={audiobook.slug}
          audio={audio}
          isActive={isActive}
          isPlaying={player.isPlaying}
          progress={savedProgress}
          linkState={location.state}
          onSelect={onSelect}
        />
      );
    });
  };

  return (
    <div
      ref={playerContainerRef}
      className={`${
        isFullscreen
          ? "fixed inset-0 z-[200] h-[100dvh] overflow-y-auto scrollbar-thin bg-[#1B1220]"
          : `min-h-screen overflow-x-clip bg-background ${showMiniBar ? "pb-20" : ""}`
      }`}
    >
      <main className={isFullscreen ? "min-h-[100dvh] w-full" : "container mx-auto px-3 py-4 sm:px-4 sm:py-8"}>
        {!isFullscreen && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link to={backHref} className="inline-block">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                {linkedStorySlug ? "Back to story" : "Back to audiobook"}
              </Button>
            </Link>
            {linkedStorySlug && (
              <Link to={`/story/${linkedStorySlug}`} className="inline-block">
                <Button variant="ghost" size="sm">
                  <BookOpen className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Read the story
                </Button>
              </Link>
            )}
          </div>
        )}

        <div
          className={
            isFullscreen
              ? "grid min-h-[100dvh] w-full grid-cols-1"
              : "grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-[1.55fr_1fr]"
          }
        >
          <section className={isFullscreen ? "min-h-[100dvh] w-full" : "space-y-4 sm:space-y-6"}>
            <div ref={playerCardRef}>
              <Card
                className={`relative overflow-hidden border-0 bg-[linear-gradient(140deg,#2E1623,#1B1220_70%)] text-white ${
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
                  className="absolute right-3 top-3 z-10 h-11 w-11 rounded-full border border-white/[0.28] bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF8FA3] sm:h-9 sm:w-9"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>

                {player.isLoading && <AudioLoadingOverlay />}

                <CardContent
                  className={
                    isFullscreen
                      ? "flex min-h-[100dvh] flex-col items-center justify-center gap-6 p-5 sm:flex-row sm:gap-10 sm:p-10 lg:px-[10vw]"
                      : "flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6"
                  }
                >
                  <div
                    className={`relative shrink-0 overflow-hidden rounded-xl shadow-lg ${
                      isFullscreen ? "w-44 sm:w-72 lg:w-80" : "w-[170px] sm:w-[210px]"
                    }`}
                  >
                    <CoverImage
                      src={audiobook.cover_image}
                      alt={audiobook.title}
                      author={audiobook.author}
                      className="block aspect-[3/4] h-auto w-full object-cover"
                    />
                  </div>

                  <div className={`w-full min-w-0 space-y-4 ${isFullscreen ? "max-w-2xl" : ""}`}>
                    <div className="text-center sm:pr-10 sm:text-left">
                      <h1 className="font-serif line-clamp-2 text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">
                        {audiobook.title}
                      </h1>
                      {authorAndNarrator && <p className="mt-1 text-sm text-[#D9C9D1]">{authorAndNarrator}</p>}
                    </div>

                    <div className="text-center sm:text-left">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8FA3]">
                        CHAPTER {currentAudio?.order ?? currentIndex + 1} OF {tracks.length}
                      </p>
                      <h2 className="mt-1 line-clamp-2 text-[22px] font-semibold leading-snug text-white">
                        {currentAudio?.title || "No chapter selected"}
                      </h2>
                    </div>

                    {/* Scrubber */}
                    <AudioTimeline
                      currentTime={player.currentTime}
                      duration={player.duration}
                      onSeek={player.seek}
                      middleLabel={chapterRemainingLabel}
                    />

                    {/* Transport controls */}
                    <AudioTransportControls
                      isPlaying={player.isPlaying}
                      isLoading={player.isLoading}
                      onTogglePlay={player.togglePlay}
                      onSkip={player.skip}
                      onPrev={playPrev}
                      onNext={playNext}
                      hasPrev={currentIndex > 0}
                      hasNext={currentIndex < tracks.length - 1}
                      prevLabel="Previous chapter"
                      nextLabel="Next chapter"
                      buttonClassName="h-11 w-11 sm:h-12 sm:w-12 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#FF8FA3]"
                      playButtonClassName="h-[68px] w-[68px] sm:h-[72px] sm:w-[72px] bg-[#D92F4C] text-white hover:bg-[#b8213e] focus-visible:ring-2 focus-visible:ring-[#FF8FA3]"
                    />

                    <AudioErrorMessage message={player.error} />

                    {currentAudio && source.audioSrc && (
                      <audio
                        key={source.sourceKey}
                        ref={player.audioRef}
                        src={source.audioSrc}
                        {...player.audioElementProps}
                      />
                    )}

                    {/* Single chip row */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                      <SpeedPicker rate={player.playbackRate} onSelect={player.setPlaybackRate} />

                      <SleepTimerControl
                        mode={sleepTimer.mode}
                        remainingSeconds={sleepTimer.remainingSeconds}
                        onStartMinutes={sleepTimer.start}
                        onStartEndOfChapter={sleepTimer.startEndOfChapter}
                        onCancel={sleepTimer.cancel}
                      />

                      <AutoplayToggle
                        enabled={autoplayEnabled}
                        onToggle={() => setAutoplayEnabled((enabled) => !enabled)}
                        className="min-h-[44px] shrink-0 sm:min-h-[36px]"
                      />

                      {currentAudio?.read_along_available && (
                        <Link
                          to={readAlongUrl(audiobook.slug, currentAudio.slug)}
                          className="inline-flex min-h-[44px] shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-white/[0.28] bg-white/10 px-3.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3] sm:min-h-[36px] sm:px-3"
                        >
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Read along</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => setPlaylistOpen(true)}
                        aria-label={`Open chapters list (${tracks.length})`}
                        className={`min-h-[44px] shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-white/[0.28] bg-white/10 px-3.5 text-xs font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3] sm:min-h-[36px] sm:px-3 ${
                          isFullscreen ? "inline-flex" : "inline-flex xl:hidden"
                        }`}
                      >
                        <ListMusic className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Chapters</span>
                        <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">
                          {tracks.length}
                        </span>
                      </button>

                      <ShortcutsPopover className="lg:ml-auto" />
                    </div>

                    {/* Book progress divider */}
                    <div className="border-t border-white/15 pt-3.5">
                      {isAuthenticated ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-[#D9C9D1]">
                            <span>
                              Audiobook {overallAudioCompletion}%
                              {bookRemainingText ? ` · about ${bookRemainingText} left` : ""}
                            </span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                            <div
                              className="h-full rounded-full bg-[#FF5C7A] transition-[width] duration-300 motion-reduce:transition-none"
                              style={{ width: `${overallAudioCompletion}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-xs text-[#D9C9D1] sm:text-left">
                          <button
                            type="button"
                            onClick={openLoginModal}
                            className="font-medium text-[#FF8FA3] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8FA3]"
                          >
                            Login
                          </button>{" "}
                          to track audiobook progress
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {!isFullscreen && currentAudio?.read_along_available && (
              <Card className="border-rose-200/80 bg-[#FDECEF]/60 dark:border-rose-900/50 dark:bg-rose-950/20">
                <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="space-y-1">
                    <h2 className="font-serif text-base font-bold text-foreground">Follow the text as it plays</h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      This chapter has a read-along. Words highlight in time with the narrator.
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="min-h-[44px] shrink-0 bg-[#D92F4C] text-white hover:bg-[#b8213e] sm:min-h-[36px]"
                  >
                    <Link to={readAlongUrl(audiobook.slug, currentAudio.slug)}>
                      <BookOpen className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Open read-along
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Standalone details: narrator, about, genres */}
            {!isFullscreen && !linkedStorySlug && (audiobook.about || audiobook.genres.length > 0) && (
              <Card>
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <h2 className="font-serif text-base font-bold text-foreground">About this audiobook</h2>
                  {audiobook.about && (
                    <p className="text-sm leading-relaxed text-muted-foreground">{audiobook.about}</p>
                  )}
                  {audiobook.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {audiobook.genres.map((genre) => (
                        <Badge key={genre} variant="secondary">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Other versions (same story, other narrators) */}
            {!isFullscreen && audiobook.other_versions.length > 0 && (
              <Card>
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <h2 className="font-serif text-base font-bold text-foreground">Other versions</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {audiobook.other_versions.map((ver) => (
                      <Link
                        key={ver.slug}
                        to={audiobookUrl(ver.slug)}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{ver.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ver.narrator ? `Narrated by ${ver.narrator}` : "Alternate recording"}
                          </p>
                        </div>
                        {ver.total_duration_seconds && (
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatLong(ver.total_duration_seconds)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* You may also like */}
            {!isFullscreen &&
              (audiobook.series_context ?? [])
                .filter((ctx) => ctx.audiobooks.length > 0)
                .map((ctx) => (
                  <section key={ctx.id} className="space-y-3 pt-2">
                    <h2 className="font-serif text-lg font-bold text-foreground">More in {ctx.title}</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {ctx.audiobooks.slice(0, 6).map((item) => (
                        <AudiobookCard key={item.id} audiobook={item} />
                      ))}
                    </div>
                  </section>
                ))}

            {!isFullscreen &&
              (audiobook.series_context ?? [])
                .filter((ctx) => ctx.audiobooks.length > 0)
                .map((ctx) => (
                  <section key={ctx.id} className="space-y-3 pt-2">
                    <h2 className="font-serif text-lg font-bold text-foreground">
                      More in {ctx.title}
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {ctx.audiobooks.slice(0, 6).map((item) => (
                        <AudiobookCard key={item.id} audiobook={item} />
                      ))}
                    </div>
                  </section>
                ))}

            {!isFullscreen && audiobook.suggested.length > 0 && (
              <section className="space-y-3 pt-2">
                <h2 className="font-serif text-lg font-bold text-foreground">You may also like</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {audiobook.suggested.slice(0, 6).map((item) => (
                    <AudiobookCard key={item.id} audiobook={item} />
                  ))}
                </div>
              </section>
            )}

            {!isFullscreen && (
              <>
                <AdSpace size="banner" contentType="audiobook" />
                <AdSpace size="rectangle" contentType="audiobook" />
              </>
            )}
          </section>

          {/* Desktop sticky chapters sidebar */}
          <aside className={isFullscreen ? "hidden" : "hidden xl:sticky xl:top-20 xl:block"}>
            <Card className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden border shadow-md">
              <div className="space-y-2.5 border-b p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ListMusic className="h-4 w-4 text-[#D92F4C]" aria-hidden="true" />
                    <h2 className="text-sm font-semibold text-foreground">Chapters</h2>
                  </div>
                  <Badge variant="secondary">{tracks.length}</Badge>
                </div>

                {showChapterSearch && (
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      type="search"
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      placeholder="Jump to chapter"
                      aria-label="Jump to chapter"
                      className="h-8 pl-8 pr-7 text-xs"
                    />
                    {chapterSearch && (
                      <button
                        type="button"
                        aria-label="Clear chapter search"
                        onClick={() => setChapterSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{renderChapterRows(true)}</div>
            </Card>
          </aside>
        </div>
      </main>

      <Sheet open={playlistOpen} onOpenChange={setPlaylistOpen}>
        <SheetContent
          side="bottom"
          container={isFullscreen ? (playerContainerRef.current ?? undefined) : undefined}
          className={`max-h-[80vh] flex-col rounded-t-2xl border-border bg-background p-0 duration-200 data-[state=closed]:duration-150 data-[state=open]:duration-200 ${
            isFullscreen ? "flex" : "flex xl:hidden"
          }`}
        >
          <SheetHeader
            className="relative flex-row touch-none select-none items-center justify-between space-y-0 border-b px-4 pb-3 pt-5 pr-12 text-left cursor-grab active:cursor-grabbing"
            onPointerDown={startPlaylistCloseGesture}
            onPointerUp={finishPlaylistCloseGesture}
            onPointerCancel={cancelPlaylistCloseGesture}
          >
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/40"
            />
            <div className="flex items-center gap-2">
              <ListMusic className="h-4 w-4 text-[#D92F4C]" aria-hidden="true" />
              <SheetTitle className="text-sm font-semibold text-foreground">Chapters</SheetTitle>
            </div>
            <Badge variant="secondary">{tracks.length}</Badge>
          </SheetHeader>

          {showChapterSearch && (
            <div className="border-b px-4 py-2.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Jump to chapter"
                  aria-label="Jump to chapter"
                  className="h-10 pl-8 pr-8 text-sm"
                />
                {chapterSearch && (
                  <button
                    type="button"
                    aria-label="Clear chapter search"
                    onClick={() => setChapterSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-y-auto scrollbar-thin">{renderChapterRows(false, () => setPlaylistOpen(false))}</div>
        </SheetContent>
      </Sheet>

      <PlayerMiniBar
        visible={showMiniBar}
        coverImage={audiobook.cover_image}
        storyTitle={audiobook.title}
        storyAuthor={audiobook.author ?? undefined}
        chapterTitle={currentAudio?.title || audiobook.title}
        currentTime={player.currentTime}
        duration={player.duration}
        isPlaying={player.isPlaying}
        isLoading={player.isLoading}
        hasNext={currentIndex < tracks.length - 1}
        onTogglePlay={player.togglePlay}
        onSkipBack={() => player.skip(-15)}
        onNext={playNext}
        onExpand={() => playerCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />
    </div>
  );
};

export default AudioPlayerPage;
