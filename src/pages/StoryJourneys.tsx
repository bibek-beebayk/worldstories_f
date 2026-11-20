import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { CheckCircle2, Route } from "lucide-react";
import { storyApi } from "@/api/story";
import type { JourneySummary } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import FullScreenLoader from "@/components/FullScreenLoader";
import JourneyProgress from "@/components/JourneyProgress";
import { Button } from "@/components/ui/button";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { buildMeta } from "@/lib/buildMeta";
import { bestJourneyToContinue, journeyActionLabel, journeyState, orderJourneys } from "@/lib/journeys";

const TYPE_LABELS: Record<string, string> = {
  curated: "Curated",
  country: "Country",
  genre: "Genre",
  theme: "Theme",
};

export function meta() {
  return buildMeta({
    title: "Story Journeys | WorldStories",
    description: "Curated paths through the collection — folklore, ghost stories, trickster tales and more.",
    path: "/journeys",
  });
}

const JourneyCard = ({ journey }: { journey: JourneySummary }) => {
  const state = journeyState(journey);
  const cover = journey.covers?.[0] || journey.cover_image;

  return (
    <Link
      to={`/journeys/${journey.slug}`}
      className="group flex min-h-44 gap-4 rounded-sm border bg-card p-3 shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm sm:block sm:min-h-0 sm:p-0"
    >
      <div className="relative h-[104px] w-[78px] shrink-0 overflow-hidden rounded-sm bg-muted sm:hidden">
        <CoverImage src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>

      <div className="relative hidden h-[150px] overflow-visible rounded-t-sm bg-muted sm:block">
        {cover && (
          <>
            {/* Clipped on its own: the blur is scaled past the banner, which itself must stay
                unclipped so the sharp cover can overlap its bottom edge. */}
            <span className="absolute inset-0 overflow-hidden rounded-t-sm">
              <CoverImage
                src={cover}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl"
              />
              <span className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background/20 to-background/80" />
            </span>
            <div className="absolute -bottom-7 left-5 h-[122px] w-[92px] overflow-hidden rounded-sm border-2 border-card bg-muted shadow-lg">
              <CoverImage src={cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </div>
          </>
        )}
        <span className="absolute right-3 top-3 rounded-full border border-white/30 bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {TYPE_LABELS[journey.type] || "Curated"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col sm:px-5 sm:pb-5 sm:pt-11">
        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
          <span className="font-semibold text-primary">{TYPE_LABELS[journey.type] || "Curated"}</span>
          <span aria-hidden="true">·</span>
          <span>{journey.total} stories</span>
        </div>
        <h2 className="mt-1 text-lg font-bold leading-tight tracking-tight group-hover:text-primary sm:text-xl">
          {journey.title}
        </h2>
        {journey.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{journey.description}</p>
        )}

        {state !== "start" && (
          <JourneyProgress
            completed={journey.completed}
            total={journey.total}
            label={`${journey.title}: ${journey.completed} of ${journey.total} completed`}
            className="mt-3"
          />
        )}

        <div className="mt-auto flex min-h-11 items-end justify-between gap-3 pt-3 text-sm sm:mt-4 sm:border-t">
          <span className="text-muted-foreground">
            {journey.total} stories · {journey.completed} read
          </span>
          <span className="shrink-0 font-semibold text-primary">
            {state === "review" && <CheckCircle2 className="mr-1 inline h-4 w-4" />}
            {journeyActionLabel(journey)}
          </span>
        </div>
        {state === "review" && (
          <span className="text-right text-xs font-medium text-primary sm:mt-1">Journey complete</span>
        )}
      </div>
    </Link>
  );
};

const ContinueJourney = ({ journey }: { journey: JourneySummary }) => {
  const cover = journey.covers?.[0] || journey.cover_image;
  return (
    <section className="relative mb-10 overflow-hidden rounded-sm bg-slate-950 p-5 text-white shadow-xl sm:p-7" aria-label="Continue where you left off">
      {cover && <CoverImage src={cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-15 blur-2xl" />}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-indigo-950/85" />
      <div className="relative grid gap-5 sm:grid-cols-[92px_1fr] sm:items-center lg:grid-cols-[92px_1fr_auto]">
        <div className="flex items-center gap-4 sm:block">
          <div className="h-[122px] w-[92px] shrink-0 overflow-hidden rounded-sm bg-white/10 shadow-lg">
            <CoverImage src={cover} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="sm:hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Continue where you left off</p>
            <h2 id="continue-journey-title-mobile" className="mt-1 text-xl font-bold">{journey.title}</h2>
          </div>
        </div>
        <div>
          <p className="hidden text-xs font-semibold uppercase tracking-wider text-indigo-200 sm:block">Continue where you left off</p>
          <h2 id="continue-journey-title" className="mt-1 hidden text-2xl font-bold sm:block">{journey.title}</h2>
          {journey.description && <p className="mt-2 max-w-2xl text-sm text-slate-300">{journey.description}</p>}
          <JourneyProgress
            completed={journey.completed}
            total={journey.total}
            label={`${journey.title}: ${journey.completed} of ${journey.total} completed`}
            className="mt-4 [&>div]:bg-indigo-400"
          />
          <p className="mt-2 text-sm text-slate-300">{journey.completed} of {journey.total} completed</p>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row lg:col-span-1 lg:flex-col">
          {journey.next_story && (
            <Button asChild className="min-h-11 w-full bg-white text-slate-950 hover:bg-slate-100">
              <Link to={`/story/${journey.next_story.slug}`}>Continue with {journey.next_story.title}</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="min-h-11 w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link to={`/journeys/${journey.slug}`}>See the whole path</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

const StoryJourneys = () => {
  const isLoggedIn = useIsLoggedIn();
  // Keyed on sign-in: progress is per reader, so a guest's list must not be reused after logging in.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["journeys", isLoggedIn ? "member" : "guest"],
    queryFn: storyApi.getJourneys,
  });

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <div className="container px-4 py-12 text-center"><p className="text-sm text-muted-foreground">We could not load the journeys right now. Please refresh the page.</p></div>;

  const journeys = data?.journeys || [];
  const continueJourney = isLoggedIn ? bestJourneyToContinue(journeys) : null;
  const gridJourneys = orderJourneys(journeys.filter((journey) => journey.slug !== continueJourney?.slug));
  const inProgress = journeys.filter((journey) => journey.completed > 0 && journey.completed < journey.total).length;
  const completed = journeys.filter((journey) => journey.is_complete).length;
  const unexplored = journeys.filter((journey) => journey.completed === 0).length;

  return (
    <div className="container px-3 py-8 sm:px-4 sm:py-12">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Route className="h-3.5 w-3.5" /> Story Journeys
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Follow a path through the stories</h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Pick a path and read its stories in order. Finish them all and the journey completes itself — nothing to join, nothing to switch on.
          </p>
        </div>
        {isLoggedIn && journeys.some((journey) => journey.completed > 0) && (
          <div className="flex flex-wrap gap-2" aria-label="Journey summary">
            <span className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium">{inProgress} in progress</span>
            <span className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium">{completed} completed</span>
            <span className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium">{unexplored} to explore</span>
          </div>
        )}
      </header>

      {journeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">No journeys yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Curated paths through the collection will appear here.</p>
          <Button asChild className="mt-4" variant="outline"><Link to="/library">Browse the library</Link></Button>
        </div>
      ) : (
        <>
          {continueJourney && <ContinueJourney journey={continueJourney} />}
          <section aria-labelledby="journeys-grid-heading">
            <h2 id="journeys-grid-heading" className="font-display text-2xl font-bold tracking-tight">
              {continueJourney ? "More journeys to explore" : "All journeys"}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">
              {gridJourneys.map((journey) => <JourneyCard key={journey.slug} journey={journey} />)}
            </div>
          </section>
        </>
      )}

      {journeys.length > 0 && <p className="mt-8 text-sm"><Link to="/library" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">Browse everything instead →</Link></p>}
    </div>
  );
};

export default StoryJourneys;
