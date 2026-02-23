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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
              <Headphones className="h-5 w-5" />
              Audiobook
            </h2>

            <Card>
              <CardContent className="p-0">
                {story.audios.length > 0 ? (
                  story.audios.map((audio, index) => {
                    const saved = liveAudioProgressMap[audio.slug];
                    const completed = Math.round((saved?.progress || 0) * 100);
                    return (
                      <Link to={`/listen/${story_slug}/${audio.slug}`} key={audio.slug} className="block">
                        <div
                          className={`flex items-center justify-between p-4 transition-colors hover:bg-muted/50 ${
                            index === currentIndex ? "bg-muted/70" : ""
                          }`}
                        >
                          <div className="min-w-0 flex items-start gap-4">
                            <span className="w-8 text-sm font-semibold text-muted-foreground">{audio.order}</span>
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 break-words font-medium">{audio.title}</h3>
                              {isAuthenticated && (
                                <p className="mt-1 text-xs text-muted-foreground">{completed}% complete</p>
                              )}
                            </div>
                          </div>
                          <Headphones className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        </div>
                        {index < story.audios.length - 1 && <Separator />}
                      </Link>
                    );
                  })
                ) : (
                  <p className="p-4 text-muted-foreground">No audio available.</p>
                )}
              </CardContent>
            </Card>

            <AdSpace size="rectangle" className="mt-6" />
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h1 className="mb-2 text-3xl font-bold">{story.title}</h1>
                <Badge className="mb-4">{story.story_type}</Badge>

                {isAuthenticated ? (
                  <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      Chapter completion: {currentAudioCompletion}%
                    </p>
                    <p>Audiobook completion: {overallAudioCompletion}%</p>
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-muted-foreground">
                    <Link to="/login" className="text-primary hover:underline">
                      Login
                    </Link>{" "}
                    to track audiobook progress
                  </p>
                )}

                {currentAudio && (
                  <>
                    <h2 className="mb-4 text-xl font-semibold">{currentAudio.title}</h2>

                    <audio
                      ref={audioRef}
                      src={currentAudio.audio_file.toString()}
                      autoPlay
                      onLoadedMetadata={() => {
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
                      className="mt-4 w-full"
                      controls
                    />

                    <div className="mt-6 flex items-center gap-4">
                      <Button variant="outline" onClick={playPrev} disabled={currentIndex === 0}>
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <Button onClick={togglePlay}>
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={playNext}
                        disabled={currentIndex === story.audios.length - 1}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <AdSpace size="banner" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AudioPlayerPage;
