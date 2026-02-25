import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGenres } from "@/hooks/useGenres";
import { useStories } from "@/hooks/useStories";
import { formatViews } from "@/lib/utils";
import { BookOpen, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const Catalogue = () => {
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openGenres, setOpenGenres] = useState(false);
  const [tempGenres, setTempGenres] = useState<number[]>([]);

  const { data: stories, isLoading } = useStories(
    page,
    selectedGenres,
    sort,
    status,
    searchQuery
  );
  const { data: genres } = useGenres();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [page]);

  useEffect(() => {
    setTempGenres(selectedGenres);
  }, [selectedGenres, openGenres]);

  const totalPages = stories?.pagination?.pages || 1;
  const currentPage = stories?.pagination?.page || page;
  const totalCount = stories?.pagination?.count || 0;
  const selectedGenreNames = useMemo(() => {
    const genreMap = new Map((genres || []).map((genre) => [genre.id, genre.name]));
    return selectedGenres
      .map((genreId) => ({ id: genreId, name: genreMap.get(genreId) }))
      .filter((item): item is { id: number; name: string } => Boolean(item.name));
  }, [selectedGenres, genres]);

  const visiblePages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) return [1, 2, 3, 4, 5, -1, totalPages];
    if (currentPage >= totalPages - 3) {
      return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages];
  }, [currentPage, totalPages]);

  const clearAllFilters = () => {
    setStatus("all");
    setSort("popular");
    setSelectedGenres([]);
    setTempGenres([]);
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const applyCatalogueSearch = () => {
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  if (isLoading) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_52%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]">
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <section className="mb-6 rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-300 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            Explore Library
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Catalogue
          </h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            Filter quickly, browse smoothly, and jump into your next read.
          </p>
        </section>

        <section className="mb-5 rounded-xl border bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-semibold">{formatViews(totalCount)}</span>
              <span className="text-muted-foreground">stories</span>
            </div>

            <form
              className="flex min-w-[220px] flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyCatalogueSearch();
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search in catalogue..."
                  className="h-9 pl-8 text-xs sm:text-sm"
                />
              </div>
              <Button type="submit" size="sm" className="h-9">
                Search
              </Button>
            </form>

            <div className="min-w-[140px] flex-1 sm:flex-none">
              <Select
                value={sort}
                onValueChange={(value) => {
                  setSort(value);
                  setPage(1);
                }}
              >
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
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
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
                        setPage(1);
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
                        setPage(1);
                      }}
                    >
                      Clear Genres
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {(selectedGenres.length > 0 ||
              status !== "all" ||
              sort !== "popular" ||
              searchQuery.length > 0) && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Reset All
              </Button>
            )}
          </div>

          {(selectedGenreNames.length > 0 ||
            status !== "all" ||
            sort !== "popular" ||
            searchQuery.length > 0) && (
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
                      setPage(1);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {sort !== "popular" && (
                <Badge variant="outline" className="gap-1">
                  Sort: {sort}
                  <button
                    type="button"
                    onClick={() => {
                      setSort("popular");
                      setPage(1);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {status !== "all" && (
                <Badge variant="outline" className="gap-1">
                  Status: {status}
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("all");
                      setPage(1);
                    }}
                  >
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
                      setPage(1);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {stories?.results?.map((story) => (
            <StoryCard key={story.id} {...story} />
          ))}
        </section>

        {(stories?.results?.length || 0) === 0 && (
          <div className="mt-6 rounded-lg border border-border p-6 text-center text-muted-foreground">
            No stories found for the selected filters.
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>

              {visiblePages.map((pageNumber, idx) =>
                pageNumber === -1 ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pageNumber}
                    size="sm"
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Catalogue;
