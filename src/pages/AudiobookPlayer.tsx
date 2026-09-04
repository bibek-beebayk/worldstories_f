import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { data, useParams, Link, useLocation, useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ArrowLeft,
  Headphones,
  Clock3,
  ListMusic,
  Maximize2,
  Minimize2,
} from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import AdSpace from "@/components/AdSpace";
import { buildMeta } from "@/lib/buildMeta";
import { useStory } from "@/hooks/useStory";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { storyApi } from "@/api/story";
import type { Route } from "./+types/AudiobookPlayer";

// Fetched here purely to supply meta() with real data server-side — the
// component below still fetches independently via useStory().
export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getStory(params.story_slug!);
  } catch {
    return data(null, { status: 404 });
  }
}

// Always noIndex: this is a playback UI, not a page anyone should land on
// from search — the story's own page is the indexable surface for its audio.
export function meta({ data: story, params }: Route.MetaArgs) {
  if (!story) {
    return buildMeta({
      title: "Audiobook Not Found | WorldStories",
      description: "The requested audiobook could not be found.",
      path: `/listen/${params.story_slug}/${params.chapter_slug}`,
      noIndex: true,
    });
  }

  const currentAudio = story.audios.find((audio) => audio.slug === params.chapter_slug);
  return buildMeta({
    title: `${currentAudio?.title ? `${currentAudio.title} — ` : ""}${story.title} Audiobook | WorldStories`,
    description: `Listen to ${story.title} on WorldStories.`,
    path: `/listen/${params.story_slug}/${params.chapter_slug}`,
    noIndex: true,
  });
}
import CoverImage from "@/components/CoverImage";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import { useStoryReadingEvents } from "@/hooks/useStoryReadingEvents";
import { useAudioSource } from "@/hooks/audio/useAudioSource";
import { useAudioProgress } from "@/hooks/audio/useAudioProgress";
import { useAudioPlayback } from "@/hooks/audio/useAudioPlayback";
import { useAutoplayPreference } from "@/hooks/audio/useAutoplayPreference";
import { AudioTimeline } from "@/components/audio/AudioTimeline";
import { AudioTransportControls } from "@/components/audio/AudioTransportControls";
import { PlaybackSpeedControl } from "@/components/audio/PlaybackSpeedControl";
import { AutoplayToggle } from "@/components/audio/AutoplayToggle";
import { AudioLoadingOverlay } from "@/components/audio/AudioLoadingOverlay";
import { AudioErrorMessage } from "@/components/audio/AudioErrorMessage";

const PLAYLIST_CLOSE_DRAG_DISTANCE = 56;

const AudioPlayerPage = ({ loaderData }: Route.ComponentProps) => {
  const { story_slug, chapter_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Coming from the Downloads page should return there, not to the story
  // page — the entry point passes this via navigation state (see
  // ProfileDownloadedStory.tsx).
  const backHref = (location.state as { backTo?: string } | null)?.backTo || `/story/${story_slug}`;
  const { data: story, isLoading, isError } = useStory(story_slug, loaderData || undefined);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useAutoplayPreference();
  const playlistDragRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  useEffect(() => {
    if (!story?.audios?.length) return;
    const slugToFind = chapter_slug || story.audios[0].slug;
    const idx = story.audios.findIndex((a) => a.slug === slugToFind);
    setCurrentIndex(idx === -1 ? 0 : idx);
  }, [story, chapter_slug]);

  const currentAudio = story?.audios[currentIndex];

  const jumpToAudio = (targetIndex: number) => {
    if (!story || targetIndex < 0 || targetIndex >= story.audios.length) return;
    const target = story.audios[targetIndex];
    setCurrentIndex(targetIndex);
    navigate(`/listen/${story_slug}/${target.slug}`, { state: location.state });
  };

  // isPlaying itself isn't set here — the shared audio engine handles the
  // actual play() attempt (and whether it succeeded) once the chapter switch
  // lands, so this doesn't optimistically claim success before it's known.
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

  const source = useAudioSource({
    storySlug: story_slug,
    audioSlug: currentAudio?.slug,
    directUrl: currentAudio?.audio_file?.toString() || null,
  });

  const progress = useAudioProgress({
    storySlug: story_slug,
    audios: story?.audios ?? [],
    isAuthenticated,
    currentAudioSlug: currentAudio?.slug,
  });

  const player = useAudioPlayback({
    audioSrc: source.audioSrc,
    storySlug: story_slug,
    onLoadedMetadata: progress.handleLoadedMetadata,
    onTimeUpdate: progress.handleTimeUpdate,
    onEnded: (el) => {
      progress.handleEnded(el);
      if (autoplayEnabled) playNext();
    },
    onMediaError: source.handleMediaError,
  });

  const liveAudioProgressMap = progress.liveProgressMap;

  // Story-level position for the lifecycle events: every track weighted
  // equally, the same approximation the library endpoints use for a story's
  // overall listening progress.
  const overallListeningProgress = useMemo(() => {
    const tracks = story?.audios ?? [];
    if (tracks.length === 0) return 0;
    const total = tracks.reduce(
      (sum, audio) => sum + Math.min(1, Math.max(0, liveAudioProgressMap[audio.slug]?.progress || 0)),
      0
    );
    return total / tracks.length;
  }, [story?.audios, liveAudioProgressMap]);

  useStoryReadingEvents({
    storySlug: story_slug,
    format: "audio",
    progress: overallListeningProgress,
    ready: progress.progressDataReady && (story?.audios?.length ?? 0) > 0,
  });

  useContentSessionAnalytics("listening_session", story_slug ? { storySlug: story_slug } : undefined, player.isPlaying, {
    format: "audio",
    item_slug: currentAudio?.slug || chapter_slug || "",
    playback_rate: player.playbackRate,
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

              {player.isLoading && <AudioLoadingOverlay />}

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
                  <AudioTimeline
                    currentTime={player.currentTime}
                    duration={player.duration}
                    onSeek={player.seek}
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
                    hasNext={currentIndex < story.audios.length - 1}
                    prevLabel="Previous chapter"
                    nextLabel="Next chapter"
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

                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <PlaybackSpeedControl rate={player.playbackRate} onCycle={player.cyclePlaybackRate} />

                    <AutoplayToggle
                      enabled={autoplayEnabled}
                      onToggle={() => setAutoplayEnabled((enabled) => !enabled)}
                    />

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
                <AdSpace size="banner" contentType="audiobook" />
                <AdSpace size="rectangle" contentType="audiobook" />
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
