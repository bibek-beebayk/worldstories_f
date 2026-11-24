import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BookOpen, Headphones, Loader2, Play, Search, X } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import { AudiobookCard } from "@/components/audiobooks/AudiobookCard";
import { AudiobookShelf } from "@/components/audiobooks/AudiobookShelf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAudiobooks,
  useAudiobooksOverview,
  useInfiniteAudiobooks,
  usePublicAudiobookStats,
} from "@/hooks/useAudiobooks";
import { useGenres } from "@/hooks/useGenres";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import {
  AUDIOBOOK_LENGTH_OPTIONS,
  AUDIOBOOK_SORT_OPTIONS,
  buildAudiobookContinueMap,
  buildAudiobookParams,
  DEFAULT_AUDIOBOOK_FILTERS,
  formatAudioDuration,
  hasActiveAudiobookFilters,
  mapAudiobookApiSort,
  parseAudiobookParams,
  type AudiobookFilters,
  type AudiobookLength,
  type AudiobookSort,
} from "@/lib/audiobooks";
import { formatLong } from "@/lib/formatDuration";
import { buildMeta } from "@/lib/buildMeta";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { audiobookUrl } from "@/lib/urls";

const SEARCH_DEBOUNCE_MS = 300;
const STICKY_GAP = 6;

export function meta() {
  return buildMeta({
    title: "Audiobooks — Listen to Stories | WorldStories",
    description:
      "Browse every audiobook on WorldStories — narrated short stories, novels, and more you can listen to anywhere.",
    path: "/audiobooks",
  });
}

const Audiobooks = () => {
  const headerBottom = useHeaderHeight();
  const isSignedIn = useIsLoggedIn();
  const [searchParams, setSearchParams] = useSearchParams();
  const gridRef = useRef<HTMLElement>(null);

  const filters = useMemo(() => parseAudiobookParams(searchParams), [searchParams]);
  const hasFilters = useMemo(() => hasActiveAudiobookFilters(filters), [filters]);

  const updateFilters = useCallback(
    (patch: Partial<AudiobookFilters>, options: { replace?: boolean } = {}) => {
      setSearchParams(buildAudiobookParams({ ...filters, ...patch }), { replace: options.replace });
    },
    [filters, setSearchParams],
  );

  // Local search input debounced by 300ms before updating the URL.
  const [searchInput, setSearchInput] = useState(filters.q);
  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === filters.q) return;
    const timer = window.setTimeout(
      () => updateFilters({ q: trimmed }, { replace: true }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.q, updateFilters]);

  // Hero, series shelves, continue listening & stats from public Audiobook API
  const { data: stats } = usePublicAudiobookStats();
  const { data: overview } = useAudiobooksOverview();
  const { data: genres = [] } = useGenres();

  const continueItems = useMemo(
    () => (isSignedIn ? (overview?.continue_listening ?? []) : []),
    [isSignedIn, overview?.continue_listening],
  );
  const continueHeroItem = continueItems[0] ?? null;
  const featuredAudiobook = overview?.featured ?? null;
  const seriesShelves = overview?.shelves ?? [];

  const progressBySlug = useMemo(() => buildAudiobookContinueMap(continueItems), [continueItems]);
  const trackSlugBySlug = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const item of continueItems) {
      map.set(item.audiobook.slug, item.track_slug);
    }
    return map;
  }, [continueItems]);

  // Duration shelves (default browsing view only)
  const { data: shortShelfData } = useAudiobooks(
    { audio_length: "short", sort: "popular", page: 1 },
    !hasFilters,
  );
  const { data: mediumShelfData } = useAudiobooks(
    { audio_length: "medium", sort: "popular", page: 1 },
    !hasFilters,
  );
  const { data: longShelfData } = useAudiobooks(
    { audio_length: "long", sort: "longest", page: 1 },
    !hasFilters,
  );

  // Main "All audiobooks" grid
  const {
    data: audiobooksData,
    isLoading: isGridLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAudiobooks({
    q: filters.q,
    genre: filters.genre,
    language: filters.language,
    series: filters.series || undefined,
    has_read_along: filters.readalong || undefined,
    audio_length: filters.length,
    sort: mapAudiobookApiSort(filters.sort),
  });

  const audiobooks = useMemo(
    () => audiobooksData?.pages.flatMap((page) => page.results) ?? [],
    [audiobooksData],
  );
  const totalCount = audiobooksData?.pages[0]?.pagination?.count ?? 0;

  const handleShelfSeeAll = (patch: Partial<AudiobookFilters>) => {
    updateFilters(patch);
    window.requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams(buildAudiobookParams(DEFAULT_AUDIOBOOK_FILTERS));
  };

  const totalHours = stats && stats.total_seconds > 0 ? Math.floor(stats.total_seconds / 3600) : 0;
  const heroContinuePercent = continueHeroItem?.progress_percent ?? 0;
  const heroContinueHref = continueHeroItem
    ? audiobookUrl(continueHeroItem.audiobook.slug, continueHeroItem.track_slug)
    : "/audiobooks";
  const featuredDuration = featuredAudiobook
    ? formatLong(featuredAudiobook.total_duration_seconds) ||
      formatAudioDuration(featuredAudiobook.minutes)
    : null;

  const activeSeriesName = filters.series
    ? seriesShelves.find((s) => s.series.slug === filters.series)?.series.name ?? filters.series
    : null;

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      {/* Compact hero (<= 220px tall on desktop) */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-r from-[#D92F4C]/12 via-pink-500/10 to-purple-500/12">
        <div className="container mx-auto px-3 py-5 sm:px-4 md:flex md:max-h-[220px] md:items-center md:justify-between md:gap-6 md:py-6">
          <div className="min-w-0 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#A71B36] dark:text-rose-300">
              <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
              Listen
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Audiobooks
            </h1>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {stats ? (
                <>
                  {stats.count.toLocaleString()} {stats.count === 1 ? "audiobook" : "audiobooks"}
                  {totalHours > 0 && ` · over ${totalHours.toLocaleString()} hours of listening`}
                </>
              ) : (
                "Narrated stories you can listen to anywhere."
              )}
            </p>
          </div>

          <div className="mt-4 w-full shrink-0 md:mt-0 md:w-[360px] lg:w-[400px]">
            {continueHeroItem ? (
              <div className="flex items-center gap-3 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur-sm">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-muted">
                  <CoverImage
                    src={continueHeroItem.audiobook.cover_image}
                    alt=""
                    title={continueHeroItem.audiobook.title}
                    author={continueHeroItem.audiobook.author}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A71B36] dark:text-rose-300">
                    Continue listening
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {continueHeroItem.audiobook.title}
                  </p>
                  {continueHeroItem.track_title && (
                    <p className="truncate text-xs text-muted-foreground">
                      {continueHeroItem.track_title}
                    </p>
                  )}
                  {heroContinuePercent > 0 && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[#D92F4C]"
                          style={{ width: `${heroContinuePercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                        {heroContinuePercent}%
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  asChild
                  size="sm"
                  className="shrink-0 bg-[#D92F4C] text-white hover:bg-[#A71B36]"
                >
                  <Link to={heroContinueHref}>
                    <Play className="mr-1 h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    Resume
                  </Link>
                </Button>
              </div>
            ) : featuredAudiobook ? (
              <div className="flex items-center gap-3 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur-sm">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-muted">
                  <CoverImage
                    src={featuredAudiobook.cover_image}
                    alt=""
                    title={featuredAudiobook.title}
                    author={featuredAudiobook.author}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A71B36] dark:text-rose-300">
                    Featured
                  </p>
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">
                    {featuredAudiobook.title}
                  </p>
                  {featuredAudiobook.author && (
                    <p className="truncate text-xs text-muted-foreground">
                      {featuredAudiobook.author}
                    </p>
                  )}
                  {featuredDuration && (
                    <p className="text-[11px] text-muted-foreground">{featuredDuration}</p>
                  )}
                </div>
                <Button
                  asChild
                  size="sm"
                  className="shrink-0 bg-[#D92F4C] text-white hover:bg-[#A71B36]"
                >
                  <Link to={audiobookUrl(featuredAudiobook.slug)}>
                    <Play className="mr-1 h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    Play
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Filter bar — sticky below site header on desktop, normal flow on mobile */}
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
                placeholder="Search audiobooks, authors, narrators…"
                aria-label="Search audiobooks"
                className="h-9 pl-8 pr-8 text-sm"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 md:ml-auto md:flex md:items-center">
              <Select value={filters.genre} onValueChange={(genre) => updateFilters({ genre })}>
                <SelectTrigger className="h-9 text-xs sm:text-sm md:w-[150px]" aria-label="Filter by genre">
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

              <Select
                value={filters.language}
                onValueChange={(language) => updateFilters({ language })}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm md:w-[140px]" aria-label="Filter by language">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.sort}
                onValueChange={(sort) => updateFilters({ sort: sort as AudiobookSort })}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm md:w-[150px]" aria-label="Sort audiobooks">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIOBOOK_SORT_OPTIONS.map((opt) => (
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
            aria-label="Audio length and format filters"
          >
            {AUDIOBOOK_LENGTH_OPTIONS.map((opt) => {
              const active = filters.length === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateFilters({ length: opt.value as AudiobookLength })}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] ${
                    active
                      ? "border-[#D92F4C] bg-[#D92F4C] text-white"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}

            <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />

            <button
              type="button"
              aria-pressed={filters.readalong}
              onClick={() => updateFilters({ readalong: !filters.readalong })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] ${
                filters.readalong
                  ? "border-[#D92F4C] bg-[#D92F4C]/10 text-[#A71B36] dark:text-rose-300"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Has read-along
            </button>

            {activeSeriesName && (
              <button
                type="button"
                onClick={() => updateFilters({ series: "" })}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D92F4C] bg-[#D92F4C]/10 px-3 py-1.5 text-xs font-medium text-[#A71B36] dark:text-rose-300"
              >
                Series: {activeSeriesName}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto space-y-10 px-3 py-6 sm:px-4 sm:py-8">
        {/* Default browsing shelves */}
        {!hasFilters && (
          <div className="space-y-8">
            {continueItems.length > 0 && (
              <AudiobookShelf
                title="Continue listening"
                subtitle="Pick up right where you left off"
                audiobooks={continueItems.map((i) => i.audiobook)}
                progressBySlug={progressBySlug}
                trackSlugBySlug={trackSlugBySlug}
                minItems={1}
              />
            )}

            {seriesShelves.map((shelf) => (
              <AudiobookShelf
                key={shelf.series.slug}
                title={shelf.series.name}
                subtitle={shelf.series.description || "Curated audiobook series"}
                audiobooks={shelf.audiobooks}
                progressBySlug={progressBySlug}
                minItems={1}
                onSeeAll={() => handleShelfSeeAll({ series: shelf.series.slug })}
              />
            ))}

            <AudiobookShelf
              title="Quick listens"
              subtitle="Under 30 minutes — perfect for a walk or coffee break"
              audiobooks={shortShelfData?.results ?? []}
              progressBySlug={progressBySlug}
              onSeeAll={() => handleShelfSeeAll({ length: "short" })}
            />
            <AudiobookShelf
              title="Evening listens"
              subtitle="30 minutes to 2 hours — settle in for a full story"
              audiobooks={mediumShelfData?.results ?? []}
              progressBySlug={progressBySlug}
              onSeeAll={() => handleShelfSeeAll({ length: "medium" })}
            />
            <AudiobookShelf
              title="Long listens"
              subtitle="2 hours and up — deeper novels and multi-part journeys"
              audiobooks={longShelfData?.results ?? []}
              progressBySlug={progressBySlug}
              onSeeAll={() => handleShelfSeeAll({ length: "long" })}
            />
          </div>
        )}

        {/* All audiobooks grid */}
        <section ref={gridRef} aria-label="All audiobooks" className="scroll-mt-32 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            {hasFilters ? (
              <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
                {isGridLoading
                  ? "Loading audiobooks…"
                  : `${totalCount.toLocaleString()} ${totalCount === 1 ? "audiobook" : "audiobooks"}`}
              </p>
            ) : (
              <h2 className="font-serif text-lg font-bold tracking-tight text-foreground sm:text-xl">
                All audiobooks
              </h2>
            )}
          </div>

          {isGridLoading ? (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              aria-label="Loading audiobooks"
            >
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="aspect-[3/4] animate-pulse rounded-md bg-muted" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : audiobooks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium text-foreground">
                No audiobooks match these filters
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {audiobooks.map((ab) => (
                  <AudiobookCard
                    key={ab.id}
                    audiobook={ab}
                    progressPercent={progressBySlug.get(ab.slug)}
                  />
                ))}
              </div>

              {hasNextPage && (
                <div className="flex justify-center pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                    className="min-w-[140px]"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Loading…
                      </>
                    ) : (
                      "Show more"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default Audiobooks;
