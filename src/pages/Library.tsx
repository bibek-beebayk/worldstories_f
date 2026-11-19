import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { storyApi } from "@/api/story";
import type { LibraryCollection } from "@/api/types";
import ActiveFilterChips, { buildFilterChips } from "@/components/library/ActiveFilterChips";
import CollectionsStrip from "@/components/library/CollectionsStrip";
import FilterPanel from "@/components/library/FilterPanel";
import FormatTabs from "@/components/library/FormatTabs";
import StoryListRow from "@/components/library/StoryListRow";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { useCategories } from "@/hooks/useCategories";
import { useGenres } from "@/hooks/useGenres";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useLibraryCollections, useLibraryFacets, useLibraryStories, useStoryProgressMap } from "@/hooks/useLibrary";
import { buildMeta } from "@/lib/buildMeta";
import {
  EMPTY_FILTERS,
  SORT_KEYS,
  activeFilterCount,
  applyCollectionParams,
  buildLibraryParams,
  canonicalPathFor,
  hasNarrowingFilters,
  parseLibraryParams,
  toApiParams,
  type LibraryFilters,
  type LibrarySort,
} from "@/lib/libraryParams";
import { FORMAT_META } from "@/lib/storyFormats";

// A deliberate gap between the header's live bottom edge and the sticky bar.
const STICKY_GAP = 6;
const SEARCH_DEBOUNCE_MS = 350;

const SORT_LABELS: Record<LibrarySort, string> = {
  popular: "Popular",
  newest: "Newest",
  title: "A–Z",
  shortest: "Shortest",
  rating: "Top rated",
};

// The Library has no loader: it is a filter/browse surface driven by URL params
// through an infinite query, which is a lower SEO priority than the story,
// author and home pages. Its meta does follow the URL, though: a filtered view
// declares its canonical (the genre / category landing page for a lone genre or
// category, /library otherwise) so filter combinations are not indexed as pages.
export function meta({ location }: { location?: { search?: string } } = {}) {
  const path = canonicalPathFor(new URLSearchParams(location?.search ?? ""));
  return buildMeta({
    title: "Library — Browse Every Story | WorldStories",
    description:
      "Browse the full WorldStories library by genre, or filter by status and popularity to find your next short story, novel, or poetry collection.",
    path,
  });
}

const Library = () => {
  const headerBottom = useHeaderHeight();
  const isLoggedIn = useIsLoggedIn();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseLibraryParams(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<LibraryFilters>, options: { replace?: boolean } = {}) => {
      setSearchParams(buildLibraryParams({ ...filters, ...patch }), { replace: options.replace });
    },
    [filters, setSearchParams]
  );

  // --- search: typed locally, written to the URL after a pause (replace, so a
  // burst of typing is one history entry, not twenty). ---
  const [searchInput, setSearchInput] = useState(filters.q);
  useEffect(() => {
    // Back/forward (or a collection click) changed `q` from outside.
    setSearchInput(filters.q);
  }, [filters.q]);
  useEffect(() => {
    const next = searchInput.trim();
    if (next === filters.q) return;
    const timer = window.setTimeout(() => update({ q: next }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, filters.q, update]);

  // --- data ---
  const apiParams = useMemo(() => toApiParams(filters), [filters]);
  const facetParams = useMemo(() => {
    const { sort: _sort, ...rest } = apiParams;
    return rest;
  }, [apiParams]);
  const stories = useLibraryStories(apiParams);
  const facets = useLibraryFacets(facetParams);
  const narrowing = hasNarrowingFilters(filters);
  const collections = useLibraryCollections(!narrowing);
  const { data: authorData } = useQuery({
    queryKey: ["author", filters.author],
    queryFn: () => storyApi.getAuthor(Number(filters.author)),
    enabled: /^\d+$/.test(filters.author),
    staleTime: 10 * 60_000,
  });

  const results = useMemo(() => stories.data?.pages.flatMap((page) => page.results) ?? [], [stories.data]);
  const total = stories.data?.pages[0]?.pagination?.count ?? 0;
  const progress = useStoryProgressMap(results, isLoggedIn);
  const { data: genreList } = useGenres();
  const { data: categoryList } = useCategories();
  const chips = useMemo(
    () => buildFilterChips(filters, facets.data, authorData?.name, { genres: genreList, categories: categoryList }),
    [filters, facets.data, authorData, genreList, categoryList]
  );
  const filterCount = activeFilterCount(filters);
  const linkFor = filters.format ? FORMAT_META[filters.format].route : undefined;

  // --- infinite scroll ---
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = stories;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // --- actions ---
  const clearAll = () => {
    setSearchInput("");
    setSearchParams(buildLibraryParams({ ...EMPTY_FILTERS, format: filters.format, sort: filters.sort, view: filters.view }));
  };
  const selectCollection = (collection: LibraryCollection) =>
    setSearchParams(buildLibraryParams(applyCollectionParams(filters, collection.params)));

  // --- mobile filter sheet: edits a draft, applied in one go ---
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<LibraryFilters>(filters);
  const draftFacets = useLibraryFacets(
    useMemo(() => {
      const { sort: _sort, ...rest } = toApiParams(draft);
      return rest;
    }, [draft]),
    sheetOpen
  );
  const openSheet = () => {
    setDraft(filters);
    setSheetOpen(true);
  };

  const gridClass = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
  const isFirstLoad = stories.isLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Compact header: title with the live count, search, sort, view. */}
      <div className="container mx-auto px-3 pt-5 sm:px-4 sm:pt-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Library</h1>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {isFirstLoad ? "Loading…" : `${total.toLocaleString()} ${total === 1 ? "story" : "stories"}`}
            </p>
          </div>

          <div className="relative order-last w-full min-w-0 sm:order-none sm:flex-1 lg:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search titles, authors, genres…"
              aria-label="Search the library"
              className="h-10 pl-9 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select value={filters.sort} onValueChange={(value) => update({ sort: value as LibrarySort })}>
              <SelectTrigger className="h-10 w-[130px]" aria-label="Sort stories">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="View">
              {(
                [
                  ["grid", LayoutGrid, "Grid view"],
                  ["list", List, "List view"],
                ] as const
              ).map(([view, Icon, label]) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={filters.view === view}
                  aria-label={label}
                  title={label}
                  onClick={() => update({ view }, { replace: true })}
                  className={`rounded p-2 transition-colors ${
                    filters.view === view ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Format tabs — sticky under the site header, with the mobile Filters button. */}
      <div
        className="sticky z-30 mt-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ top: headerBottom > 0 ? headerBottom + STICKY_GAP : undefined }}
      >
        <div className="container mx-auto flex items-center gap-2 px-3 py-2 sm:px-4">
          <div className="min-w-0 flex-1">
            <FormatTabs value={filters.format} onChange={(format) => update({ format })} facets={facets.data} />
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 lg:hidden" onClick={openSheet}>
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filters{filterCount > 0 ? ` (${filterCount})` : ""}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-3 py-5 sm:px-4 sm:py-6 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
        <aside
          className="hidden lg:block"
          aria-label="Filters"
        >
          <div
            className="sticky max-h-[calc(100vh-9rem)] overflow-y-auto rounded-lg border bg-card px-4 py-2 shadow-sm"
            style={{ top: headerBottom > 0 ? headerBottom + 64 : 96 }}
          >
            <FilterPanel filters={filters} facets={facets.data} onChange={(patch) => update(patch)} />
          </div>
        </aside>

        <main className="min-w-0">
          {!narrowing && (
            <CollectionsStrip collections={collections.data?.results} isLoading={collections.isLoading} onSelect={selectCollection} />
          )}

          <ActiveFilterChips chips={chips} onRemove={(chip) => update(chip.remove)} onClearAll={clearAll} />

          {isFirstLoad && (
            <div className={filters.view === "list" ? "space-y-3" : gridClass} aria-busy="true" aria-label="Loading stories">
              {Array.from({ length: 10 }).map((_, index) =>
                filters.view === "list" ? (
                  <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <div key={index}>
                    <div className="aspect-[3/4] animate-pulse rounded-sm bg-muted" />
                    <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                )
              )}
            </div>
          )}

          {!isFirstLoad && stories.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">
              We couldn't load the library. Please try again.
            </div>
          )}

          {!isFirstLoad && !stories.isError && results.length === 0 && (
            <div className="rounded-lg border p-8 text-center">
              <p className="font-medium">No stories match.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try removing a filter or searching for something else.</p>
              {(narrowing || filters.format) && (
                <Button className="mt-4" variant="outline" onClick={clearAll}>
                  Clear filters
                </Button>
              )}
            </div>
          )}

          {results.length > 0 && (
            <div className={`transition-opacity ${stories.isPlaceholderData ? "opacity-60" : ""}`}>
              {filters.view === "list" ? (
                <div className="space-y-2.5">
                  {results.map((story) => (
                    <StoryListRow key={story.id} story={story} linkTo={linkFor?.(story.slug)} progress={progress[story.id]} />
                  ))}
                </div>
              ) : (
                <section className={gridClass}>
                  {results.map((story) => (
                    <StoryCard key={story.id} {...story} linkTo={linkFor?.(story.slug)} progress={progress[story.id]} />
                  ))}
                </section>
              )}
            </div>
          )}

          <div ref={sentinelRef} className="mt-8 flex items-center justify-center py-4">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more stories...
              </div>
            )}
            {!hasNextPage && results.length > 0 && (
              <p className="text-sm text-muted-foreground">You've reached the end of the library.</p>
            )}
          </div>
        </main>
      </div>

      {/* Mobile / tablet: the same facets in a bottom sheet, applied together. */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0">
          <SheetHeader className="border-b px-4 py-3 text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription className="sr-only">Narrow the library by genre, language, length and more.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4">
            <FilterPanel filters={draft} facets={draftFacets.data} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />
          </div>
          <div className="flex gap-2 border-t bg-background p-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDraft((current) => ({ ...EMPTY_FILTERS, q: current.q, format: current.format, sort: current.sort, view: current.view }))}
            >
              Clear
            </Button>
            <Button
              type="button"
              className="flex-[2]"
              onClick={() => {
                setSearchParams(buildLibraryParams(draft));
                setSheetOpen(false);
              }}
            >
              Apply{draftFacets.data ? ` · ${draftFacets.data.total.toLocaleString()} results` : ""}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Library;
