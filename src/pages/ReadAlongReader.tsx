import { useEffect, useRef, useState } from "react";
import { data, Link, useLocation, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Expand, List, Minimize } from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buildMeta } from "@/lib/buildMeta";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { storyApi } from "@/api/story";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useImmersiveReader } from "@/context/ImmersiveReaderContext";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import { useReadAlong } from "@/hooks/useReadAlong";
import { useStory } from "@/hooks/useStory";
import { useReaderAppearance } from "@/hooks/useReaderAppearance";
import { ReaderSettingsPanel } from "@/components/reader/ReaderSettingsPanel";
import { READER_GLASS_PANEL_CLASS } from "@/components/reader/glassPanel";
import { useAudioSource } from "@/hooks/audio/useAudioSource";
import { useAudioProgress } from "@/hooks/audio/useAudioProgress";
import { useAudioPlayback } from "@/hooks/audio/useAudioPlayback";
import { useAutoplayPreference } from "@/hooks/audio/useAutoplayPreference";
import { AudioTimeline } from "@/components/audio/AudioTimeline";
import { AudioTransportControls } from "@/components/audio/AudioTransportControls";
import { PlaybackSpeedControl } from "@/components/audio/PlaybackSpeedControl";
import { AutoplayToggle } from "@/components/audio/AutoplayToggle";
import { AudioErrorMessage } from "@/components/audio/AudioErrorMessage";
import type { Route } from "./+types/ReadAlongReader";

// Fetched here to feed meta() server-side and seed the client query — the
// component still reads through useReadAlong() with this as initialData.
export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getReadAlong(params.story_slug!, params.audio_slug!);
  } catch {
    return data(null, { status: 404 });
  }
}

// Always noIndex: Read Along is a playback surface, not a landing page — the
// story's own page is the indexable route for its audio and transcripts.
export function meta({ data: readAlong, params }: Route.MetaArgs) {
  if (!readAlong) {
    return buildMeta({
      title: "Read Along Not Found | WorldStories",
      description: "The requested read-along could not be found.",
      path: `/read-along/${params.story_slug}/${params.audio_slug}`,
      noIndex: true,
    });
  }

  const { story, audio } = readAlong;
  return buildMeta({
    title: `${audio.title} — ${story.title} | Read Along | WorldStories`,
    description: `Follow the transcript while listening to ${audio.title} from ${story.title} on WorldStories.`,
    path: `/read-along/${params.story_slug}/${params.audio_slug}`,
    noIndex: true,
  });
}

const MessageScreen = ({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary?: { label: string; to?: string; onClick?: () => void };
  secondary?: { label: string; to: string };
}) => (
  <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    <div className="space-y-1.5">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-2">
      {primary &&
        (primary.to ? (
          <Link to={primary.to}>
            <Button size="sm">{primary.label}</Button>
          </Link>
        ) : (
          <Button size="sm" onClick={primary.onClick}>
            {primary.label}
          </Button>
        ))}
      {secondary && (
        <Link to={secondary.to}>
          <Button variant="outline" size="sm">
            {secondary.label}
          </Button>
        </Link>
      )}
    </div>
  </div>
);

const ReadAlongReader = ({ loaderData }: Route.ComponentProps) => {
  const { story_slug, audio_slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const backHref = (location.state as { backTo?: string } | null)?.backTo || `/story/${story_slug}`;

  const isAuthenticated = useIsLoggedIn();
  const { setIsImmersiveReaderActive } = useImmersiveReader();
  const {
    data: readAlong,
    isLoading,
    isError,
    refetch,
  } = useReadAlong(
    story_slug,
    audio_slug,
    // Only seed from the loader when it's actually this track's payload. RR
    // holds a same-route navigation until the loader resolves, so params and
    // loaderData shouldn't desync — this is a cheap guard against that ever
    // changing (e.g. a future clientLoader).
    loaderData?.audio?.slug === audio_slug ? loaderData : undefined
  );
  const { data: story } = useStory(story_slug);

  const [hasMounted, setHasMounted] = useState(false);
  const isOnline = useOnlineStatus();
  const appearance = useReaderAppearance();
  const [autoplayEnabled, setAutoplayEnabled] = useAutoplayPreference();

  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isContentsOpen, setIsContentsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentTrackRef = useRef<HTMLButtonElement | null>(null);

  const source = useAudioSource({
    storySlug: story_slug,
    audioSlug: audio_slug,
    directUrl: readAlong?.audio.audio_file || null,
  });

  const progress = useAudioProgress({
    storySlug: story_slug,
    audios: story?.audios ?? [],
    isAuthenticated,
    currentAudioSlug: audio_slug,
  });

  const goToTrack = (slug: string) => {
    // Persist the current position now rather than losing it to the debounce.
    progress.flushPendingSaves();
    navigate(`/read-along/${story_slug}/${slug}`, { state: location.state });
  };

  const player = useAudioPlayback({
    audioSrc: source.audioSrc,
    storySlug: story_slug,
    onLoadedMetadata: progress.handleLoadedMetadata,
    onTimeUpdate: progress.handleTimeUpdate,
    onEnded: (el) => {
      progress.handleEnded(el);
      const next = readAlong?.navigation.next_audio_slug;
      if (autoplayEnabled && next) goToTrack(next);
    },
    onMediaError: source.handleMediaError,
  });

  useContentSessionAnalytics(
    "listening_session",
    story_slug ? { storySlug: story_slug } : undefined,
    player.isPlaying,
    {
      format: "read_along",
      item_slug: audio_slug || "",
      playback_rate: player.playbackRate,
    }
  );

  useEffect(() => setHasMounted(true), []);

  useEffect(() => {
    setIsImmersiveReaderActive(true);
    return () => setIsImmersiveReaderActive(false);
  }, [setIsImmersiveReaderActive]);

  // Warm the next compatible track's payload so an autoplay hop isn't left
  // silent while its loader round-trips (worst on a cold-started backend).
  const nextSlug = readAlong?.navigation.next_audio_slug;
  useEffect(() => {
    if (!story_slug || !nextSlug) return;
    queryClient.prefetchQuery({
      queryKey: ["read-along", story_slug, nextSlug],
      queryFn: () => storyApi.getReadAlong(story_slug, nextSlug),
    });
  }, [queryClient, story_slug, nextSlug]);

  // Flush any pending position save when leaving the page entirely.
  const flushRef = useRef(progress.flushPendingSaves);
  flushRef.current = progress.flushPendingSaves;
  useEffect(() => () => flushRef.current(), []);

  // New track → start its transcript at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [audio_slug]);

  // Keep the current track visible in the Contents panel when it opens.
  useEffect(() => {
    if (!isContentsOpen) return;
    const timer = window.setTimeout(() => {
      currentTrackRef.current?.scrollIntoView({ block: "center" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [audio_slug, isContentsOpen]);

  useEffect(() => {
    if (isFullscreen) setIsChromeVisible(true);
  }, [isFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
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
  // drives a fixed full-viewport layout; supporting browsers additionally use
  // the native API to hide their chrome.
  const toggleFullscreen = async () => {
    const next = !isFullscreen;
    setIsContentsOpen(false);
    setIsSettingsOpen(false);
    setIsFullscreen(next);
    try {
      if (next && document.fullscreenEnabled && containerRef.current) {
        await containerRef.current.requestFullscreen();
      } else if (!next && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // The CSS full-viewport mode stays active if the native API is unavailable.
    }
  };

  if (isLoading && !readAlong) return <FullScreenLoader />;

  if (isError || !readAlong) {
    if (hasMounted && !isOnline) {
      return (
        <MessageScreen
          title="Read Along isn't available offline yet"
          body="Downloading a story's transcript for offline use is coming soon. For now, connect to the internet to use Read Along."
          primary={{ label: "Go to Downloads", to: "/downloads" }}
          secondary={{ label: "Back", to: backHref }}
        />
      );
    }
    return (
      <MessageScreen
        title="Read Along unavailable"
        body="We couldn't load this read-along. Check your connection and try again."
        primary={{ label: "Try again", onClick: () => refetch() }}
        secondary={{ label: "Back", to: backHref }}
      />
    );
  }

  const { story: readAlongStory, audio, transcript, navigation } = readAlong;
  const audioUnavailable = !audio.stream_url && !audio.audio_file;
  const transcriptEmpty = transcript.state === "empty" || !transcript.html?.trim();
  const listenHref = `/listen/${story_slug}/${audio_slug}`;

  const compatibleTracks = (story?.audios ?? [])
    .filter((track) => track.read_along_available)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-[100dvh] flex-col overflow-hidden bg-background",
        isFullscreen && "fixed inset-0 z-[200]"
      )}
    >
      {/* Top bar */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-50 px-2 pt-2 transition-transform duration-300 ease-in-out",
          isChromeVisible ? "translate-y-0" : "-translate-y-full pointer-events-none"
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-4xl items-center justify-between gap-1.5 rounded-xl border px-2 py-2 text-foreground shadow-lg sm:px-3 sm:py-3",
            READER_GLASS_PANEL_CLASS,
            appearance.isDarkReaderTheme && "dark"
          )}
        >
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold sm:text-lg">{readAlongStory.title}</h1>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{audio.title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:h-9 sm:px-3"
              onClick={() => setIsContentsOpen(true)}
              aria-label="Contents"
            >
              <List className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Contents</span>
            </Button>
            <ReaderSettingsPanel
              appearance={appearance}
              open={isSettingsOpen}
              onOpenChange={setIsSettingsOpen}
              isFullscreen={isFullscreen}
              containerRef={containerRef}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 sm:h-9 sm:px-3"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 sm:mr-2" />
              ) : (
                <Expand className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </Button>
            {!isFullscreen && (
              <Link to={backHref}>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:h-9 sm:px-3">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Transcript scroll region */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className={cn(appearance.activeTheme.cardClass, "min-h-full border-0")}
          style={appearance.activeTheme.cardStyle}
          onClick={() => setIsChromeVisible((visible) => !visible)}
        >
          <div className="mx-auto w-full px-4 pb-[calc(env(safe-area-inset-bottom)+13rem)] pt-24 md:px-8 lg:max-w-3xl lg:px-10">
            {transcriptEmpty ? (
              <div className="py-16 text-center">
                <p className="text-sm opacity-70">
                  This track doesn't have a transcript yet.{" "}
                  <Link to={listenHref} className="font-medium underline underline-offset-2 opacity-100">
                    Listen without Read Along
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div
                className={appearance.proseClassName}
                style={appearance.typographyStyle}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(transcript.html) }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Docked player — kept a consistently dark surface across reader themes */}
      <div
        className={cn(
          "dark fixed inset-x-0 bottom-0 z-50 px-3 pb-[env(safe-area-inset-bottom)] pt-2 transition-transform duration-300 ease-in-out",
          !isChromeVisible && "translate-y-full pointer-events-none"
        )}
      >
        <div className="mx-auto max-w-3xl space-y-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 shadow-2xl">
          {audioUnavailable ? (
            <p className="py-2 text-center text-sm text-slate-300">
              Audio for this track isn't available right now. You can still read the transcript.
            </p>
          ) : (
            <>
              <AudioTimeline
                currentTime={player.currentTime}
                duration={player.duration}
                onSeek={player.seek}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AudioTransportControls
                  isPlaying={player.isPlaying}
                  isLoading={player.isLoading}
                  onTogglePlay={player.togglePlay}
                  onSkip={player.skip}
                  onPrev={() =>
                    navigation.previous_audio_slug && goToTrack(navigation.previous_audio_slug)
                  }
                  onNext={() => navigation.next_audio_slug && goToTrack(navigation.next_audio_slug)}
                  hasPrev={!!navigation.previous_audio_slug}
                  hasNext={!!navigation.next_audio_slug}
                  prevLabel="Previous track"
                  nextLabel="Next track"
                />
                <div className="flex items-center gap-2">
                  {hasMounted && (
                    <AutoplayToggle
                      enabled={autoplayEnabled}
                      onToggle={() => setAutoplayEnabled((value) => !value)}
                    />
                  )}
                  <PlaybackSpeedControl rate={player.playbackRate} onCycle={player.cyclePlaybackRate} />
                </div>
              </div>
              <AudioErrorMessage message={player.error} />
              {hasMounted && source.audioSrc && (
                <audio
                  key={source.sourceKey}
                  ref={player.audioRef}
                  src={source.audioSrc}
                  {...player.audioElementProps}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Contents — ordered compatible tracks */}
      <Sheet open={isContentsOpen} onOpenChange={setIsContentsOpen}>
        <SheetContent
          side="left"
          className="flex w-80 flex-col"
          container={isFullscreen ? containerRef.current ?? undefined : undefined}
        >
          <SheetHeader>
            <SheetTitle>Contents</SheetTitle>
          </SheetHeader>
          <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
            {(compatibleTracks.length > 0
              ? compatibleTracks
              : [
                  {
                    slug: audio_slug ?? "",
                    order: audio.order,
                    title: audio.title,
                    transcript_synchronized: transcript.synchronized,
                  },
                ]
            ).map((track) => {
              const isCurrent = track.slug === audio_slug;
              const percent = Math.round(
                (progress.liveProgressMap[track.slug]?.progress || 0) * 100
              );
              return (
                <button
                  key={track.slug}
                  type="button"
                  ref={isCurrent ? currentTrackRef : undefined}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => {
                    setIsContentsOpen(false);
                    if (!isCurrent) goToTrack(track.slug);
                  }}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                    isCurrent ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wide",
                      isCurrent ? "text-primary-foreground/75" : "text-muted-foreground"
                    )}
                  >
                    <span>Track {track.order}</span>
                    {track.transcript_synchronized && (
                      <Badge
                        variant={isCurrent ? "outline" : "secondary"}
                        className={cn("border-transparent", isCurrent && "border-primary-foreground/40")}
                      >
                        Synced
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium">{track.title}</span>
                  {isAuthenticated && percent > 0 && (
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px]",
                        isCurrent ? "text-primary-foreground/75" : "text-muted-foreground"
                      )}
                    >
                      {percent}% listened
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ReadAlongReader;
