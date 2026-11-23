import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CheckCircle2, Headphones, Loader2, Search, X, Zap } from "lucide-react";
import { storyApi } from "@/api/story";
import CoverImage from "@/components/CoverImage";
import FullScreenLoader from "@/components/FullScreenLoader";
import NewsletterSignupCard from "@/components/NewsletterSignupCard";
import { QuickReadCard } from "@/components/quickreads/QuickReadCard";
import { QuickReadShelf } from "@/components/quickreads/QuickReadShelf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGenres } from "@/hooks/useGenres";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { useInfiniteStories } from "@/hooks/useInfiniteStories";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useQuickReadHero } from "@/hooks/useQuickReadHero";
import { buildMeta } from "@/lib/buildMeta";
import {
  buildQuickReadParams,
  DEFAULT_QUICK_READ_FILTERS,
  findMysteryGenre,
  hasActiveQuickReadFilters,
  parseQuickReadParams,
  QUICK_READ_SORT_OPTIONS,
  QUICK_READ_TIME_OPTIONS,
  timeChipToSummaryLength,
  type QuickReadFilters,
  type QuickReadSort,
} from "@/lib/quickReads";

const SEARCH_DEBOUNCE_MS = 300;
const STICKY_GAP = 6;

export function meta() {
  return buildMeta({
    title: "Quick Reads — Story Summaries | WorldStories",
    description:
      "Short story summaries for busy readers. Every Quick Read links through to the full story on WorldStories.",
    path: "/quick-reads",
  });
}

const QuickReads = () => {
  const isAuthenticated = useIsLoggedIn();
  const headerBottom = useHeaderHeight();
  const [searchParams, setSearchParams] = useSearchParams();
  const gridRef = useRef<HTMLElement>(null);
  const hasLoadedOnceRef = useRef(false);

  const rawFilters = useMemo(() => parseQuickReadParams(searchParams), [searchParams]);
  const filters = useMemo<QuickReadFilters>(
    () => (isAuthenticated ? rawFilters : { ...rawFilters, unread: false }),
    [isAuthenticated, rawFilters],
  );
  const hasFilters = useMemo(() => hasActiveQuickReadFilters(filters), [filters]);

  const updateFilters = useCallback(
    (patch: Partial<QuickReadFilters>, options: { replace?: boolean } = {}) => {
      setSearchParams(buildQuickReadParams({ ...filters, ...patch }), { replace: options.replace });
    },
    [filters, setSearchParams],
  );

  // Local search input debounced 300ms before updating the URL.
  const [searchInput, setSearchInput] = useState(filters.q);
  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === filters.q) return;
    const timer = window.setTimeout(() => updateFilters({ q: trimmed }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.q, updateFilters]);

  const { data: genres = [] } = useGenres();
  const mysteryGenre = useMemo(() => findMysteryGenre(genres), [genres]);
  const { data: heroData } = useQuickReadHero(true);

  // Shelves (shown only when no filter, search, or non-default sort is active)
  const { data: under3ShelfData } = useQuery({
    queryKey: ["quick-reads-shelf", "under3"],
    queryFn: () =>
      storyApi.getStories(
        1,
        [],
        "popular",
        "all",
        "",
        "all",
        "all",
        [],
        false,
        true,
        "all",
        false,
        [],
        false,
        "all",
        "all",
        undefined,
        "under3",
        false,
      ),
    enabled: !hasFilters,
    staleTime: 5 * 60 * 1000,
  });

  const { data: mysteryShelfData } = useQuery({
    queryKey: ["quick-reads-shelf", "mystery", mysteryGenre?.id],
    queryFn: () =>
      storyApi.getStories(
        1,
        mysteryGenre ? [mysteryGenre.id] : [],
        "popular",
        "all",
        "",
        "all",
        "all",
        [],
        false,
        true,
      ),
    enabled: !hasFilters && Boolean(mysteryGenre),
    staleTime: 5 * 60 * 1000,
  });

  // Main "All quick reads" grid
  const genreIds = useMemo(() => (filters.genre !== "all" ? [Number(filters.genre)] : []), [filters.genre]);
  const {
    data: storiesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteStories(
    genreIds,
    filters.sort,
    "all",
    filters.q,
    "all",
    "all",
    true,
    [],
    filters.audio,
    true,
    false,
    [],
    false,
    "all",
    timeChipToSummaryLength(filters.time),
    filters.unread,
  );

  useEffect(() => {
    if (storiesData) {
      hasLoadedOnceRef.current = true;
    }
  }, [storiesData]);

  const stories = useMemo(() => storiesData?.pages.flatMap((page) => page.results) ?? [], [storiesData]);
  const totalCount = storiesData?.pages[0]?.pagination?.count ?? 0;

  const mostUnder5Minutes = useMemo(() => {
    const measured = stories.filter((s) => typeof s.summary_reading_minutes === "number");
    if (measured.length === 0) return false;
    const under5 = measured.filter((s) => (s.summary_reading_minutes as number) <= 5).length;
    return under5 > measured.length / 2;
  }, [stories]);

  const scrollToGrid = () => {
    window.requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams(buildQuickReadParams(DEFAULT_QUICK_READ_FILTERS));
  };

  if (isLoading && !hasLoadedOnceRef.current) return <FullScreenLoader />;

  const heroStory = heroData && heroData.mode !== "none" ? heroData.story : null;
  const showHeroContinue = isAuthenticated && heroData?.mode === "continue";
  const heroContinuePercent =
    showHeroContinue && heroData?.mode === "continue"
      ? Math.max(1, Math.min(99, Math.round(heroData.progress * 100)))
      : 0;

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      {/* Compact amber hero (<= ~190px tall on desktop) */}
      <section className="relative overflow-hidden themed-banner [--banner-from:#f59e0b] [--banner-via:#f97316] [--banner-to:#d97706]">
        <Zap aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 text-white/10" />

        <div className="container relative mx-auto px-3 py-5 sm:px-4 md:flex md:max-h-[190px] md:items-center md:justify-between md:gap-6 md:py-5">
          <div className="min-w-0 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              <Zap className="h-3 w-3" aria-hidden="true" />
              Quick Read
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">Quick Reads</h1>
            <p className="max-w-xl text-sm opacity-95">
              {totalCount.toLocaleString()} {totalCount === 1 ? "story summary" : "story summaries"}.{" "}
              {mostUnder5Minutes
                ? "Most take under 5 minutes, and each one links to the full story."
                : "Each one links to the full story."}
            </p>
          </div>

          {heroStory && (
            <div className="mt-4 w-full shrink-0 md:mt-0 md:w-[370px] lg:w-[410px]">
              <div className="flex items-center gap-3 rounded-lg border border-white/25 bg-white/95 p-3 text-slate-900 shadow-md backdrop-blur-sm dark:bg-slate-900/95 dark:text-slate-100">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-muted">
                  <CoverImage
                    src={heroStory.cover_image}
                    alt=""
                    title={heroStory.title}
                    author={heroStory.author}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#92400E] dark:text-amber-300">
                    {showHeroContinue ? "Pick up where you left off" : "Today's pick"}
                  </p>
                  <p className="truncate text-sm font-semibold">{heroStory.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      heroStory.summary_reading_minutes != null
                        ? `${heroStory.summary_reading_minutes} min read`
                        : null,
                      showHeroContinue ? `${heroContinuePercent}% done` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {showHeroContinue && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950">
                      <div className="h-full rounded-full bg-[#B45309]" style={{ width: `${heroContinuePercent}%` }} />
                    </div>
                  )}
                </div>
                <Button asChild size="sm" className="min-h-[40px] shrink-0 bg-[#B45309] text-white hover:bg-[#92400E]">
                  <Link to={`/quick-read/${heroStory.slug}`}>{showHeroContinue ? "Continue" : "Read now"}</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sticky filter bar on desktop, normal flow on phones */}
      <div
        className="z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:sticky"
        style={{ top: headerBottom > 0 ? headerBottom + STICKY_GAP : undefined }}
      >
        <div className="container mx-auto space-y-2.5 px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-sm md:flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search quick reads, authors, genres…"
                aria-label="Search quick reads"
                className="h-10 pl-8 pr-8 text-sm md:h-9"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 md:ml-auto md:flex md:items-center">
              <Select value={filters.genre} onValueChange={(genre) => updateFilters({ genre })}>
                <SelectTrigger className="h-10 text-xs sm:text-sm md:h-9 md:w-[160px]" aria-label="Filter by genre">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genres</SelectItem>
                  {genres.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.sort} onValueChange={(sort) => updateFilters({ sort: sort as QuickReadSort })}>
                <SelectTrigger className="h-10 text-xs sm:text-sm md:h-9 md:w-[160px]" aria-label="Sort quick reads">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {QUICK_READ_SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Reading time and status filters"
          >
            {QUICK_READ_TIME_OPTIONS.map((opt) => {
              const active = filters.time === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateFilters({ time: opt.value })}
                  className={`min-h-[44px] shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] sm:min-h-[34px] sm:px-3 ${
                    active
                      ? "border-[#B45309] bg-[#B45309] text-white"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}

            <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />

            {isAuthenticated && (
              <button
                type="button"
                aria-pressed={filters.unread}
                onClick={() => updateFilters({ unread: !filters.unread })}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] sm:min-h-[34px] sm:px-3 ${
                  filters.unread
                    ? "border-[#B45309] bg-amber-50 text-[#92400E] dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Not read yet
              </button>
            )}

            <button
              type="button"
              aria-pressed={filters.audio}
              onClick={() => updateFilters({ audio: !filters.audio })}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] sm:min-h-[34px] sm:px-3 ${
                filters.audio
                  ? "border-[#B45309] bg-amber-50 text-[#92400E] dark:bg-amber-950/40 dark:text-amber-300"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
              Has audio
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto space-y-10 px-3 py-6 sm:px-4 sm:py-8">
        {/* Shelves (default browsing view only) */}
        {!hasFilters && (
          <div className="space-y-8">
            <QuickReadShelf
              title="Under 3 minutes"
              subtitle="Bite-sized story summaries you can finish in a couple of minutes"
              stories={under3ShelfData?.results ?? []}
              showProgress={isAuthenticated}
              onSeeAll={() => {
                updateFilters({ time: "under3" });
                scrollToGrid();
              }}
            />
            {mysteryGenre && (
              <QuickReadShelf
                title="Mystery and detection"
                subtitle="Puzzles, twists, and classic whodunits in summary form"
                stories={mysteryShelfData?.results ?? []}
                showProgress={isAuthenticated}
                onSeeAll={() => {
                  updateFilters({ genre: String(mysteryGenre.id) });
                  scrollToGrid();
                }}
              />
            )}
          </div>
        )}

        {/* All quick reads grid */}
        <section ref={gridRef} aria-label="All quick reads" className="scroll-mt-32 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-lg font-bold tracking-tight text-foreground sm:text-xl">All quick reads</h2>
            {!isLoading && (
              <p className="text-xs text-muted-foreground sm:text-sm" aria-live="polite">
                {totalCount.toLocaleString()} {totalCount === 1 ? "summary" : "summaries"}
              </p>
            )}
          </div>

          {isLoading ? (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              aria-label="Loading quick reads"
            >
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : stories.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium text-foreground">No quick reads match these filters</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 min-h-[44px] sm:min-h-[36px]"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {stories.map((story) => (
                  <QuickReadCard key={story.id} story={story} showProgress={isAuthenticated} />
                ))}
              </div>

              <div className="flex flex-col items-center gap-3 pt-4 text-center">
                {hasNextPage && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                    className="min-h-[44px] min-w-[160px]"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Loading...
                      </>
                    ) : (
                      "Show more"
                    )}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  Showing {stories.length.toLocaleString()} of {totalCount.toLocaleString()}
                </p>

                <p className="text-sm text-muted-foreground">
                  Want the whole story?{" "}
                  <Link
                    to="/library"
                    className="inline-flex items-center gap-1 font-semibold text-[#92400E] hover:underline dark:text-amber-300"
                  >
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    Browse the full library
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </p>
              </div>
            </>
          )}
        </section>

        {/* Weekly digest block */}
        <section aria-label="Weekly digest" className="pt-2">
          <NewsletterSignupCard variant="inline" source="prompt" />
        </section>
      </main>
    </div>
  );
};

export default QuickReads;
