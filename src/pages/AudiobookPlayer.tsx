import { useEffect, useMemo, useRef, useState } from "react";
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
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListMusic,
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
import { queueAudioProgress } from "@/lib/progressSync";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

const AudioPlayerPage = () => {
  const { story_slug, chapter_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Coming from the Downloads page should return there, not to the story
  // page — the entry point passes this via navigation state (see
  // ProfileDownloadedStory.tsx).
  const backHref = (location.state as { backTo?: string } | null)?.backTo || `/story/${story_slug}`;
  const { data: story, isLoading, isError } = useStory(story_slug);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Keyed by audio slug rather than a single shared timer — with one shared
  // timer, finishing chapter N and moving to chapter N+1 would have the new
  // chapter's very first timeupdate cancel chapter N's still-pending "100%
  // complete" save before it ever fired, permanently losing that chapter's
  // final progress and dragging down the book's overall completion.
  const saveTimersRef = useRef<Record<string, number>>({});
  const restoredAudioSlugRef = useRef<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playlistOpen, setPlaylistOpen] = useState(false);
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

  // While online, keep using the direct R2 URL — it streams progressively,
  // whereas a blob: URL needs the whole file decrypted into memory before
  // playback can start at all. Offline, fall back to a downloaded/decrypted
  // copy if one exists for this exact chapter.
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);

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
        if (!cancelled) setAudioSrc(null);
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
          setAudioSrc(objectUrl);
          return;
        }
      }

      if (!cancelled) {
        revokePrevious();
        setAudioSrc(currentAudio.audio_file.toString());
      }
    };

    resolveSrc();
    return () => {
      cancelled = true;
    };
  }, [currentAudio, story_slug]);

  // Explicit load()+play() on every src change, instead of the declarative
  // autoPlay HTML attribute — iOS Safari blocks unmuted autoplay via that
  // attribute outright regardless of prior interaction, whereas a real
  // programmatic play() call can succeed under Safari's "sticky user
  // activation" model. Just as important: browsers don't reliably resume
  // playback when an existing <audio> element's src is mutated in place
  // (as happens when switching chapters, since the element itself never
  // remounts) unless load() is called first — without it, the element can
  // end up in an ambiguous state that (at least on iOS) was firing a
  // spurious "ended" event and cascading through the rest of the playlist
  // instead of actually playing anything.
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !audioSrc) return;
    audioEl.load();
    const playAttempt = audioEl.play();
    if (playAttempt && typeof playAttempt.then === "function") {
      playAttempt
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay blocked (most commonly iOS without a direct tap) —
          // leave it paused so the UI honestly shows Play rather than a
          // Pause icon over silence, and the user can tap to start it.
          setIsPlaying(false);
        });
    }
  }, [audioSrc]);

  useEffect(() => {
    return () => {
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    };
  }, []);

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
    if (!isAuthenticated || !story_slug) return;
    const normalizedProgress = Math.min(1, Math.max(0, progress));
    const normalizedPosition = Math.max(0, positionSeconds);
    const normalizedDuration = Math.max(0, durationSeconds);
    storyApi
      .saveAudioProgress(story_slug, audioSlug, normalizedProgress, normalizedPosition, normalizedDuration)
      .catch(() =>
        queueAudioProgress(story_slug, audioSlug, normalizedProgress, normalizedPosition, normalizedDuration)
      );
  };

  const queueSaveAudioProgress = (
    audioSlug: string,
    progress: number,
    positionSeconds: number,
    durationSeconds: number
  ) => {
    if (!isAuthenticated || !story_slug) return;

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
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]">
      <Seo
        title={`${currentAudio?.title ? `${currentAudio.title} — ` : ""}${story.title} Audiobook | WorldStories`}
        description={`Listen to ${story.title} on WorldStories.`}
        path={`/listen/${story_slug}/${chapter_slug}`}
        noIndex
      />
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
        <Link to={backHref} className="mb-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to story
          </Button>
        </Link>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="space-y-4 sm:space-y-6">
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
              <CardContent className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
                <div className="relative w-40 shrink-0 overflow-hidden rounded-xl shadow-lg sm:w-56">
                  <img
                    src={story.cover_image}
                    alt={story.title}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="w-full min-w-0 space-y-4">
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
                      aria-label={isPlaying ? "Pause" : "Play"}
                      className="h-14 w-14 rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300"
                    >
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
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
                      onClick={() => setPlaylistOpen(true)}
                      className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/20 xl:hidden"
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

                  {currentAudio && audioSrc && (
                    <audio
                      ref={audioRef}
                      src={audioSrc}
                      className="hidden"
                      onLoadedMetadata={() => {
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
                        if (!isAuthenticated || !audioRef.current || !currentAudio?.slug) return;
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
                          // Fired immediately (not debounced) — this is a
                          // one-shot "chapter complete" event, not a stream of
                          // timeupdate ticks, and playNext() below moves to the
                          // next chapter right away.
                          persistAudioProgress(currentAudio.slug, 1, duration, duration);
                        }
                        playNext();
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <AdSpace size="banner" />
            <AdSpace size="rectangle" />
        </section>

        {/* Desktop/large-screen only: the original persistent playlist sidebar.
            Below xl, the same list is reached via the in-player "Playlist"
            toggle, which opens it as a bottom sheet instead — there isn't
            enough width for a side-by-side sidebar on those screens. */}
        <aside className="hidden xl:block xl:space-y-4">
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
          className="flex max-h-[80vh] flex-col rounded-t-2xl border-white/20 bg-background/90 p-0 backdrop-blur-xl duration-200 data-[state=closed]:duration-150 data-[state=open]:duration-200 supports-[backdrop-filter]:bg-background/75 xl:hidden"
        >
          <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-white/10 p-3 pr-12 text-left">
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
