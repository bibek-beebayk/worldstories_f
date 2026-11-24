import { Link, useParams } from "react-router";
import { BookOpen, Captions, Clock, Headphones, ListMusic, Mic, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CoverImage from "@/components/CoverImage";
import FullScreenLoader from "@/components/FullScreenLoader";
import NotFoundBody from "@/components/NotFoundBody";
import { AudiobookCard } from "@/components/audiobooks/AudiobookCard";
import { useAudiobook, useAudiobookProgress } from "@/hooks/useAudiobooks";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { isAudiobookNotFoundData, loadAudiobookOrRedirect } from "@/lib/audiobookLoader";
import { buildAudiobookMeta, buildAudiobookNotFoundMeta } from "@/lib/audiobookMeta";
import { formatClock, formatLong } from "@/lib/formatDuration";
import { audiobookUrl, readAlongUrl } from "@/lib/urls";
import { ApiError } from "@/api/client";
import type { Route } from "./+types/ListenDetail";

export async function loader({ params }: Route.LoaderArgs) {
  return loadAudiobookOrRedirect(params.slug!);
}

export function meta({ data, params }: Route.MetaArgs) {
  return data && !isAudiobookNotFoundData(data)
    ? buildAudiobookMeta(data, { mode: "detail" })
    : buildAudiobookNotFoundMeta(params.slug);
}

const ListenDetail = ({ loaderData }: Route.ComponentProps) => {
  const { slug } = useParams();
  const isNotFound = isAudiobookNotFoundData(loaderData);
  const initialAudiobook = !isNotFound && loaderData ? loaderData : undefined;
  const { data: audiobook, isLoading, error, refetch } = useAudiobook(isNotFound ? undefined : slug, initialAudiobook);
  const isLoggedIn = useIsLoggedIn();
  const { data: progress } = useAudiobookProgress(audiobook?.slug, isLoggedIn);

  if (isNotFound) return <NotFoundBody />;
  if (isLoading) return <FullScreenLoader />;
  if (!audiobook && error instanceof ApiError && error.status === 404) return <NotFoundBody />;
  if (!audiobook) {
    return (
      <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load this audiobook. Check your connection and try again.
        </p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const tracks = audiobook.tracks ?? [];
  const savedSlug = progress?.audio_slug;
  const hasSavedTrack = Boolean(savedSlug && tracks.some((t) => t.slug === savedSlug));
  const startTrackSlug = hasSavedTrack ? savedSlug! : tracks[0]?.slug;
  const readAlongTrack = tracks.find((t) => t.read_along_available);
  const totalDuration = formatLong(audiobook.total_duration_seconds);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
        {/* Hero */}
        <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-start">
          <div className="mx-auto w-48 overflow-hidden rounded-xl bg-muted shadow-md md:mx-0 md:w-full">
            <CoverImage
              src={audiobook.cover_image}
              alt={audiobook.title}
              title={audiobook.title}
              author={audiobook.author}
              className="aspect-[3/4] h-auto w-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#A71B36] dark:text-rose-300">
                <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
                Audiobook
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">{audiobook.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {audiobook.author && <span>By {audiobook.author}</span>}
                {audiobook.narrator && (
                  <span className="inline-flex items-center gap-1">
                    <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                    Narrated by {audiobook.narrator}
                  </span>
                )}
                {totalDuration && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {totalDuration}
                  </span>
                )}
                <span>
                  {tracks.length} {tracks.length === 1 ? "chapter" : "chapters"}
                </span>
              </div>
            </div>

            {audiobook.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {audiobook.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {audiobook.about && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{audiobook.about}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {startTrackSlug && (
                <Button asChild size="lg" className="bg-[#D92F4C] text-white hover:bg-[#A71B36]">
                  <Link to={audiobookUrl(audiobook.slug, startTrackSlug)}>
                    <Play className="mr-2 h-4 w-4 fill-current" aria-hidden="true" />
                    {hasSavedTrack ? "Continue listening" : "Start listening"}
                  </Link>
                </Button>
              )}

              {audiobook.has_read_along && readAlongTrack && (
                <Button asChild size="lg" variant="outline">
                  <Link to={readAlongUrl(audiobook.slug, readAlongTrack.slug)}>
                    <Captions className="mr-2 h-4 w-4" aria-hidden="true" />
                    Read along
                  </Link>
                </Button>
              )}

              {audiobook.story && (
                <Button asChild size="lg" variant="ghost">
                  <Link to={`/story/${audiobook.story.slug}`}>
                    <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                    Read the story
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Chapters / Tracks */}
        {tracks.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-4 w-4 text-[#D92F4C]" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-foreground">Chapters</h2>
                </div>
                <Badge variant="secondary">{tracks.length}</Badge>
              </div>
              <div className="divide-y">
                {tracks.map((track) => (
                  <Link
                    key={track.id}
                    to={audiobookUrl(audiobook.slug, track.slug)}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                        {track.order}
                      </span>
                      <span className="truncate font-medium text-foreground">{track.title}</span>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatClock(track.duration_seconds) || ""}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other versions (same story, other narrators) */}
        {audiobook.other_versions.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-foreground">Other versions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {audiobook.other_versions.map((ver) => (
                <Link
                  key={ver.slug}
                  to={audiobookUrl(ver.slug)}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{ver.title}</p>
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
          </section>
        )}

        {/* More in each series */}
        {(audiobook.series_context ?? [])
          .filter((ctx) => ctx.audiobooks.length > 0)
          .map((ctx) => (
            <section key={ctx.id} className="space-y-3">
              <h2 className="font-serif text-lg font-bold text-foreground">More in {ctx.title}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {ctx.audiobooks.slice(0, 6).map((item) => (
                  <AudiobookCard key={item.id} audiobook={item} />
                ))}
              </div>
            </section>
          ))}

        {/* Suggested audiobooks */}
        {audiobook.suggested.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-foreground">You may also like</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {audiobook.suggested.map((item) => (
                <AudiobookCard key={item.id} audiobook={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ListenDetail;
