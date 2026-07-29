import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useGenres } from "@/hooks/useGenres";
import { useInfiniteStories } from "@/hooks/useInfiniteStories";
import { useInfiniteLibraryShelves } from "@/hooks/useInfiniteLibraryShelves";
import { formatViews } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Library as LibraryIcon,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Seo, { SITE_URL } from "@/components/Seo";

function getInitialGenreFromUrl(searchParams: URLSearchParams): number[] {
  const genreId = parseInt(searchParams.get("genre") || "", 10);
  return Number.isNaN(genreId) ? [] : [genreId];
}

const Library = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedGenres, setSelectedGenres] = useState<number[]>(() => getInitialGenreFromUrl(searchParams));
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("popular");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openGenres, setOpenGenres] = useState(false);
  const [tempGenres, setTempGenres] = useState<number[]>([]);
  const { data: genres } = useGenres();

  const selectedGenreNames = useMemo(() => {
    const genreMap = new Map((genres || []).map((genre) => [genre.id, genre.name]));
    return selectedGenres
      .map((genreId) => ({ id: genreId, name: genreMap.get(genreId) }))
      .filter((item): item is { id: number; name: string } => Boolean(item.name));
  }, [selectedGenres, genres]);

  const hasActiveFilters =
    selectedGenreNames.length > 0 || status !== "all" || sort !== "popular" || searchQuery.length > 0;
  const isBrowsing = !hasActiveFilters;

  // A genre picked from a shelf's "See all" link (or a deep link like /library?genre=4)
  // lands here as a URL param even when the component doesn't remount.
  useEffect(() => {
    const genreParam = searchParams.get("genre");
    if (!genreParam) return;
    const genreId = parseInt(genreParam, 10);
    if (!Number.isNaN(genreId)) {
      setSelectedGenres([genreId]);
    }
  }, [searchParams]);

  const {
    data: storiesData,
    isLoading: isStoriesLoading,
    fetchNextPage: fetchNextStoriesPage,
    hasNextPage: hasNextStoriesPage,
    isFetchingNextPage: isFetchingNextStoriesPage,
  } = useInfiniteStories(selectedGenres, sort, status, searchQuery, !isBrowsing);

  const {
    data: shelvesData,
    isLoading: isShelvesLoading,
    fetchNextPage: fetchNextShelvesPage,
    hasNextPage: hasNextShelvesPage,
    isFetchingNextPage: isFetchingNextShelvesPage,
  } = useInfiniteLibraryShelves(isBrowsing);

  const stories = useMemo(() => storiesData?.pages.flatMap((page) => page.results) || [], [storiesData]);
  const totalStoriesCount = storiesData?.pages[0]?.pagination?.count || 0;

  const shelves = useMemo(() => shelvesData?.pages.flatMap((page) => page.results) || [], [shelvesData]);
  const totalLibraryStoriesCount = shelvesData?.pages[0]?.aggregate?.total_stories || 0;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (isBrowsing) {
          if (hasNextShelvesPage && !isFetchingNextShelvesPage) fetchNextShelvesPage();
        } else if (hasNextStoriesPage && !isFetchingNextStoriesPage) {
          fetchNextStoriesPage();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    isBrowsing,
    fetchNextStoriesPage,
    hasNextStoriesPage,
    isFetchingNextStoriesPage,
    fetchNextShelvesPage,
    hasNextShelvesPage,
    isFetchingNextShelvesPage,
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [selectedGenres, sort, status, searchQuery]);

  useEffect(() => {
    setTempGenres(selectedGenres);
  }, [selectedGenres, openGenres]);

  const clearAllFilters = () => {
    setStatus("all");
    setSort("popular");
    setSelectedGenres([]);
    setTempGenres([]);
    setSearchInput("");
    setSearchQuery("");
  };

  const browseByGenre = () => {
    clearAllFilters();
    setSearchParams({});
  };

  const applyLibrarySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const isLoading = isBrowsing ? isShelvesLoading : isStoriesLoading;
  if (isLoading) return <FullScreenLoader />;

  const seoItemList = isBrowsing
    ? shelves.flatMap((shelf) => shelf.preview_stories).slice(0, 20)
    : stories.slice(0, 20);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Library — Browse Every Story | WorldStories"
        description="Browse the full WorldStories library by genre, or filter by status and popularity to find your next short story, novel, or poetry collection."
        path="/library"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Library — WorldStories",
          url: `${SITE_URL}/library`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: seoItemList.map((story, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${SITE_URL}/story/${story.slug}`,
              name: story.title,
            })),
          },
        }}
      />

      <div className="border-b border-violet-200/60 bg-gradient-to-br from-violet-50 via-indigo-50 to-slate-100">
        <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <LibraryIcon className="h-3.5 w-3.5" />
            The Full Library
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Library</h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            {isBrowsing
              ? "Every story on WorldStories, shelved by genre — keep scrolling for more shelves."
              : "Filtered results from across the library."}
          </p>
        </div>
      </div>

      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs sm:text-sm">
              <LibraryIcon className="h-4 w-4 text-primary" />
              <span className="font-semibold">
                {formatViews(isBrowsing ? totalLibraryStoriesCount : totalStoriesCount)}
              </span>
              <span className="text-muted-foreground">stories</span>
            </div>

            <form
              className="flex min-w-[220px] flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyLibrarySearch();
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search in library..."
                  className="h-9 pl-8 text-xs sm:text-sm"
                />
              </div>
              <Button type="submit" size="sm" className="h-9">
                Search
              </Button>
            </form>

            <div className="min-w-[140px] flex-1 sm:flex-none">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger type="button" className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="views">Most Viewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[130px] flex-1 sm:flex-none">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger type="button" className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stories</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Sheet open={openGenres} onOpenChange={setOpenGenres}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Genres
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex h-full flex-col p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Select Genres
                  </h2>
                  <div className="flex-1 space-y-3 overflow-auto rounded-lg border p-3">
                    {genres?.map((genre) => (
                      <label key={genre.id} className="flex items-center gap-3">
                        <Checkbox
                          checked={tempGenres.includes(genre.id)}
                          onCheckedChange={(checked) => {
                            setTempGenres((prev) =>
                              checked ? [...prev, genre.id] : prev.filter((id) => id !== genre.id)
                            );
                          }}
                        />
                        <span className="text-sm">
                          {genre.name}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({formatViews(genre.stories_count)})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedGenres(tempGenres);
                        setOpenGenres(false);
                      }}
                    >
                      Apply Genres
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setTempGenres([]);
                        setSelectedGenres([]);
                      }}
                    >
                      Clear Genres
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Reset All
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Active filters</Badge>
              {searchQuery.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  Search: {searchQuery}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {sort !== "popular" && (
                <Badge variant="outline" className="gap-1">
                  Sort: {sort}
                  <button type="button" onClick={() => setSort("popular")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {status !== "all" && (
                <Badge variant="outline" className="gap-1">
                  Status: {status}
                  <button type="button" onClick={() => setStatus("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedGenreNames.map((genre) => (
                <Badge key={genre.id} variant="outline" className="gap-1">
                  {genre.name}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGenres((prev) => prev.filter((id) => id !== genre.id));
                      setTempGenres((prev) => prev.filter((id) => id !== genre.id));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        {isBrowsing ? (
          <>
            <div className="space-y-10">
              {shelves.map((shelf) => (
                <section key={shelf.id}>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold sm:text-xl">{shelf.name}</h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {formatViews(shelf.stories_count)} {shelf.stories_count === 1 ? "story" : "stories"}
                    </p>
                  </div>
                  <Carousel opts={{ align: "start" }} className="px-1">
                    <CarouselContent>
                      {shelf.preview_stories.map((story) => (
                        <CarouselItem
                          key={story.id}
                          className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                        >
                          <StoryCard {...story} compact />
                        </CarouselItem>
                      ))}
                      {shelf.stories_count > shelf.preview_stories.length && (
                        <CarouselItem className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                          <Link
                            to={`/library?genre=${shelf.id}`}
                            className="flex aspect-[4/5] flex-col justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 transition-colors hover:border-primary/50 hover:bg-primary/10"
                          >
                            <div className="inline-flex w-fit rounded-full border border-primary/20 bg-background/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                              See more
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground sm:text-sm">
                                {formatViews(shelf.stories_count - shelf.preview_stories.length)} more in{" "}
                                {shelf.name}
                              </p>
                              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                                <span>View all</span>
                                <ArrowRight className="h-3 w-3" />
                              </div>
                            </div>
                          </Link>
                        </CarouselItem>
                      )}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </section>
              ))}
            </div>

            {shelves.length === 0 && (
              <div className="mt-6 rounded-lg border border-border p-6 text-center text-muted-foreground">
                No genres with stories yet.
              </div>
            )}

            <div ref={sentinelRef} className="mt-8 flex items-center justify-center py-4">
              {isFetchingNextShelvesPage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more genres...
                </div>
              )}
              {!hasNextShelvesPage && shelves.length > 0 && (
                <p className="text-sm text-muted-foreground">You've reached the end of the shelves.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={browseByGenre}
              className="mb-5 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Browse by genre
            </button>

            <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {stories.map((story) => (
                <StoryCard key={story.id} {...story} />
              ))}
            </section>

            {stories.length === 0 && (
              <div className="mt-6 rounded-lg border border-border p-6 text-center text-muted-foreground">
                No stories found for the selected filters.
              </div>
            )}

            <div ref={sentinelRef} className="mt-8 flex items-center justify-center py-4">
              {isFetchingNextStoriesPage && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more stories...
                </div>
              )}
              {!hasNextStoriesPage && stories.length > 0 && (
                <p className="text-sm text-muted-foreground">You've reached the end of the library.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Library;
