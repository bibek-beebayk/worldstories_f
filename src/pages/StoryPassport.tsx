import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { Globe2, MapPin } from "lucide-react";
import { authApi } from "@/api/auth";
import CountryDetail from "@/components/passport/CountryDetail";
import CountryTile from "@/components/passport/CountryTile";
import NextStamps from "@/components/passport/NextStamps";
import PassportHeader from "@/components/passport/PassportHeader";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthModal } from "@/context/AuthModalContext";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { buildMeta } from "@/lib/buildMeta";
import { filterCountries, pickNextStamps, sortCountries, type PassportFilter, type PassportSort } from "@/lib/passport";

// Private to the reader and meaningless to a crawler, which sees no passport
// at all â€” same reasoning as Quick Read's noIndex.
export function meta() {
  return buildMeta({
    title: "My Story Passport | WorldStories",
    description: "The countries you have explored through the stories you have finished.",
    path: "/story-passport",
    noIndex: true,
  });
}

const StoryPassport = () => {
  const isLoggedIn = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<PassportFilter>("all");
  const [sort, setSort] = useState<PassportSort>("most");
  const [showAllMobile, setShowAllMobile] = useState(false);
  const clickedSelectionRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["story-passport"],
    queryFn: authApi.getStoryPassport,
    enabled: isLoggedIn,
  });

  const requestedCode = searchParams.get("country")?.toUpperCase() || null;
  const selectedCode = data?.countries.some((country) => country.code === requestedCode) ? requestedCode : null;

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ["story-passport-country", selectedCode],
    queryFn: () => authApi.getPassportCountry(selectedCode!),
    enabled: Boolean(isLoggedIn && selectedCode),
  });

  useEffect(() => {
    if (isLoggedIn) trackAnalyticsEvent({ event_type: "passport_viewed" });
  }, [isLoggedIn]);

  useEffect(() => {
    if (!selectedCode || detail?.code !== selectedCode || clickedSelectionRef.current !== selectedCode) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      headingRef.current?.focus({ preventScroll: true });
      clickedSelectionRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [detail?.code, prefersReducedMotion, selectedCode]);

  const countries = useMemo(
    () => sortCountries(filterCountries(data?.countries || [], filter), sort),
    [data?.countries, filter, sort],
  );
  const nextStamps = useMemo(() => pickNextStamps(data?.countries || []), [data?.countries]);
  const selectedIndex = countries.findIndex((country) => country.code === selectedCode);
  const revealAllTiles = showAllMobile || selectedIndex >= 8;

  const updateCountryParam = (code: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (code) nextParams.set("country", code);
    else nextParams.delete("country");
    setSearchParams(nextParams);
  };

  const selectCountry = (code: string) => {
    if (selectedCode === code) {
      clickedSelectionRef.current = null;
      updateCountryParam(null);
      return;
    }
    clickedSelectionRef.current = code;
    updateCountryParam(code);
  };

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
  const unexploredCount = data.countries_available - data.countries_explored;

  return (
    <div className="container min-w-0 overflow-x-clip px-3 py-8 sm:px-4 sm:py-10">
      <PassportHeader explored={data.countries_explored} available={data.countries_available} />

      {/* A reader who has finished nothing yet is told how to start, not shown
          an empty grid of grey tiles and left to infer it. */}
      {!hasExplored && (
        <div className="mb-8 rounded-xl border border-dashed border-border p-6 text-center">
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

      <NextStamps countries={nextStamps} />

      <section aria-labelledby="passport-countries-heading">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="passport-countries-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
              Countries
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["all", `All ${data.countries_available}`],
                  ["explored", `Explored ${data.countries_explored}`],
                  ["unexplored", `Unexplored ${unexploredCount}`],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filter === value ? "default" : "outline"}
                  disabled={value === "explored" && !hasExplored}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="passport-sort">
              Sort by
            </label>
            <Select value={sort} onValueChange={(value: PassportSort) => setSort(value)}>
              <SelectTrigger id="passport-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most">Most stories</SelectItem>
                <SelectItem value="az">A to Z</SelectItem>
                <SelectItem value="progress">Most progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
          {countries.map((country, index) => (
            <CountryTile
              key={country.code}
              country={country}
              isSelected={selectedCode === country.code}
              onSelect={() => selectCountry(country.code)}
              className={index >= 8 && !revealAllTiles ? "hidden sm:block" : undefined}
            />
          ))}
        </div>
        {countries.length > 8 && !revealAllTiles && (
          <Button
            type="button"
            variant="outline"
            className="mt-4 min-h-11 w-full sm:hidden"
            onClick={() => setShowAllMobile(true)}
          >
            Show all {countries.length} countries
          </Button>
        )}
      </section>

      {selectedCode && (
        <CountryDetail
          detail={detail}
          loading={detailLoading}
          onClose={() => updateCountryParam(null)}
          panelRef={panelRef}
          headingRef={headingRef}
        />
      )}
    </div>
  );
};

export default StoryPassport;
