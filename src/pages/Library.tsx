import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { OriginalsRail } from "@/components/OriginalsRail";
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
import { useCategories } from "@/hooks/useCategories";
import { useStoryTypes } from "@/hooks/useStoryTypes";
import { useIsHeaderScrolled } from "@/hooks/useIsHeaderScrolled";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { useInfiniteStories } from "@/hooks/useInfiniteStories";
import { useInfiniteLibraryShelves } from "@/hooks/useInfiniteLibraryShelves";
import { formatViews } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Library as LibraryIcon,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { buildMeta } from "@/lib/buildMeta";
import { LANGUAGE_OPTIONS, getLanguageLabel } from "@/lib/languages";

function getInitialGenreFromUrl(searchParams: URLSearchParams): number[] {
  const genreId = parseInt(searchParams.get("genre") || "", 10);
  return Number.isNaN(genreId) ? [] : [genreId];
}

function getInitialCategoryFromUrl(searchParams: URLSearchParams): number[] {
  const categoryId = parseInt(searchParams.get("category") || "", 10);
  return Number.isNaN(categoryId) ? [] : [categoryId];
}

// Small deliberate breathing room between the header's live bottom edge and
// the filters bar below it — the bar sits at exactly headerBottom + this,
// not a separately-guessed offset.
const FILTERS_BAR_GAP = 6;

// Deliberately still no loader for this page's body content (unlike Home/
// Discover/Authors/the dynamic pages), and the ItemList structuredData
// stays dropped: Library's content is a filter/browse UI driven by 10 URL
// params through useInfiniteStories/useInfiniteLibraryShelves
// (useInfiniteQuery, not a plain query) — seeding that server-side means
// replicating the component's own param parsing in the loader and shaping
// the result as {pages, pageParams}. Real but meaningfully more work than
// the other pages here for a filter/browse surface that's a lower SEO
// priority than the story/author/home pages this migration actually
// targets. Worth doing as a follow-up, not folded into this pass.
export function meta() {
  return buildMeta({
    title: "Library — Browse Every Story | WorldStories",
    description:
      "Browse the full WorldStories library by genre, or filter by status and popularity to find your next short story, novel, or poetry collection.",
    path: "/library",
  });
}

const Library = () => {
  const isHeaderScrolled = useIsHeaderScrolled();
  const headerBottom = useHeaderHeight();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedGenres, setSelectedGenres] = useState<number[]>(() => getInitialGenreFromUrl(searchParams));
  const [selectedCategories, setSelectedCategories] = useState<number[]>(() =>
    getInitialCategoryFromUrl(searchParams)
  );
  const [status, setStatus] = useState("all");
  // Mood arrives only from a link (the MoodPicker), so it is read from the URL
  // and not offered as another filter control — the mood layer is a way *in*,
  // not a fifth facet competing with genre and category.
  const selectedMoods = useMemo(() => {
    const raw = searchParams.get("moods") || "";
    return raw.split(",").map((slug) => slug.trim()).filter(Boolean);
  }, [searchParams]);
  const [language, setLanguage] = useState(() => searchParams.get("language") || "all");
  const [storyType, setStoryType] = useState(() => searchParams.get("story_type") || "all");
  const [sort, setSort] = useState("popular");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openGenres, setOpenGenres] = useState(false);
  const [openCategories, setOpenCategories] = useState(false);
  const [openMobileFilters, setOpenMobileFilters] = useState(false);
  const [tempGenres, setTempGenres] = useState<number[]>([]);
  const [tempCategories, setTempCategories] = useState<number[]>([]);
  const { data: genres } = useGenres();
  const { data: categories } = useCategories();
  const { data: storyTypes } = useStoryTypes();
  const storyTypeNameById = useMemo(
    () => new Map((storyTypes || []).map((storyType) => [String(storyType.id), storyType.name])),
    [storyTypes]
  );

  const selectedGenreNames = useMemo(() => {
    const genreMap = new Map((genres || []).map((genre) => [genre.id, genre.name]));
    return selectedGenres
      .map((genreId) => ({ id: genreId, name: genreMap.get(genreId) }))
      .filter((item): item is { id: number; name: string } => Boolean(item.name));
  }, [selectedGenres, genres]);

  const selectedCategoryNames = useMemo(() => {
    const categoryMap = new Map((categories || []).map((category) => [category.id, category.name]));
    return selectedCategories
      .map((categoryId) => ({ id: categoryId, name: categoryMap.get(categoryId) }))
      .filter((item): item is { id: number; name: string } => Boolean(item.name));
  }, [selectedCategories, categories]);

  const hasActiveFilters =
    selectedGenreNames.length > 0 ||
    selectedCategoryNames.length > 0 ||
    status !== "all" ||
    language !== "all" ||
    storyType !== "all" ||
    sort !== "popular" ||
    searchQuery.length > 0;
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

  // Same as above, but for a category deep link (e.g. /library?category=4).
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (!categoryParam) return;
    const categoryId = parseInt(categoryParam, 10);
    if (!Number.isNaN(categoryId)) {
      setSelectedCategories([categoryId]);
    }
  }, [searchParams]);

  useEffect(() => {
    const languageParam = searchParams.get("language");
    const storyTypeParam = searchParams.get("story_type");
    if (languageParam) setLanguage(languageParam);
    if (storyTypeParam) setStoryType(storyTypeParam);
  }, [searchParams]);

  const {
    data: storiesData,
    isLoading: isStoriesLoading,
    fetchNextPage: fetchNextStoriesPage,
    hasNextPage: hasNextStoriesPage,
    isFetchingNextPage: isFetchingNextStoriesPage,
  } = useInfiniteStories(
    selectedGenres,
    sort,
    status,
    searchQuery,
    language,
    storyType,
    !isBrowsing,
    selectedCategories,
    false,
    false,
    false,
    selectedMoods
  );

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
  }, [selectedGenres, selectedCategories, sort, status, language, storyType, searchQuery]);

  useEffect(() => {
    setTempGenres(selectedGenres);
  }, [selectedGenres, openGenres, openMobileFilters]);

  useEffect(() => {
    setTempCategories(selectedCategories);
  }, [selectedCategories, openCategories, openMobileFilters]);

  const clearAllFilters = () => {
    setStatus("all");
    setLanguage("all");
    setStoryType("all");
    setSort("popular");
    setSelectedGenres([]);
    setTempGenres([]);
    setSelectedCategories([]);
    setTempCategories([]);
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

  return (
    <div className="min-h-screen bg-background">
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

      {/* top tracks the header's own live bottom edge (measured, not
          guessed) plus a small fixed gap, so the two stay flush at every
          point of the header's shrink animation instead of drifting. */}
      <div
        className="sticky z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ top: headerBottom > 0 ? headerBottom + FILTERS_BAR_GAP : undefined }}
      >
        <div
          className={`container mx-auto px-3 transition-[padding] duration-300 ease-in-out sm:px-4 ${
            isHeaderScrolled ? "py-1" : "py-3"
          }`}
        >
          <div
            className={`flex flex-wrap items-center transition-[gap] duration-300 ease-in-out ${
              isHeaderScrolled ? "gap-1.5" : "gap-2 sm:gap-3"
            }`}
          >
            <div
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-muted/40 text-xs transition-all duration-300 ease-in-out sm:gap-2 sm:text-sm ${
                isHeaderScrolled ? "px-2 py-1" : "px-2.5 py-2 sm:px-3"
              }`}
            >
              <LibraryIcon className="h-4 w-4 text-primary" />
              <span className="font-semibold">
                {formatViews(isBrowsing ? totalLibraryStoriesCount : totalStoriesCount)}
              </span>
              <span className="hidden text-muted-foreground sm:inline">stories</span>
            </div>

            <form
              className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[220px]"
              onSubmit={(event) => {
                event.preventDefault();
                applyLibrarySearch();
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search..."
                  className={`pl-8 text-xs transition-[height] duration-300 ease-in-out sm:text-sm ${
                    isHeaderScrolled ? "h-7" : "h-9"
                  }`}
                />
              </div>
            </form>

            {/* Sort/Status/Language/Genres/Reset stay inline on desktop, where
                there's room for them — below sm: they'd each wrap onto their
                own line and the bar (which is sticky) would eat a large,
                growing chunk of the viewport. Below, they're consolidated
                into a single "Filters" button opening one sheet instead. */}
            <div className="hidden min-w-[140px] flex-1 sm:block sm:flex-none">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger
                  type="button"
                  className={`text-xs transition-[height] duration-300 ease-in-out sm:text-sm ${
                    isHeaderScrolled ? "h-7" : "h-9"
                  }`}
                >
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

            <div className="hidden min-w-[130px] flex-1 sm:block sm:flex-none">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger
                  type="button"
                  className={`text-xs transition-[height] duration-300 ease-in-out sm:text-sm ${
                    isHeaderScrolled ? "h-7" : "h-9"
                  }`}
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stories</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden min-w-[130px] flex-1 sm:block sm:flex-none">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger
                  type="button"
                  className={`text-xs transition-[height] duration-300 ease-in-out sm:text-sm ${
                    isHeaderScrolled ? "h-7" : "h-9"
                  }`}
                >
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden min-w-[140px] flex-1 sm:block sm:flex-none">
              <Select value={storyType} onValueChange={setStoryType}>
                <SelectTrigger
                  type="button"
                  className={`text-xs transition-[height] duration-300 ease-in-out sm:text-sm ${
                    isHeaderScrolled ? "h-7" : "h-9"
                  }`}
                >
                  <SelectValue placeholder="Story Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(storyTypes || []).map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Sheet open={openGenres} onOpenChange={setOpenGenres}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`hidden transition-[height] duration-300 ease-in-out sm:inline-flex ${
                    isHeaderScrolled ? "h-7" : "h-9"
                  }`}
                >
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
                      <div key={genre.id} className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-3">
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
                        <Link
                          to={`/genre/${genre.slug}`}
                          title={`View the ${genre.name} page`}
                          className="shrink-0 text-muted-foreground hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
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

            <Sheet open={openCategories} onOpenChange={setOpenCategories}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`hidden transition-[height] duration-300 ease-in-out sm:inline-flex ${
                    isHeaderScrolled ? "h-7" : "h-9"
                  }`}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Categories
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex h-full flex-col p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Select Categories
                  </h2>
                  <div className="flex-1 space-y-3 overflow-auto rounded-lg border p-3">
                    {categories?.map((category) => (
                      <div key={category.id} className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-3">
                          <Checkbox
                            checked={tempCategories.includes(category.id)}
                            onCheckedChange={(checked) => {
                              setTempCategories((prev) =>
                                checked ? [...prev, category.id] : prev.filter((id) => id !== category.id)
                              );
                            }}
                          />
                          <span className="text-sm">
                            {category.name}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({formatViews(category.stories_count)})
                            </span>
                          </span>
                        </label>
                        <Link
                          to={`/category/${category.slug}`}
                          title={`View the ${category.name} page`}
                          className="shrink-0 text-muted-foreground hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedCategories(tempCategories);
                        setOpenCategories(false);
                      }}
                    >
                      Apply Categories
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setTempCategories([]);
                        setSelectedCategories([]);
                      }}
                    >
                      Clear Categories
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="hidden sm:inline-flex">
                Reset All
              </Button>
            )}

            {/* Mobile-only: Sort/Status/Language/Genres/Reset consolidated
                into one sheet instead of each taking their own wrapped row. */}
            <Sheet open={openMobileFilters} onOpenChange={setOpenMobileFilters}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`shrink-0 px-2.5 transition-[height] duration-300 ease-in-out sm:hidden ${
                    isHeaderScrolled ? "h-7" : "h-9"
                  }`}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 sm:hidden">
                <div className="flex h-full flex-col p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Filters
                  </h2>
                  <div className="flex-1 space-y-4 overflow-auto">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sort</label>
                      <Select value={sort} onValueChange={setSort}>
                        <SelectTrigger type="button" className="h-9 text-sm">
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

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger type="button" className="h-9 text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stories</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Language</label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger type="button" className="h-9 text-sm">
                          <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Languages</SelectItem>
                          {LANGUAGE_OPTIONS.map((option) => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Story Type</label>
                      <Select value={storyType} onValueChange={setStoryType}>
                        <SelectTrigger type="button" className="h-9 text-sm">
                          <SelectValue placeholder="Story Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {(storyTypes || []).map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Genres</label>
                      <div className="space-y-3 rounded-lg border p-3">
                        {genres?.map((genre) => (
                          <div key={genre.id} className="flex items-center gap-2">
                            <label className="flex flex-1 items-center gap-3">
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
                            <Link
                              to={`/genre/${genre.slug}`}
                              title={`View the ${genre.name} page`}
                              className="shrink-0 text-muted-foreground hover:text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Categories</label>
                      <div className="space-y-3 rounded-lg border p-3">
                        {categories?.map((category) => (
                          <div key={category.id} className="flex items-center gap-2">
                            <label className="flex flex-1 items-center gap-3">
                              <Checkbox
                                checked={tempCategories.includes(category.id)}
                                onCheckedChange={(checked) => {
                                  setTempCategories((prev) =>
                                    checked ? [...prev, category.id] : prev.filter((id) => id !== category.id)
                                  );
                                }}
                              />
                              <span className="text-sm">
                                {category.name}{" "}
                                <span className="text-xs text-muted-foreground">
                                  ({formatViews(category.stories_count)})
                                </span>
                              </span>
                            </label>
                            <Link
                              to={`/category/${category.slug}`}
                              title={`View the ${category.name} page`}
                              className="shrink-0 text-muted-foreground hover:text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedGenres(tempGenres);
                        setSelectedCategories(tempCategories);
                        setOpenMobileFilters(false);
                      }}
                    >
                      Apply
                    </Button>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          clearAllFilters();
                          setOpenMobileFilters(false);
                        }}
                      >
                        Reset All
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
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
              {language !== "all" && (
                <Badge variant="outline" className="gap-1">
                  Language: {getLanguageLabel(language)}
                  <button type="button" onClick={() => setLanguage("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {storyType !== "all" && (
                <Badge variant="outline" className="gap-1">
                  Type: {storyTypeNameById.get(storyType) || storyType}
                  <button type="button" onClick={() => setStoryType("all")}>
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
              {selectedCategoryNames.map((category) => (
                <Badge key={category.id} variant="outline" className="gap-1">
                  {category.name}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategories((prev) => prev.filter((id) => id !== category.id));
                      setTempCategories((prev) => prev.filter((id) => id !== category.id));
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
            <OriginalsRail className="mb-10" />
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
