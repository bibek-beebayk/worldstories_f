import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import BlogCard from "@/components/BlogCard";
import { ContentTypeSection, SECTION_THEMES } from "@/components/ContentTypeSection";
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
import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { useInfiniteStories } from "@/hooks/useInfiniteStories";
import { formatViews } from "@/lib/utils";
import type { Story } from "@/api/types";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Captions,
  ExternalLink,
  Headphones,
  Library as LibraryIcon,
  Loader2,
  Newspaper,
  Search,
  SlidersHorizontal,
  X,
  Youtube,
  Zap,
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
  // Only to label the filter chip — a raw slug in the UI would read as a bug.
  const { data: moodData } = useQuery({
    queryKey: ["moods"],
    queryFn: storyApi.getMoods,
    staleTime: 5 * 60 * 1000,
  });
  const moodNameBySlug = useMemo(
    () => new Map((moodData?.moods || []).map((mood) => [mood.slug, mood.name])),
    [moodData]
  );

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

  // Set only via a section's "See all" link (Read / Read Along have no
  // dedicated full list page the way Listen/Watch/Quick Read/Blog do), so
  // it's read straight from the URL rather than tracked in local state.
  const modeParam = searchParams.get("mode");
  const isReadMode = modeParam === "read";
  const isReadAlongMode = modeParam === "read-along";

  const hasActiveFilters =
    selectedGenreNames.length > 0 ||
    selectedCategoryNames.length > 0 ||
    selectedMoods.length > 0 ||
    status !== "all" ||
    language !== "all" ||
    storyType !== "all" ||
    sort !== "popular" ||
    searchQuery.length > 0 ||
    isReadMode ||
    isReadAlongMode;
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
    selectedMoods,
    isReadAlongMode
  );

  const stories = useMemo(() => storiesData?.pages.flatMap((page) => page.results) || [], [storiesData]);
  const totalStoriesCount = storiesData?.pages[0]?.pagination?.count || 0;
  // In Read/Read Along mode, cards must lead to the isolated detail page for
  // that mode instead of the all-modes hub — genre/category/search browsing
  // (no mode) keeps the old /story/:slug destination.
  const storyLinkTo = isReadMode
    ? (slug: string) => `/read/${slug}`
    : isReadAlongMode
    ? (slug: string) => `/read-along/${slug}`
    : undefined;

  const PREVIEW_COUNT = 12;
  const { data: readPreview, isLoading: isReadPreviewLoading } = useQuery({
    queryKey: ["library-section", "read"],
    queryFn: () => storyApi.getStories(1, [], "popular", "all", "", "all", "all", []),
    enabled: isBrowsing,
    staleTime: 60_000,
  });
  const { data: listenPreview, isLoading: isListenPreviewLoading } = useQuery({
    queryKey: ["library-section", "listen"],
    queryFn: () => storyApi.getStories(1, [], "popular", "all", "", "all", "all", [], true),
    enabled: isBrowsing,
    staleTime: 60_000,
  });
  const { data: readAlongPreview, isLoading: isReadAlongPreviewLoading } = useQuery({
    queryKey: ["library-section", "read-along"],
    queryFn: () => storyApi.getStories(1, [], "popular", "all", "", "all", "all", [], false, false, "all", false, [], true),
    enabled: isBrowsing,
    staleTime: 60_000,
  });
  const { data: watchPreview, isLoading: isWatchPreviewLoading } = useQuery({
    queryKey: ["library-section", "watch"],
    queryFn: () => storyApi.getStories(1, [], "popular", "all", "", "all", "all", [], false, false, "all", true),
    enabled: isBrowsing,
    staleTime: 60_000,
  });
  const { data: quickReadPreview, isLoading: isQuickReadPreviewLoading } = useQuery({
    queryKey: ["library-section", "quick-read"],
    queryFn: () => storyApi.getStories(1, [], "popular", "all", "", "all", "all", [], false, true),
    enabled: isBrowsing,
    staleTime: 60_000,
  });
  const { data: blogPreview, isLoading: isBlogPreviewLoading } = useQuery({
    queryKey: ["library-section", "blog"],
    queryFn: () => storyApi.getBlogs(1, "", "newest"),
    enabled: isBrowsing,
    staleTime: 60_000,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (!isBrowsing && hasNextStoriesPage && !isFetchingNextStoriesPage) {
          fetchNextStoriesPage();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isBrowsing, fetchNextStoriesPage, hasNextStoriesPage, isFetchingNextStoriesPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [selectedGenres, selectedCategories, sort, status, language, storyType, searchQuery]);

  useEffect(() => {
    setTempGenres(selectedGenres);
  }, [selectedGenres, openGenres, openMobileFilters]);

  useEffect(() => {
    setTempCategories(selectedCategories);
  }, [selectedCategories, openCategories, openMobileFilters]);

  const removeMood = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    const remaining = selectedMoods.filter((value) => value !== slug);
    if (remaining.length) next.set("moods", remaining.join(","));
    else next.delete("moods");
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    // Mood is the one filter held in the URL rather than in state, so clearing
    // it has to touch the query string — otherwise "Clear all" would leave the
    // results narrowed with nothing on screen explaining why.
    if (selectedMoods.length) {
      const next = new URLSearchParams(searchParams);
      next.delete("moods");
      setSearchParams(next);
    }
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

  const backToLibrary = () => {
    clearAllFilters();
    setSearchParams({});
  };

  const applyLibrarySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  // In browsing mode each of the 6 sections loads and renders its own
  // spinner independently, so the page shell isn't gated behind one big load.
  if (!isBrowsing && isStoriesLoading) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-700 text-white">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        {/* Decorative only — a big flickering library watermark plus small
            drifting book icons, echoing the "browse everything" theme the
            way Quick Reads' bolt echoes "fast". */}
        <LibraryIcon className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 animate-flicker text-white/10" style={{ animationDuration: "3.5s" }} />
        <BookMarked className="pointer-events-none absolute bottom-5 left-[16%] h-6 w-6 animate-float text-white/25" style={{ animationDuration: "4.5s" }} />
        <BookMarked className="pointer-events-none absolute right-[26%] top-8 h-5 w-5 animate-float text-white/20" style={{ animationDelay: "1s", animationDuration: "5.5s" }} />

        <div className="container relative mx-auto px-3 py-8 sm:px-4 sm:py-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <LibraryIcon className="h-3.5 w-3.5" />
            The Full Library
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Library</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
            {isBrowsing
              ? "Every story on WorldStories, organized by how you want to experience it."
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
            {!isBrowsing && (
              <div
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-muted/40 text-xs transition-all duration-300 ease-in-out sm:gap-2 sm:text-sm ${
                  isHeaderScrolled ? "px-2 py-1" : "px-2.5 py-2 sm:px-3"
                }`}
              >
                <LibraryIcon className="h-4 w-4 text-primary" />
                <span className="font-semibold">{formatViews(totalStoriesCount)}</span>
                <span className="hidden text-muted-foreground sm:inline">stories</span>
              </div>
            )}

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
              {selectedMoods.map((slug) => (
                <Badge key={slug} variant="outline" className="gap-1">
                  {moodNameBySlug.get(slug) || slug}
                  <button
                    type="button"
                    aria-label={`Remove ${moodNameBySlug.get(slug) || slug} filter`}
                    onClick={() => removeMood(slug)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
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
            <OriginalsRail className="mb-8" compact />
            <div className="space-y-10">
              <ContentTypeSection
                title="Read"
                icon={BookMarked}
                theme="emerald"
                subtitle="Text stories you can read here — novels, short stories, and poetry."
                stories={(readPreview?.results || []).slice(0, PREVIEW_COUNT)}
                isLoading={isReadPreviewLoading}
                seeAllTo="/library?mode=read"
                linkTo={(slug) => `/read/${slug}`}
              />
              <ContentTypeSection
                title="Listen"
                icon={Headphones}
                theme="rose"
                subtitle="Narrated audiobooks you can listen to anywhere."
                stories={(listenPreview?.results || []).slice(0, PREVIEW_COUNT)}
                isLoading={isListenPreviewLoading}
                seeAllTo="/audiobooks"
                linkTo={(slug) => `/listen/${slug}`}
              />
              <ContentTypeSection
                title="Read Along"
                icon={Captions}
                theme="sky"
                subtitle="Follow the transcript highlighted in time with the narration."
                stories={(readAlongPreview?.results || []).slice(0, PREVIEW_COUNT)}
                isLoading={isReadAlongPreviewLoading}
                seeAllTo="/library?mode=read-along"
                linkTo={(slug) => `/read-along/${slug}`}
              />
              <ContentTypeSection
                title="Watch"
                icon={Youtube}
                theme="indigo"
                subtitle="Animated video narrations you can watch."
                stories={(watchPreview?.results || []).slice(0, PREVIEW_COUNT)}
                isLoading={isWatchPreviewLoading}
                seeAllTo="/watch"
                linkTo={(slug) => `/watch/${slug}`}
              />
              <ContentTypeSection
                title="Quick Read"
                icon={Zap}
                theme="amber"
                subtitle="Short summaries you can get through in a few minutes."
                stories={(quickReadPreview?.results || []).slice(0, PREVIEW_COUNT)}
                isLoading={isQuickReadPreviewLoading}
                seeAllTo="/quick-reads"
                linkTo={(slug) => `/quick-read/${slug}`}
              />

              <section className={`rounded-2xl border p-4 sm:p-6 ${SECTION_THEMES.slate.wrap}`}>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
                      <Newspaper className={`h-5 w-5 ${SECTION_THEMES.slate.icon}`} />
                      Blog
                    </h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Reading recommendations, author spotlights, and news.
                    </p>
                  </div>
                  <Link
                    to="/blog"
                    className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium sm:text-sm ${SECTION_THEMES.slate.link}`}
                  >
                    See all
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {isBlogPreviewLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading blog posts...
                  </div>
                ) : (blogPreview?.results || []).length === 0 ? (
                  <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
                    No blog posts yet.
                  </div>
                ) : (
                  <Carousel opts={{ align: "start" }} className="px-1">
                    <CarouselContent>
                      {(blogPreview?.results || []).slice(0, PREVIEW_COUNT).map((blog) => (
                        <CarouselItem key={blog.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                          <BlogCard blog={blog} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                )}
              </section>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={backToLibrary}
              className="mb-5 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Library
            </button>

            <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {stories.map((story) => (
                <StoryCard key={story.id} {...story} linkTo={storyLinkTo?.(story.slug)} />
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
