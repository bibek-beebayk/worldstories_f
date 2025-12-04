import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Headphones, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import FullScreenLoader from "@/components/FullScreenLoader";
import AdSpace from "@/components/AdSpace";
import { useStory } from "@/hooks/useStory";
import { useChapter } from "@/hooks/useChapter";

const AudioPlayerPage = () => {
  const { story_slug, chapter_slug } = useParams();
  const { data: story, isLoading, isError } = useStory(story_slug);
  const {data: audio} = useChapter(story_slug, chapter_slug, "audio");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

//   useEffect(() => {
//     if (!story) return;
//     const idx = story.audios.findIndex((a) => a.slug    === chapter_slug);
//     setCurrentIndex(idx === -1 ? 0 : idx);
//   }, [story, chapterSlug]);

  const currentAudio = story?.audios[currentIndex];

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const playNext = () => {
    if (currentIndex < story.audios.length - 1) {
      setCurrentIndex((i) => i + 1);
      setIsPlaying(true);
    }
  };

  const playPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsPlaying(true);
    }
  };

  if (isLoading) return <FullScreenLoader />;
  if (isError || !story) return <div>Error loading audio.</div>;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Chapters List */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Audiobook
            </h2>

            <Card>
              <CardContent className="p-0">
                {story.audios.length > 0 ? (
                  story.audios.map((audio, index) => (
                    <Link
                      to={`/listen/${story_slug}/${audio.slug}`}
                      key={index}
                      className="block"
                    >
                      <div
                        className={`
                          flex items-center justify-between p-4 
                          hover:bg-muted/50 cursor-pointer transition-colors
                          ${index === currentIndex ? "bg-muted/70" : ""}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-semibold text-muted-foreground w-8">
                            {audio.order}
                          </span>
                          <div>
                            <h3 className="font-medium">{audio.title}</h3>
                          </div>
                        </div>
                        <Headphones className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {index < story.audios.length - 1 && <Separator />}
                    </Link>
                  ))
                ) : (
                  <p className="p-4 text-muted-foreground">No audio available.</p>
                )}
              </CardContent>
            </Card>

            <AdSpace size="rectangle" className="mt-6" />
          </div>

          {/* RIGHT: Player */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
                <Badge className="mb-4">{story.story_type}</Badge>

                {currentAudio && (
                  <>
                    <h2 className="text-xl font-semibold mb-4">
                      {currentAudio.title}
                    </h2>

                    <audio
                      ref={audioRef}
                      src={currentAudio.audio_file.toString()}
                      autoPlay
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="w-full mt-4"
                      controls
                    />

                    <div className="flex items-center gap-4 mt-6">
                      <Button
                        variant="outline"
                        onClick={playPrev}
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>

                      <Button onClick={togglePlay}>
                        {isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
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
