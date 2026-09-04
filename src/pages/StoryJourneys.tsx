import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight, CheckCircle2, Route } from "lucide-react";
import { storyApi } from "@/api/story";
import type { JourneySummary } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/buildMeta";

export function meta() {
  return buildMeta({
    title: "Story Journeys | WorldStories",
    description:
      "Curated paths through the collection — folklore, ghost stories, trickster tales and more.",
    path: "/journeys",
  });
}

const JourneyCard = ({ journey }: { journey: JourneySummary }) => {
  const percent = journey.total ? Math.round((journey.completed / journey.total) * 100) : 0;

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <Link
        to={`/journeys/${journey.slug}`}
        className="w-20 shrink-0 sm:w-24"
        aria-hidden="true"
        tabIndex={-1}
      >
        <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
          <CoverImage
            src={journey.cover_image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="text-base font-semibold sm:text-lg">
          <Link to={`/journeys/${journey.slug}`} className="hover:text-primary">
            {journey.title}
          </Link>
        </h2>
        {journey.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{journey.description}</p>
        )}

        <div className="mt-auto pt-3">
          {journey.is_complete ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Journey complete
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {journey.completed} / {journey.total} completed
              </p>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={journey.total}
                aria-valuenow={journey.completed}
                aria-label={`${journey.title} progress`}
              >
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${percent}%` }} />
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

/**
 * Story Journeys — curated paths through the collection.
 *
 * Progress is derived from what the reader has finished, so there is no "start
 * journey" button and nothing to join: reading the stories *is* the journey.
 * That also means the page is worth visiting signed out, where every journey
 * simply shows zero progress.
 */
const StoryJourneys = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["journeys"],
    queryFn: storyApi.getJourneys,
  });

  if (isLoading) return <FullScreenLoader />;

  if (isError) {
    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          We could not load the journeys right now. Please refresh the page.
        </p>
      </div>
    );
  }

  const journeys = data?.journeys || [];

  return (
    <div className="container px-3 py-8 sm:px-4 sm:py-10">
      <header className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Route className="h-3.5 w-3.5" />
          <span>Story Journeys</span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Follow a path through the stories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Finish the stories in a journey and it completes itself — there is nothing to join.
        </p>
      </header>

      {/* Journeys an editor has not populated yet are filtered out server-side,
          so an empty page means there are none rather than that they are
          broken. */}
      {journeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">No journeys yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated paths through the collection will appear here.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/library">Browse the library</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {journeys.map((journey) => (
            <JourneyCard key={journey.slug} journey={journey} />
          ))}
        </div>
      )}

      {journeys.length > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link to="/library" className="inline-flex items-center gap-1 text-primary hover:underline">
            Browse everything instead
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      )}
    </div>
  );
};

export default StoryJourneys;
