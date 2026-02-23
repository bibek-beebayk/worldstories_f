import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Headphones,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListMusic,
  Waves,
} from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import AdSpace from "@/components/AdSpace";
import { useStory } from "@/hooks/useStory";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";

const AudioPlayerPage = () => {
  const { story_slug, chapter_slug } = useParams();
  const navigate = useNavigate();
  const { data: story, isLoading, isError } = useStory(story_slug);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const restoredAudioSlugRef = useRef<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [liveAudioProgressMap, setLiveAudioProgressMap] = useState<
    Record<string, { progress: number; position_seconds: number; duration_seconds: number }>
  >({});

  const isAuthenticated = Boolean(getAccessToken());
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
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const currentAudio = story?.audios[currentIndex];
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

  const queueSaveAudioProgress = (
    audioSlug: string,
    progress: number,
    positionSeconds: number,
    durationSeconds: number
  ) => {
    if (!isAuthenticated || !story_slug) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      storyApi
        .saveAudioProgress(
          story_slug,
          audioSlug,
          Math.min(1, Math.max(0, progress)),
          Math.max(0, positionSeconds),
          Math.max(0, durationSeconds)
        )
        .catch(() => {});
    }, 700);
  };

  const jumpToAudio = (targetIndex: number) => {
    if (!story || targetIndex < 0 || targetIndex >= story.audios.length) return;
    const target = story.audios[targetIndex];
    setCurrentIndex(targetIndex);
    navigate(`/listen/${story_slug}/${target.slug}`);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const playNext = () => {
    if (!story) return;
    if (currentIndex < story.audios.length - 1) {
      jumpToAudio(currentIndex + 1);
      setIsPlaying(true);
    }
  };

  const playPrev = () => {
    if (currentIndex > 0) {
      jumpToAudio(currentIndex - 1);
      setIsPlaying(true);
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 rounded-2xl border border-cyan-200/60 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                Immersive Listening
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{story.title}</h1>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="bg-white/80">
                  {story.story_type}
                </Badge>
                <Badge variant="outline" className="bg-white/80">
                  {story.audios.length} tracks
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-cyan-300 bg-white/80 px-4 py-2 text-sm">
              <Waves className="h-4 w-4 text-cyan-700" />
              <span className="text-slate-700">Now Playing: {currentAudio?.title || "—"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_1fr]">
          <section className="space-y-6">
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
                  <div className="relative h-full min-h-[280px]">
                    <img
                      src={story.cover_image}
                      alt={story.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
                  </div>

                  <div className="space-y-5 p-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-cyan-200">Chapter Audio</p>
                      <h2 className="mt-1 text-2xl font-semibold leading-tight">
                        {currentAudio?.title || "No chapter selected"}
                      </h2>
                    </div>

                    {isAuthenticated ? (
                      <div className="space-y-3 rounded-xl border border-white/20 bg-white/5 p-4">
                        <div className="flex items-center justify-between text-sm">
                          <p className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-cyan-200" />
                            Chapter completion
                          </p>
                          <span className="font-medium">{currentAudioCompletion}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-cyan-300 transition-all"
                            style={{ width: `${currentAudioCompletion}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <p>Audiobook completion</p>
                          <span className="font-medium">{overallAudioCompletion}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-emerald-300 transition-all"
                            style={{ width: `${overallAudioCompletion}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-300">
                        <Link to="/login" className="text-cyan-300 underline-offset-2 hover:underline">
                          Login
                        </Link>{" "}
                        to track audiobook progress
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{formatTime(currentTimeSeconds)}</span>
                      <span>{formatTime(durationSeconds)}</span>
                    </div>

                    {currentAudio && (
                      <audio
                        ref={audioRef}
                        src={currentAudio.audio_file.toString()}
                        autoPlay
                        onLoadedMetadata={() => {
                          if (audioRef.current) {
                            setDurationSeconds(audioRef.current.duration || 0);
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
                            queueSaveAudioProgress(currentAudio.slug, 1, duration, duration);
                          }
                          playNext();
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        className="w-full rounded-md bg-white/90"
                        controls
                      />
                    )}

                    <div className="flex items-center gap-3">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={playPrev}
                        disabled={currentIndex === 0}
                        className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <Button
                        onClick={togglePlay}
                        size="icon"
                        className="h-12 w-12 rounded-full bg-cyan-400 text-slate-900 hover:bg-cyan-300"
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>

                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={playNext}
                        disabled={currentIndex === story.audios.length - 1}
                        className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <AdSpace size="banner" />
          </section>

          <aside className="space-y-4">
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

                <div className="max-h-[65vh] overflow-y-auto">
                  {story.audios.length > 0 ? (
                    story.audios.map((audio, index) => {
                      const saved = liveAudioProgressMap[audio.slug];
                      const completed = Math.round((saved?.progress || 0) * 100);
                      const isActive = index === currentIndex;

                      return (
                        <Link
                          to={`/listen/${story_slug}/${audio.slug}`}
                          key={audio.slug}
                          className="block"
                        >
                          <div
                            className={`p-4 transition-colors hover:bg-muted/50 ${
                              isActive ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  CHAPTER {audio.order}
                                </p>
                                <h3 className="mt-1 line-clamp-2 break-words font-medium">
                                  {audio.title}
                                </h3>
                              </div>
                              <Headphones
                                className={`h-4 w-4 flex-shrink-0 ${
                                  isActive ? "text-primary" : "text-muted-foreground"
                                }`}
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
                    })
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">No audio available.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <AdSpace size="rectangle" />
          </aside>
        </div>
      </main>
    </div>
  );
};

export default AudioPlayerPage;
