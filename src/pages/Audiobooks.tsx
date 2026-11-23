import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Headphones, Loader2, Play, Search, X } from "lucide-react";
import { storyApi } from "@/api/story";
import type { Story } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import { AudiobookCard } from "@/components/audiobooks/AudiobookCard";
import { AudiobookShelf } from "@/components/audiobooks/AudiobookShelf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAudiobookStats } from "@/hooks/useAudiobookStats";
import { useContinueListening } from "@/hooks/useContinueListening";
import { useGenres } from "@/hooks/useGenres";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { useInfiniteStories } from "@/hooks/useInfiniteStories";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import {
  AUDIOBOOK_LENGTH_OPTIONS,
  AUDIOBOOK_SORT_OPTIONS,
  buildAudiobookParams,
  buildContinueListeningMap,
  DEFAULT_AUDIOBOOK_FILTERS,
  formatAudioDuration,
  hasActiveAudiobookFilters,
  parseAudiobookParams,
  type AudiobookFilters,
  type AudiobookLength,
  type AudiobookSort,
} from "@/lib/audiobooks";
import { buildMeta } from "@/lib/buildMeta";
import { LANGUAGE_OPTIONS } from "@/lib/languages";

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
    const timer = window.setTimeout(() => updateFilters({ q: trimmed }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.q, updateFilters]);

  // Hero & filter reference data
  const { data: stats } = useAudiobookStats();
  const { data: genres = [] } = useGenres();
  const { data: continueData } = useContinueListening(isSignedIn);

  const continueItems = continueData?.results;
  const continueHeroItem = isSignedIn && continueItems && continueItems.length > 0 ? continueItems[0] : null;
  const progressBySlug = useMemo(() => buildContinueListeningMap(continueItems), [continueItems]);

  // Top popular audiobook for the signed-out / no-progress hero card.
  const { data: featuredQuery } = useQuery({
    queryKey: ["audiobooks-hero-featured"],
    queryFn: () => storyApi.getStories(1, [], "popular", "all", "", "all", "all", [], true),
    enabled: !continueHeroItem,
    staleTime: 5 * 60 * 1000,
  });
  const featuredStory = featuredQuery?.results?.[0] ?? null;

  // Duration shelves (default browsing view only)
  const { data: shortShelfData } = useQuery({
    queryKey: ["audiobooks-shelf", "short"],
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
        true,
        false,
        "all",
        false,
        [],
        false,
        "all",
        "short",
      ),
    enabled: !hasFilters,
    staleTime: 5 * 60 * 1000,
  });
  const { data: mediumShelfData } = useQuery({
    queryKey: ["audiobooks-shelf", "medium"],
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
        true,
        false,
        "all",
        false,
        [],
        false,
        "all",
        "medium",
      ),
    enabled: !hasFilters,
    staleTime: 5 * 60 * 1000,
  });
  const { data: longShelfData } = useQuery({
    queryKey: ["audiobooks-shelf", "long-epic"],
    queryFn: async () => {
      const [longRes, epicRes] = await Promise.all([
        storyApi.getStories(
          1,
          [],
          "audio_longest",
          "all",
          "",
          "all",
          "all",
          [],
          true,
          false,
          "all",
          false,
          [],
          false,
          "all",
          "long",
        ),
        storyApi.getStories(
          1,
          [],
          "audio_longest",
          "all",
          "",
          "all",
          "all",
          [],
          true,
          false,
          "all",
          false,
          [],
          false,
          "all",
          "epic",
        ),
      ]);
      const seen = new Set<number>();
      const merged: Story[] = [];
      for (const story of [...epicRes.results, ...longRes.results]) {
        if (!seen.has(story.id)) {
          seen.add(story.id);
          merged.push(story);
        }
      }
      merged.sort((a, b) => (b.audio_minutes ?? 0) - (a.audio_minutes ?? 0));
      return merged.slice(0, 6);
    },
    enabled: !hasFilters,
    staleTime: 5 * 60 * 1000,
  });

  // Main "All audiobooks" grid
  const genreIds = useMemo(() => (filters.genre !== "all" ? [Number(filters.genre)] : []), [filters.genre]);
  const {
    data: storiesData,
    isLoading: isGridLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteStories(
    genreIds,
    filters.sort,
    "all",
    filters.q,
    filters.language,
    "all",
    true,
    [],
    true,
    false,
    false,
    [],
    filters.readalong,
    filters.length,
  );

  const stories = useMemo(() => storiesData?.pages.flatMap((page) => page.results) ?? [], [storiesData]);
  const totalCount = storiesData?.pages[0]?.pagination?.count ?? 0;

  const handleShelfSeeAll = (length: AudiobookLength) => {
    updateFilters({ length });
    window.requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams(buildAudiobookParams(DEFAULT_AUDIOBOOK_FILTERS));
  };

  const totalHours = stats && stats.total_seconds > 0 ? Math.floor(stats.total_seconds / 3600) : 0;
  const heroContinuePercent = continueHeroItem
    ? Math.max(
        1,
        Math.min(
          100,
          Math.round(
            ((continueHeroItem.overall_progress > 0
              ? continueHeroItem.overall_progress
              : continueHeroItem.audio_progress) || 0) * 100,
          ),
        ),
      )
    : 0;
  const heroContinueHref = continueHeroItem
    ? continueHeroItem.audio_slug
      ? `/listen/${continueHeroItem.story.slug}/${continueHeroItem.audio_slug}`
      : `/listen/${continueHeroItem.story.slug}`
    : "/audiobooks";

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
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Audiobooks</h1>
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
                    src={continueHeroItem.story.cover_image}
                    alt=""
                    title={continueHeroItem.story.title}
                    author={continueHeroItem.story.author}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A71B36] dark:text-rose-300">
                    Continue listening
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{continueHeroItem.story.title}</p>
                  {continueHeroItem.audio_title && (
                    <p className="truncate text-xs text-muted-foreground">{continueHeroItem.audio_title}</p>
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
                <Button asChild size="sm" className="shrink-0 bg-[#D92F4C] text-white hover:bg-[#A71B36]">
                  <Link to={heroContinueHref}>
                    <Play className="mr-1 h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    Resume
                  </Link>
                </Button>
              </div>
            ) : featuredStory ? (
              <div className="flex items-center gap-3 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur-sm">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-muted">
                  <CoverImage
                    src={featuredStory.cover_image}
                    alt=""
                    title={featuredStory.title}
                    author={featuredStory.author}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A71B36] dark:text-rose-300">
                    Featured
                  </p>
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">{featuredStory.title}</p>
                  {featuredStory.author && (
                    <p className="truncate text-xs text-muted-foreground">{featuredStory.author}</p>
                  )}
                  {formatAudioDuration(featuredStory.audio_minutes) && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatAudioDuration(featuredStory.audio_minutes)}
                    </p>
                  )}
                </div>
                <Button asChild size="sm" className="shrink-0 bg-[#D92F4C] text-white hover:bg-[#A71B36]">
                  <Link to={`/listen/${featuredStory.slug}`}>
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
                placeholder="Search audiobooks, authors, genres…"
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

              <Select value={filters.language} onValueChange={(language) => updateFilters({ language })}>
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

              <Select value={filters.sort} onValueChange={(sort) => updateFilters({ sort: sort as AudiobookSort })}>
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
                  onClick={() => updateFilters({ length: opt.value })}
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
          </div>
        </div>
      </div>

      <main className="container mx-auto space-y-10 px-3 py-6 sm:px-4 sm:py-8">
        {/* Duration shelves (default browsing state only) */}
        {!hasFilters && (
          <div className="space-y-8">
            <AudiobookShelf
              title="Quick listens"
              subtitle="Under 30 minutes — perfect for a walk or coffee break"
              stories={shortShelfData?.results ?? []}
              progressBySlug={progressBySlug}
              onSeeAll={() => handleShelfSeeAll("short")}
            />
            <AudiobookShelf
              title="Evening listens"
              subtitle="30 minutes to 2 hours — settle in for a full story"
              stories={mediumShelfData?.results ?? []}
              progressBySlug={progressBySlug}
              onSeeAll={() => handleShelfSeeAll("medium")}
            />
            <AudiobookShelf
              title="Long listens"
              subtitle="2 hours and up — deeper novels and multi-part journeys"
              stories={longShelfData ?? []}
              progressBySlug={progressBySlug}
              onSeeAll={() => handleShelfSeeAll("long")}
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
          ) : stories.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <p className="text-sm font-medium text-foreground">No audiobooks match these filters</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {stories.map((story) => (
                  <AudiobookCard
                    key={story.id}
                    story={story}
                    progressPercent={progressBySlug.get(story.slug)}
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
