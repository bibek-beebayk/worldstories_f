import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowRight, BookOpenCheck, Circle, Globe2, MapPin } from "lucide-react";
import { authApi } from "@/api/auth";
import type { PassportCountry } from "@/api/types";
import StoryCard from "@/components/StoryCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { getCountryFlag } from "@/lib/countries";
import { buildMeta } from "@/lib/buildMeta";

// Private to the reader and meaningless to a crawler, which sees no passport
// at all — same reasoning as Quick Read's noIndex.
export function meta() {
  return buildMeta({
    title: "My Story Passport | WorldStories",
    description: "The countries you have explored through the stories you have finished.",
    path: "/story-passport",
    noIndex: true,
  });
}

/**
 * Explored / Unexplored / Selected, never by colour alone.
 *
 * §5.5 is explicit about this and it is an accessibility requirement as much
 * as a stylistic one: roughly one in twelve men cannot reliably separate the
 * "explored" tint from the "unexplored" one, so the state is carried by an
 * icon and by the word as well.
 */
const CountryTile = ({
  country,
  isSelected,
  onSelect,
}: {
  country: PassportCountry;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const StateIcon = country.explored ? BookOpenCheck : Circle;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`rounded-lg border p-3 text-left transition-colors ${
        isSelected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : country.explored
          ? "border-primary/30 bg-primary/5 hover:border-primary/50"
          : "border-border bg-muted/20 hover:border-primary/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-start gap-1.5">
          {/* Decorative: the country's name is right beside it, so a screen
              reader announcing "flag of Japan, Japan" would only repeat itself.
              Platforms without flag glyphs draw the two letters instead, which
              is a legible fallback rather than a missing character. */}
          <span aria-hidden="true" className="text-base leading-none">
            {getCountryFlag(country.code)}
          </span>
          <span className="line-clamp-2 text-sm font-semibold">{country.name}</span>
        </span>
        <StateIcon
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
            country.explored ? "text-primary" : "text-muted-foreground"
          }`}
          aria-hidden="true"
        />
      </div>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">
        {country.explored ? "Explored" : "Unexplored"}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {country.stories_completed} of {country.stories_available} read
      </p>
    </button>
  );
};

const StoryPassport = () => {
  const isLoggedIn = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [showUnexplored, setShowUnexplored] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["story-passport"],
    queryFn: authApi.getStoryPassport,
    enabled: isLoggedIn,
  });

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ["story-passport-country", selectedCode],
    queryFn: () => authApi.getPassportCountry(selectedCode!),
    enabled: Boolean(isLoggedIn && selectedCode),
  });

  useEffect(() => {
    if (isLoggedIn) trackAnalyticsEvent({ event_type: "passport_viewed" });
  }, [isLoggedIn]);

  const countries = useMemo(
    () => (data?.countries || []).filter((row) => showUnexplored || row.explored),
    [data, showUnexplored]
  );

  if (!isLoggedIn) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="max-w-sm text-center">
          <Globe2 className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">My Story Passport</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <button type="button" onClick={openLoginModal} className="text-primary hover:underline">
              Log in
            </button>{" "}
            to see the countries you have explored.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) return <FullScreenLoader />;

  if (isError || !data) {
    return (
      <div className="container px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          We could not load your passport right now. Please refresh the page.
        </p>
      </div>
    );
  }

  const hasExplored = data.countries_explored > 0;

  return (
    <div className="container px-3 py-8 sm:px-4 sm:py-10">
      <header className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Globe2 className="h-3.5 w-3.5" />
          <span>My Story Passport</span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {data.countries_explored} {data.countries_explored === 1 ? "country" : "countries"} explored
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.countries_explored} / {data.countries_available} countries with stories on
          WorldStories. A country is added when you finish a story from it.
        </p>
      </header>

      {/* A reader who has finished nothing yet is told how to start, not shown
          an empty grid of grey tiles and left to infer it. */}
      {!hasExplored && (
        <div className="mb-6 rounded-xl border border-dashed border-border p-6 text-center">
          <MapPin className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-medium">Your passport is empty for now.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finish any story and the country it comes from is added here.
          </p>
          <Button asChild className="mt-4">
            <Link to="/library">Find a story</Link>
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={showUnexplored ? "default" : "outline"}
          onClick={() => setShowUnexplored(true)}
        >
          All countries
        </Button>
        <Button
          size="sm"
          variant={showUnexplored ? "outline" : "default"}
          onClick={() => setShowUnexplored(false)}
          disabled={!hasExplored}
        >
          Explored only
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {countries.map((country) => (
          <CountryTile
            key={country.code}
            country={country}
            isSelected={selectedCode === country.code}
            onSelect={() =>
              setSelectedCode((current) => (current === country.code ? null : country.code))
            }
          />
        ))}
      </div>

      {selectedCode && (
        <section className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-5" id="country-detail">
          {detailLoading && !detail ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : detail ? (
            <>
              <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                <span aria-hidden="true" className="text-2xl leading-none sm:text-3xl">
                  {getCountryFlag(detail.code)}
                </span>
                {detail.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.stories_completed} stories completed · {detail.stories_available} stories
                available
              </p>

              {detail.completed.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-3 text-sm font-semibold">Completed</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {detail.completed.map((story) => (
                      <StoryCard key={story.id} {...story} compact />
                    ))}
                  </div>
                </div>
              )}

              {detail.continue_exploring.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold">
                    Continue Exploring {detail.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {detail.continue_exploring.map((story) => (
                      <StoryCard key={story.id} {...story} compact />
                    ))}
                  </div>
                </div>
              )}

              {detail.stories_available === detail.stories_completed && (
                <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-primary">
                  <BookOpenCheck className="h-4 w-4" />
                  You have read everything we have from {detail.name}.
                  <Link to="/story-map" className="inline-flex items-center gap-1 hover:underline">
                    Find somewhere new
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </p>
              )}
            </>
          ) : null}
        </section>
      )}
    </div>
  );
};

export default StoryPassport;
