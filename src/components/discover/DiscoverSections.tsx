import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { authApi } from "@/api/auth";
import { storyApi } from "@/api/story";
import type {
  DiscoverCountry,
  DiscoverGenre,
  DiscoverHiddenGem,
  DiscoverJustAdded,
  DiscoverTrendingItem,
  JourneySummary,
  Story,
} from "@/api/types";
import CoverImage from "@/components/CoverImage";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { JOURNEY_TYPE_LABELS, JUST_ADDED_TABS, formatReaders, justAddedFor, rankChangeLabel } from "@/lib/discover";
import { buildLibraryParams, EMPTY_FILTERS } from "@/lib/libraryParams";
import { FORMAT_META } from "@/lib/storyFormats";

export const SectionHeading = ({ title, hint, action, id }: { title: string; hint?: string; action?: ReactNode; id?: string }) => (
  <div className="mb-3 flex items-end justify-between gap-3" id={id}>
    <div>
      <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground sm:text-sm">{hint}</p>}
    </div>
    {action}
  </div>
);

const textLink = "shrink-0 text-sm font-semibold text-primary hover:underline";

// --- Because you read X (signed in) ---------------------------------------------

/** Recommendations seeded by the story the reader most recently finished. Hidden when signed out, or there is nothing to base it on. */
export const BecauseYouRead = () => {
  const isLoggedIn = useIsLoggedIn();
  const last = useQuery({
    queryKey: ["discover-last-finished"],
    queryFn: async () => (await authApi.getCompletedReading(1)).results[0]?.story ?? null,
    enabled: isLoggedIn,
    staleTime: 60_000,
  });
  const seed = last.data ?? null;
  const recommendations = useQuery({
    queryKey: ["discover-because", seed?.slug],
    queryFn: () => storyApi.getBecauseFinished(seed!.slug),
    enabled: isLoggedIn && Boolean(seed),
    staleTime: 60_000,
  });
  const stories = (recommendations.data ?? []).slice(0, 6);
  if (!isLoggedIn || !seed || stories.length === 0) return null;

  return (
    <section>
      <SectionHeading title={`Because you read ${seed.title}`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {stories.map((story) => (
          <StoryCard key={story.id} {...story} />
        ))}
      </div>
    </section>
  );
};

// --- Trending this week ----------------------------------------------------------

export const TrendingThisWeek = ({ items }: { items: DiscoverTrendingItem[] }) => {
  const shown = items.slice(0, 5);
  if (shown.length === 0) return null;
  const windowDays = shown[0].window_days;
  return (
    <section id="trending">
      <SectionHeading
        title={windowDays === 7 ? "Trending this week" : "Trending this month"}
        hint={`By unique readers, last ${windowDays} days`}
      />
      <ol className="rounded-xl border bg-card px-3.5 shadow-sm">
        {shown.map((item, index) => {
          const change = rankChangeLabel(item.rank_change);
          return (
            <li key={item.story.id} className="border-b last:border-b-0">
              <Link to={`/read/${item.story.slug}`} className="group flex items-center gap-3 py-3">
                <span className="w-5 text-lg font-bold tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="h-12 w-8 shrink-0 overflow-hidden rounded-[3px] bg-muted sm:h-14 sm:w-10">
                  <CoverImage src={item.story.cover_image} alt="" title={item.story.title} author={item.story.author} loading="lazy" className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold group-hover:text-primary">{item.story.title}</span>
                  {item.story.genres?.[0] && <span className="block truncate text-xs text-muted-foreground">{item.story.genres[0]}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs font-medium tabular-nums">{formatReaders(item.readers)}</span>
                  {change.kind !== "same" && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                        change.kind === "up" ? "text-emerald-700" : change.kind === "down" ? "text-rose-700" : "text-muted-foreground"
                      }`}
                    >
                      {change.kind === "up" && <ArrowUp className="h-3 w-3" />}
                      {change.kind === "down" && <ArrowDown className="h-3 w-3" />}
                      {change.text}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

// --- Hidden gems -----------------------------------------------------------------

export const HiddenGems = ({ items }: { items: DiscoverHiddenGem[] }) => {
  const shown = items.slice(0, 3);
  if (shown.length === 0) return null; // nothing earns the name yet: no section rather than a weak list
  return (
    <section>
      <SectionHeading title="Hidden gems" hint="Few readers have found them; most who start them finish." />
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {shown.map((item) => (
          <div key={item.story.id} className="min-w-0">
            <StoryCard {...item.story} />
            <p className="mt-1.5 inline-block max-w-full truncate rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary" title={item.reason}>
              {item.reason}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

// --- Explore the world --------------------------------------------------------------

const countryHref = (code: string) => `/library?${buildLibraryParams({ ...EMPTY_FILTERS, country: code }).toString()}`;

const Collage = ({ covers, label, height = "h-16" }: { covers: string[]; label: string; height?: string }) => (
  <div className={`relative ${height} overflow-hidden rounded-lg bg-muted`} aria-hidden="true">
    {[0, 1, 2].map((slot) => (
      <div
        key={slot}
        className="absolute top-1.5 h-[calc(100%-12px)] aspect-[2/3] overflow-hidden rounded-[3px] shadow ring-2 ring-background"
        style={{ left: `${10 + slot * 28}%`, zIndex: slot === 1 ? 2 : 1, transform: `rotate(${(slot - 1) * 8}deg)` }}
      >
        <CoverImage src={covers[slot]} alt="" title={label} loading="lazy" className="h-full w-full object-cover" />
      </div>
    ))}
  </div>
);

export const ExploreTheWorld = ({ countries }: { countries: DiscoverCountry[] }) => {
  if (countries.length === 0) return null;
  return (
    <section>
      <SectionHeading
        title="Explore the world"
        hint="Stories from the countries with the most to read."
        action={
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/story-map">Open the Story Map</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        {countries.map((country) => (
          <Link
            key={country.code}
            to={countryHref(country.code)}
            className="group flex flex-col gap-2 rounded-xl border bg-card p-2.5 shadow-sm transition-colors hover:border-primary/40"
          >
            <Collage covers={country.covers} label={country.name} height="h-16 sm:h-20" />
            <span className="px-0.5">
              <span className="block truncate text-sm font-semibold group-hover:text-primary">{country.name}</span>
              <span className="text-xs text-muted-foreground">
                {country.count.toLocaleString()} {country.count === 1 ? "story" : "stories"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

// --- Story Journeys --------------------------------------------------------------------

const JourneyCard = ({ journey, showProgress }: { journey: JourneySummary; showProgress: boolean }) => {
  const covers = journey.covers?.length ? journey.covers : journey.cover_image ? [journey.cover_image] : [];
  const percent = journey.total > 0 ? Math.round((journey.completed / journey.total) * 100) : 0;
  return (
    <Link
      to={`/journeys/${journey.slug}`}
      className="group flex gap-3.5 rounded-xl border bg-card p-3.5 shadow-sm transition-colors hover:border-primary/40"
    >
      <span className="relative h-[86px] w-16 shrink-0 overflow-hidden rounded-lg bg-muted" aria-hidden="true">
        {[0, 1].map((slot) => (
          <span
            key={slot}
            className="absolute h-12 w-8 overflow-hidden rounded-[3px] shadow ring-2 ring-background"
            style={slot === 0 ? { left: 8, top: 10, transform: "rotate(-6deg)" } : { left: 26, top: 28 }}
          >
            <CoverImage src={covers[slot] ?? covers[0]} alt="" title={journey.title} loading="lazy" className="h-full w-full object-cover" />
          </span>
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
          {JOURNEY_TYPE_LABELS[journey.type] ?? journey.type}
        </span>
        <span className="mt-1.5 block text-[15px] font-bold leading-snug group-hover:text-primary">{journey.title}</span>
        {journey.description && <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted-foreground">{journey.description}</span>}
        {showProgress && (
          <span className="mt-2 block">
            <span className="block h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${journey.completed} of ${journey.total} read`}>
              <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {journey.completed} of {journey.total} read
            </span>
          </span>
        )}
      </span>
    </Link>
  );
};

export const StoryJourneys = () => {
  const isLoggedIn = useIsLoggedIn();
  // Keyed on sign-in: progress is per reader, and a guest's list must not be reused after logging in.
  const { data } = useQuery({ queryKey: ["journeys", isLoggedIn ? "member" : "guest"], queryFn: storyApi.getJourneys, staleTime: 60_000 });
  const journeys = data?.journeys ?? [];
  if (journeys.length === 0) return null;
  return (
    <section>
      <SectionHeading title="Story Journeys" hint="Curated paths through the library — finish the stories to complete the journey." action={<Link to="/journeys" className={textLink}>All journeys</Link>} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {journeys.map((journey) => (
          <JourneyCard key={journey.slug} journey={journey} showProgress={isLoggedIn} />
        ))}
      </div>
    </section>
  );
};

// --- Just added ------------------------------------------------------------------------

export const JustAddedRail = ({ items }: { items: DiscoverJustAdded[] }) => {
  const [tab, setTab] = useState<(typeof JUST_ADDED_TABS)[number]["key"]>("all");
  if (items.length === 0) return null;
  const shown = justAddedFor(items, tab);
  return (
    <section>
      <SectionHeading title="Just added" hint="The newest arrivals, each under the format it was added in." />
      <div role="tablist" aria-label="Format" className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {JUST_ADDED_TABS.map(({ key, label }) => {
          const count = key === "all" ? items.length : justAddedFor(items, key).length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors ${
                tab === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-slate-400"
              }`}
            >
              {label} <span className="text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Nothing new in this format yet.</p>
      ) : (
        <Carousel opts={{ align: "start", containScroll: "trimSnaps", slidesToScroll: "auto" }} className="-mx-3 sm:mx-0">
          <CarouselContent className="-ml-3 px-3 pb-2 sm:-ml-4 sm:px-0">
            {shown.map(({ story, format }: { story: Story; format: DiscoverJustAdded["format"] }) => (
              <CarouselItem key={story.id} className="basis-auto pl-3 sm:pl-4">
                <div className="relative w-36 sm:w-40">
                  <StoryCard {...story} linkTo={FORMAT_META[format].route(story.slug)} />
                  <span className="pointer-events-none absolute left-2 top-9 z-30 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow">
                    {FORMAT_META[format].label}
                  </span>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious aria-label="Scroll just added left" className="left-2 hidden disabled:invisible sm:flex" />
          <CarouselNext aria-label="Scroll just added right" className="right-2 hidden disabled:invisible sm:flex" />
        </Carousel>
      )}
    </section>
  );
};

// --- Popular genres -----------------------------------------------------------------------

export const PopularGenres = ({ genres }: { genres: DiscoverGenre[] }) => {
  if (genres.length === 0) return null;
  return (
    <section>
      <SectionHeading
        title="Popular genres"
        action={
          <Link to="/library" className={textLink}>
            All genres in the Library <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            to={`/library?${buildLibraryParams({ ...EMPTY_FILTERS, genre: [genre.slug] }).toString()}`}
            className="flex h-12 items-center justify-between rounded-lg border bg-card px-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
          >
            <span className="truncate">{genre.name}</span>
            <span className="ml-2 shrink-0 text-xs font-medium text-muted-foreground">{genre.count.toLocaleString()}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};
