import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { data, Link, useLocation, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowLeft,
  Expand,
  Eye,
  EyeOff,
  List,
  Loader2,
  Minimize,
  Pause,
  Play,
} from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buildMeta } from "@/lib/buildMeta";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { storyApi } from "@/api/story";
import { authApi } from "@/api/auth";
import { toast } from "@/components/ui/sonner";
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
import { ReadAlongProgress } from "@/components/read-along/ReadAlongProgress";
import { formatTime } from "@/components/audio/formatTime";
import { PlaybackSpeedControl } from "@/components/audio/PlaybackSpeedControl";
import { AutoplayToggle } from "@/components/audio/AutoplayToggle";
import { AudioErrorMessage } from "@/components/audio/AudioErrorMessage";
import { normalizeCues } from "@/lib/readAlongCues";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useReadAlongAutoScroll } from "@/hooks/read-along/useReadAlongAutoScroll";
import { useReadAlongSyncOffset } from "@/hooks/read-along/useReadAlongSyncOffset";
import { useActiveCue } from "@/hooks/read-along/useActiveCue";
import { useCueAutoScroll } from "@/hooks/read-along/useCueAutoScroll";
import { TranscriptCues } from "@/components/read-along/TranscriptCues";
import { SyncOffsetControl } from "@/components/read-along/SyncOffsetControl";
import { SYNC_OFFSET_MAX } from "@/lib/readAlongSyncOffset";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { isDownloaded } from "@/hooks/useOfflineDownload";
import { listOfflineReadAlongTracks } from "@/lib/offlineReadAlong";
import {
  isInteractiveShortcutTarget,
  resolveReadAlongShortcut,
} from "@/lib/readAlongKeyboard";
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
          <Button asChild size="sm" className="min-h-11 touch-manipulation">
            <Link to={primary.to}>{primary.label}</Link>
          </Button>
        ) : (
          <Button size="sm" className="min-h-11 touch-manipulation" onClick={primary.onClick}>
            {primary.label}
          </Button>
        ))}
      {secondary && (
        <Button asChild variant="outline" size="sm" className="min-h-11 touch-manipulation">
          <Link to={secondary.to}>
            {secondary.label}
          </Link>
        </Button>
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
  const [autoScrollEnabled, setAutoScrollEnabled] = useReadAlongAutoScroll();
  const sync = useReadAlongSyncOffset(audio_slug, readAlong?.transcript.default_offset_seconds ?? 0);
  const { data: me } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const isSuperuser = Boolean(me?.is_superuser);
  const reducedMotion = usePrefersReducedMotion();
  const { data: offlineReadAlongTracks = [] } = useQuery({
    queryKey: ["offline-read-along-tracks", story_slug],
    queryFn: () => listOfflineReadAlongTracks(story_slug!),
    enabled: hasMounted && !!story_slug && !isOnline,
    retry: false,
    networkMode: "always",
  });
  const { data: offlineAudioAvailable = false } = useQuery({
    queryKey: ["offline-audio-available", story_slug, audio_slug],
    queryFn: () => isDownloaded(story_slug!, "audio", audio_slug),
    enabled: hasMounted && !!story_slug && !!audio_slug && !isOnline,
    retry: false,
    networkMode: "always",
  });

  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isContentsOpen, setIsContentsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trackAnnouncement, setTrackAnnouncement] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentTrackRef = useRef<HTMLButtonElement | null>(null);
  const cueRefs = useRef<(HTMLElement | null)[]>([]);
  // Furthest fraction of the track reached this session — reported as
  // `transcript_depth` on the listening_session event so admins can tell a
  // skim from a full read. Time-based (not cue-index) so it's correct for
  // unsynchronized transcripts and single-cue tracks too.
  const maxDepthRef = useRef(0);
  const announcedTrackRef = useRef(audio_slug ?? null);
  const registerCueRef = useCallback((index: number, el: HTMLElement | null) => {
    cueRefs.current[index] = el;
  }, []);

  const cues = useMemo(
    () => normalizeCues(readAlong?.transcript?.cues),
    [readAlong?.transcript?.cues]
  );

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
    completionContentType: "read_along",
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
      // No prev/next controls on this surface — a finished track always rolls
      // straight into the next compatible one (last track just stops).
      const next = readAlong?.navigation.next_audio_slug;
      if (next) goToTrack(next);
    },
    onMediaError: source.handleMediaError,
  });

  const playerRef = useRef(player);
  playerRef.current = player;
  const handleSeekToCue = useCallback((startSeconds: number, cueIndex: number) => {
    // Land on the audio the cue actually corresponds to under the current
    // sync offset, so click-to-jump and the highlight agree.
    playerRef.current.seek(Math.max(0, startSeconds + sync.offsetSeconds));
    playerRef.current.play();
    if (story_slug) {
      trackAnalyticsEvent({
        event_type: "read_along_cue_seek",
        story_slug,
        metadata: {
          format: "read_along",
          item_slug: audio_slug || "",
          cue_index: cueIndex,
          target_seconds: Number(startSeconds.toFixed(3)),
        },
      });
    }
  }, [audio_slug, story_slug, sync.offsetSeconds]);

  const handleFollowToggle = () => {
    const enabled = !autoScrollEnabled;
    setAutoScrollEnabled(enabled);
    if (story_slug) {
      trackAnalyticsEvent({
        event_type: "read_along_follow_toggle",
        story_slug,
        metadata: { format: "read_along", item_slug: audio_slug || "", enabled, action: "toggle" },
      });
    }
  };

  const handleSaveDefaultOffset = async () => {
    if (!readAlong) return;
    try {
      await storyApi.setReadAlongOffset(readAlong.audio.id, Math.round(sync.offsetSeconds * 1000));
      sync.reset(); // drop the personal override so the control now shows the saved default
      await queryClient.invalidateQueries({ queryKey: ["read-along", story_slug, audio_slug] });
      toast.success("Saved as the default sync for all readers.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the default sync.");
    }
  };

  const activeCueIndex = useActiveCue({
    cues,
    audioRef: player.audioRef,
    isPlaying: player.isPlaying,
    currentTime: player.currentTime,
    offsetSeconds: sync.offsetSeconds,
    enabled: hasMounted && cues.length > 0,
  });

  const autoScroll = useCueAutoScroll({
    cues,
    activeIndex: activeCueIndex,
    currentTime: player.currentTime,
    offsetSeconds: sync.offsetSeconds,
    cueRefs,
    scrollContainerRef: scrollRef,
    enabled: hasMounted && autoScrollEnabled && cues.length > 0,
    reducedMotion,
    resetKey: audio_slug,
  });

  // Track how far into the audio the reader has gotten. Reset on track change.
  if (player.duration > 0) {
    const depth = Math.min(1, player.currentTime / player.duration);
    if (depth > maxDepthRef.current) maxDepthRef.current = depth;
  }
  useEffect(() => {
    maxDepthRef.current = 0;
  }, [audio_slug]);

  useContentSessionAnalytics(
    "listening_session",
    story_slug ? { storySlug: story_slug } : undefined,
    player.isPlaying,
    {
      format: "read_along",
      item_slug: audio_slug || "",
      playback_rate: player.playbackRate,
      synchronized: readAlong?.transcript.synchronized ?? false,
      transcript_depth: Number(maxDepthRef.current.toFixed(3)),
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
    if (!isOnline || !story_slug || !nextSlug) return;
    queryClient.prefetchQuery({
      queryKey: ["read-along", story_slug, nextSlug],
      queryFn: () => storyApi.getReadAlong(story_slug, nextSlug),
    });
  }, [isOnline, queryClient, story_slug, nextSlug]);

  // Flush any pending position save when leaving the page entirely.
  const flushRef = useRef(progress.flushPendingSaves);
  flushRef.current = progress.flushPendingSaves;
  useEffect(() => () => flushRef.current(), []);

  // New track → start its transcript at the top and drop stale cue refs.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    cueRefs.current = [];
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

  // Announce route-level track changes only. Active cue updates deliberately
  // remain outside any live region to avoid interrupting the transcript.
  useEffect(() => {
    if (!audio_slug || readAlong?.audio.slug !== audio_slug || !readAlong.audio.title) return;
    if (announcedTrackRef.current && announcedTrackRef.current !== audio_slug) {
      setTrackAnnouncement(`Now playing track ${readAlong.audio.order}: ${readAlong.audio.title}`);
    }
    announcedTrackRef.current = audio_slug;
  }, [
    audio_slug,
    readAlong?.audio.order,
    readAlong?.audio.slug,
    readAlong?.audio.title,
  ]);

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
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // State still exits the CSS full-viewport fallback.
    }
  }, []);

  // iPhone Safari cannot fullscreen arbitrary elements, so the state also
  // drives a fixed full-viewport layout; supporting browsers additionally use
  // the native API to hide their chrome.
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
      return;
    }
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
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const shortcut = resolveReadAlongShortcut({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        targetIsInteractive: isInteractiveShortcutTarget(event.target),
      });
      if (!shortcut) return;

      if (shortcut === "dismiss") {
        if (isContentsOpen) {
          event.preventDefault();
          setIsContentsOpen(false);
        } else if (isSettingsOpen) {
          event.preventDefault();
          setIsSettingsOpen(false);
        } else if (isFullscreen) {
          event.preventDefault();
          void exitFullscreen();
        }
        return;
      }

      // Do not operate playback behind an open modal/popover or without audio.
      if (
        isContentsOpen ||
        isSettingsOpen ||
        (!readAlong?.audio.audio_file && !readAlong?.audio.stream_url)
      ) {
        return;
      }
      if (shortcut === "toggle-playback" && event.repeat) return;
      event.preventDefault();
      if (shortcut === "toggle-playback") playerRef.current.togglePlay();
      if (shortcut === "seek-backward") playerRef.current.skip(-15);
      if (shortcut === "seek-forward") playerRef.current.skip(15);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitFullscreen, isContentsOpen, isFullscreen, isSettingsOpen, readAlong]);

  if (isLoading && !readAlong) return <FullScreenLoader />;

  if (isError || !readAlong) {
    if (hasMounted && !isOnline) {
      if (offlineAudioAvailable) {
        return (
          <MessageScreen
            title="Transcript not available offline"
            body="The audio is downloaded, but its Read Along transcript is not. You can continue in audio-only mode."
            primary={{ label: "Listen offline", to: `/listen/${story_slug}/${audio_slug}` }}
            secondary={{ label: "Go to Downloads", to: "/downloads" }}
          />
        );
      }
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

  const { story: readAlongStory, audio, transcript } = readAlong;
  const audioUnavailable = !audio.stream_url && !audio.audio_file;
  const transcriptEmpty = transcript.state === "empty" || !transcript.html?.trim();
  const listenHref = `/listen/${story_slug}/${audio_slug}`;
  const playbackPercent =
    player.duration > 0
      ? Math.min(100, Math.max(0, Math.round((player.currentTime / player.duration) * 100)))
      : 0;
  // Background + inset bar only — never `color` — so it stays orthogonal to the
  // theme's `--tw-prose-*` cascade (and night mode's forced `!text-slate-300`).
  const activeCueClassName = appearance.isDarkReaderTheme
    ? "bg-sky-400/15 shadow-[inset_3px_0_0_theme(colors.sky.400)]"
    : "bg-amber-300/35 shadow-[inset_3px_0_0_theme(colors.amber.500)]";

  const compatibleTracks = !isOnline && offlineReadAlongTracks.length > 0
    ? offlineReadAlongTracks
    : (story?.audios ?? [])
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
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {trackAnnouncement}
      </div>
      {/* Top bar */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-50 px-2 pt-2 transition-transform duration-300 ease-in-out motion-reduce:transition-none",
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
              className="h-11 w-11 touch-manipulation px-0 motion-reduce:transition-none sm:h-9 sm:w-auto sm:px-3"
              onClick={() => setIsChromeVisible(false)}
              aria-label="Hide controls"
            >
              <EyeOff className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Hide</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-11 touch-manipulation px-0 motion-reduce:transition-none sm:h-9 sm:w-auto sm:px-3"
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
              className="h-11 w-11 touch-manipulation px-0 motion-reduce:transition-none sm:h-9 sm:w-auto sm:px-3"
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
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-11 w-11 touch-manipulation px-0 motion-reduce:transition-none sm:h-9 sm:w-auto sm:px-3"
              >
                <Link to={backHref} aria-label="Back to story">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Transcript scroll region */}
      <div
        ref={scrollRef}
        role="region"
        aria-label="Transcript"
        tabIndex={0}
        className="flex-1 overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div
          className={cn(appearance.activeTheme.cardClass, "min-h-full border-0")}
          style={appearance.activeTheme.cardStyle}
          onClick={() => setIsChromeVisible((visible) => !visible)}
        >
          <div className="mx-auto w-full px-4 pb-[calc(env(safe-area-inset-bottom)+13rem)] pt-24 md:px-8 lg:max-w-3xl lg:px-10">
            {cues.length > 0 ? (
              <TranscriptCues
                cues={cues}
                activeIndex={activeCueIndex}
                proseClassName={appearance.proseClassName}
                typographyStyle={appearance.typographyStyle}
                activeCueClassName={activeCueClassName}
                onSeekToCue={handleSeekToCue}
                registerCueRef={registerCueRef}
              />
            ) : transcriptEmpty ? (
              <div className="py-16 text-center">
                {!isOnline && !audio.read_along_available ? (
                  <p className="text-sm opacity-70">
                    The transcript is not saved on this device. Use the audio controls below to listen offline.
                  </p>
                ) : (
                  <p className="text-sm opacity-70">
                    This track doesn't have a transcript yet.{" "}
                    <Link to={listenHref} className="font-medium underline underline-offset-2 opacity-100">
                      Listen without Read Along
                    </Link>
                    .
                  </p>
                )}
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
          "dark fixed inset-x-0 bottom-0 z-50 px-3 pb-[env(safe-area-inset-bottom)] pt-2 transition-transform duration-300 ease-in-out motion-reduce:transition-none",
          !isChromeVisible && "translate-y-full pointer-events-none"
        )}
      >
        <div className="mx-auto max-w-3xl rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 shadow-2xl sm:px-4">
          {audioUnavailable ? (
            <p className="py-2 text-center text-sm text-slate-300">
              Audio for this track isn't available right now. You can still read the transcript.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-0.5">
                <div className="col-start-2 row-start-1 flex justify-between text-[10px] font-medium leading-none tabular-nums text-slate-400">
                  <span>{formatTime(player.currentTime)}</span>
                  <span>{formatTime(player.duration)}</span>
                </div>
                <button
                  type="button"
                  onClick={player.togglePlay}
                  aria-label={
                    player.isLoading
                      ? "Loading audio — tap to play"
                      : player.isPlaying
                      ? "Pause"
                      : "Play"
                  }
                  aria-busy={player.isLoading}
                  className="col-start-1 row-start-2 flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 motion-reduce:transition-none"
                >
                  {player.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  ) : player.isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <ReadAlongProgress
                  className="col-start-2 row-start-2"
                  currentTime={player.currentTime}
                  duration={player.duration}
                  onSeek={player.seek}
                />
                <span
                  className="col-start-3 row-start-2 w-8 text-right text-[11px] font-semibold tabular-nums text-cyan-300"
                  aria-hidden="true"
                >
                  {playbackPercent}%
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                {hasMounted && cues.length > 0 && (
                  <AutoplayToggle
                    label="Follow"
                    enabled={autoScrollEnabled}
                    onToggle={handleFollowToggle}
                    className="min-h-0 h-8 min-w-0 gap-1.5 px-2 text-[11px]"
                  />
                )}
                {hasMounted && cues.length > 0 && (
                  <SyncOffsetControl
                    offsetSeconds={sync.offsetSeconds}
                    onDecrease={sync.decrease}
                    onIncrease={sync.increase}
                    onReset={sync.reset}
                    resettable={sync.isOverridden}
                    atMin={sync.offsetSeconds <= -SYNC_OFFSET_MAX}
                    atMax={sync.offsetSeconds >= SYNC_OFFSET_MAX}
                    onSaveDefault={isSuperuser ? handleSaveDefaultOffset : undefined}
                    canSaveDefault={
                      Math.round(sync.offsetSeconds * 1000) !==
                      Math.round(sync.defaultOffsetSeconds * 1000)
                    }
                  />
                )}
                <PlaybackSpeedControl
                  rate={player.playbackRate}
                  onCycle={player.cyclePlaybackRate}
                  className="min-h-0 h-8 min-w-0 px-2 text-[11px]"
                />
              </div>
              <AudioErrorMessage message={player.error} className="mt-1.5" />
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

      {/* Restore the reader chrome once it's been hidden. */}
      {!isChromeVisible && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsChromeVisible(true);
          }}
          aria-label="Show controls"
          className={cn(
            "fixed right-3 top-3 z-[60] flex h-10 w-10 touch-manipulation items-center justify-center rounded-full border opacity-60 shadow-lg hover:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none",
            READER_GLASS_PANEL_CLASS,
            appearance.isDarkReaderTheme && "dark"
          )}
        >
          <Eye className="h-4 w-4" />
        </button>
      )}

      {/* Resume auto-scroll — appears after a manual scroll, above the docked player */}
      {hasMounted && autoScrollEnabled && cues.length > 0 && autoScroll.isSuspended && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            autoScroll.resume();
            if (story_slug) {
              trackAnalyticsEvent({
                event_type: "read_along_follow_toggle",
                story_slug,
                metadata: { format: "read_along", item_slug: audio_slug || "", enabled: true, action: "resume" },
              });
            }
          }}
          className={cn(
            "fixed bottom-[calc(env(safe-area-inset-bottom)+9.5rem)] left-1/2 z-50 -translate-x-1/2",
            "flex min-h-11 touch-manipulation items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none",
            READER_GLASS_PANEL_CLASS,
            appearance.isDarkReaderTheme && "dark"
          )}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Resume auto-scroll
        </button>
      )}

      {/* Contents — ordered compatible tracks */}
      <Sheet open={isContentsOpen} onOpenChange={setIsContentsOpen}>
        <SheetContent
          side="left"
          className="flex w-80 flex-col"
          container={isFullscreen ? containerRef.current ?? undefined : undefined}
        >
          <SheetHeader>
            <SheetTitle>Contents</SheetTitle>
            <SheetDescription className="sr-only">
              Choose another audio track with a Read Along transcript.
            </SheetDescription>
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
                    "block min-h-11 w-full touch-manipulation rounded-lg px-3 py-2.5 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none",
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
                  {percent > 0 && (
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
