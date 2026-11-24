import { Link, useParams } from "react-router";
import { BookOpen, Captions, Headphones, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CoverImage from "@/components/CoverImage";
import FullScreenLoader from "@/components/FullScreenLoader";
import NotFoundBody from "@/components/NotFoundBody";
import { useAudiobook } from "@/hooks/useAudiobooks";
import {
  isAudiobookNotFoundData,
  loadReadAlongLandingOrRedirect,
} from "@/lib/audiobookLoader";
import { buildAudiobookMeta, buildAudiobookNotFoundMeta } from "@/lib/audiobookMeta";
import { formatClock } from "@/lib/formatDuration";
import { audiobookUrl, readAlongUrl } from "@/lib/urls";
import { ApiError } from "@/api/client";
import type { Route } from "./+types/ReadAlongDetail";

export async function loader({ params }: Route.LoaderArgs) {
  return loadReadAlongLandingOrRedirect(params.slug!);
}

export function meta({ data, params }: Route.MetaArgs) {
  return data && !isAudiobookNotFoundData(data)
    ? buildAudiobookMeta(data, { mode: "read-along" })
    : buildAudiobookNotFoundMeta(params.slug);
}

const ReadAlongDetail = ({ loaderData }: Route.ComponentProps) => {
  const { slug } = useParams();
  const isNotFound = isAudiobookNotFoundData(loaderData);
  const initialAudiobook = !isNotFound && loaderData ? loaderData : undefined;
  const { data: audiobook, isLoading, error } = useAudiobook(
    isNotFound ? undefined : slug,
    initialAudiobook,
  );

  if (isNotFound) return <NotFoundBody />;
  if (isLoading) return <FullScreenLoader />;
  if (!audiobook && error instanceof ApiError && error.status === 404) return <NotFoundBody />;
  if (!audiobook) return <NotFoundBody />;

  const readAlongTracks = (audiobook.tracks ?? []).filter((t) => t.read_along_available);
  const firstTrack = readAlongTracks[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-start">
          <div className="mx-auto w-40 overflow-hidden rounded-xl bg-muted shadow-md md:mx-0 md:w-full">
            <CoverImage
              src={audiobook.cover_image}
              alt={audiobook.title}
              title={audiobook.title}
              author={audiobook.author}
              className="aspect-[3/4] h-auto w-full object-cover"
            />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              <Captions className="h-3.5 w-3.5" aria-hidden="true" />
              Read Along
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              {audiobook.title}
            </h1>
            {audiobook.author && (
              <p className="text-sm text-muted-foreground">By {audiobook.author}</p>
            )}
            {audiobook.about && (
              <p className="text-sm leading-relaxed text-muted-foreground">{audiobook.about}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {firstTrack && (
                <Button asChild size="lg" className="bg-sky-600 text-white hover:bg-sky-700">
                  <Link to={readAlongUrl(audiobook.slug, firstTrack.slug)}>
                    <Captions className="mr-2 h-4 w-4" aria-hidden="true" />
                    Start Read Along
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link to={audiobookUrl(audiobook.slug)}>
                  <Headphones className="mr-2 h-4 w-4" aria-hidden="true" />
                  Listen only
                </Link>
              </Button>
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

        {readAlongTracks.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <ListMusic className="h-4 w-4 text-sky-600" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-foreground">Read-along chapters</h2>
                </div>
                <Badge variant="secondary">{readAlongTracks.length}</Badge>
              </div>
              <div className="divide-y">
                {readAlongTracks.map((track) => (
                  <Link
                    key={track.id}
                    to={readAlongUrl(audiobook.slug, track.slug)}
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
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No read-along transcripts are available for this audiobook yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReadAlongDetail;
