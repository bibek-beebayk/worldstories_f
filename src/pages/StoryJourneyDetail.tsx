import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, Circle, Route } from "lucide-react";
import { storyApi } from "@/api/story";
import type { JourneyDetail } from "@/api/types";
import FullScreenLoader from "@/components/FullScreenLoader";
import JourneyProgress from "@/components/JourneyProgress";
import NotFoundBody from "@/components/NotFoundBody";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { buildMeta } from "@/lib/buildMeta";
import { isStoryNotFoundData, loadOr404 } from "@/lib/storyLoader";
import type { Route as RouteType } from "./+types/StoryJourneyDetail";

const TYPE_LABELS: Record<string, string> = {
  curated: "Curated",
  country: "Country",
  genre: "Genre",
  theme: "Theme",
};

export async function loader({ params }: RouteType.LoaderArgs) {
  return loadOr404(() => storyApi.getJourney(params.slug!));
}

export function meta({ data, params }: RouteType.MetaArgs) {
  if (!data || isStoryNotFoundData(data)) {
    return buildMeta({
      title: "Story Journey Not Found | WorldStories",
      description: "The requested story journey could not be found.",
      path: `/journeys/${params.slug}`,
      noIndex: true,
    });
  }
  return buildMeta({
    title: `${data.title} — Story Journey | WorldStories`,
    description:
      data.description || `A curated path through the collection: ${data.total} stories to read in order.`,
    path: `/journeys/${data.slug}`,
    image: data.cover_image,
  });
}

const JourneyAction = ({ journey, mobile = false }: { journey: JourneyDetail; mobile?: boolean }) => {
  if (!journey.is_complete && !journey.next_story) return null;
  const label = journey.is_complete
    ? "Review the journey"
    : `${journey.completed > 0 ? "Continue" : "Start"} with ${journey.next_story!.title}`;
  const href = journey.is_complete ? "#journey-stories" : `/story/${journey.next_story!.slug}`;
  return (
    <Button asChild size="lg" className={mobile ? "min-h-12 w-full" : "min-h-11"}>
      <Link to={href}>{label}</Link>
    </Button>
  );
};

const StoryJourneyDetailContent = () => {
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
        <Button asChild className="mt-4" variant="outline"><Link to="/journeys">All journeys</Link></Button>
      </div>
    );
  }

  return (
    <div className="container px-3 pb-28 pt-8 sm:px-4 sm:pb-12 sm:pt-10">
      <Link to="/journeys" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All journeys
      </Link>

      <header className="mt-5 rounded-sm border bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <Route className="h-3.5 w-3.5" /> {TYPE_LABELS[data.type] || "Curated"} journey
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{data.title}</h1>
            {data.description && <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">{data.description}</p>}
            <div className="mt-5 max-w-xl">
              <JourneyProgress completed={data.completed} total={data.total} label={`${data.title}: ${data.completed} of ${data.total} completed`} />
              <p className="mt-2 text-sm font-medium text-muted-foreground">{data.completed} of {data.total} completed</p>
            </div>
          </div>
          <div className="hidden sm:block"><JourneyAction journey={data} /></div>
        </div>
      </header>

      <ol id="journey-stories" className="mt-10 space-y-7" aria-label="Stories in this journey">
        {data.items.map((item, index) => (
          <li key={item.story.id} className="grid grid-cols-[40px_1fr] gap-3 sm:grid-cols-[48px_1fr] sm:gap-5">
            <div className="flex flex-col items-center">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${item.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                {item.completed ? <CheckCircle2 className="h-5 w-5" aria-label="Completed" /> : index + 1}
              </span>
              {index < data.items.length - 1 && <span className="mt-2 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>
            <div className="min-w-0 pb-2">
              <p className="mb-2 flex min-h-6 items-center gap-2 text-sm font-medium text-muted-foreground">
                {item.completed ? <><CheckCircle2 className="h-4 w-4 text-primary" /> Completed</> : <><Circle className="h-4 w-4" /> Not read yet</>}
                {!item.required && <span className="rounded-full border px-2 py-0.5 text-xs">Optional</span>}
              </p>
              <div className="max-w-[180px] sm:max-w-[210px]"><StoryCard {...item.story} compact linkTo={`/story/${item.story.slug}`} /></div>
            </div>
          </li>
        ))}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <JourneyAction journey={data} mobile />
      </div>
    </div>
  );
};

const StoryJourneyDetail = ({ loaderData }: RouteType.ComponentProps) =>
  isStoryNotFoundData(loaderData) ? <NotFoundBody /> : <StoryJourneyDetailContent />;

export default StoryJourneyDetail;
