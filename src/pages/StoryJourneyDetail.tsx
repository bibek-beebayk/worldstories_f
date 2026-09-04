import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, Circle, Route } from "lucide-react";
import { storyApi } from "@/api/story";
import StoryCard from "@/components/StoryCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/buildMeta";
import type { Route as RouteType } from "./+types/StoryJourneyDetail";

export function meta({ params }: RouteType.MetaArgs) {
  return buildMeta({
    title: "Story Journey | WorldStories",
    description: "A curated path through the collection.",
    path: `/journeys/${params.slug}`,
  });
}

/**
 * One journey, in order.
 *
 * Each story is marked done or not — the whole value of the page is seeing how
 * far along the path you are, so the state is carried by an icon and the word
 * as well as by styling, the same rule the passport tiles follow.
 */
const StoryJourneyDetail = () => {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["journey", slug],
    queryFn: () => storyApi.getJourney(slug!),
    enabled: Boolean(slug),
  });

  if (isLoading) return <FullScreenLoader />;

  if (isError || !data) {
    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">This journey is not available.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/journeys">All journeys</Link>
        </Button>
      </div>
    );
  }

  const percent = data.total ? Math.round((data.completed / data.total) * 100) : 0;

  return (
    <div className="container px-3 py-8 sm:px-4 sm:py-10">
      <Link
        to="/journeys"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        All journeys
      </Link>

      <header className="mt-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Route className="h-3.5 w-3.5" />
          <span>Story Journey</span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{data.title}</h1>
        {data.description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{data.description}</p>
        )}

        <div className="mt-4 max-w-sm">
          {data.is_complete ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              You have completed this journey.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {data.completed} of {data.total} completed
              </p>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={data.total}
                aria-valuenow={data.completed}
                aria-label={`${data.title} progress`}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
            </>
          )}
        </div>
      </header>

      <ol className="mt-8 space-y-6">
        {data.items.map((item, index) => (
          <li key={item.story.id} className="flex gap-4">
            <div className="flex w-8 shrink-0 flex-col items-center pt-1">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
              {index < data.items.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-2">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {item.completed ? "Completed" : "Not read yet"}
                {!item.required && " · Optional"}
              </p>
              <div className="max-w-[170px]">
                <StoryCard {...item.story} compact />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default StoryJourneyDetail;
