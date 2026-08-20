import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfiniteStories } from "@/hooks/useInfiniteStories";
import { formatViews } from "@/lib/utils";
import { Headphones, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildMeta } from "@/lib/buildMeta";

// Same deliberate call as Library.tsx: driven by useInfiniteStories
// (useInfiniteQuery, not a plain query) — no loader here, and the ItemList
// structuredData that depended on the story list stays dropped. Real work
// to seed correctly, for a browse/filter surface that's a lower SEO
// priority than the pages that did get loaders (see subtask 5's notes).
export function meta() {
  return buildMeta({
    title: "Audiobooks — Listen to Stories | WorldStories",
    description:
      "Browse every audiobook on WorldStories — narrated short stories, novels, and more you can listen to anywhere.",
    path: "/audiobooks",
  });
}

const Audiobooks = () => {
  const [sort, setSort] = useState("popular");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: storiesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteStories([], sort, "all", searchQuery, "all", "all", true, [], true);

  const stories = useMemo(() => storiesData?.pages.flatMap((page) => page.results) || [], [storiesData]);
  const totalCount = storiesData?.pages[0]?.pagination?.count || 0;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  if (isLoading) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-rose-200/60 bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-100">
        <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
            <Headphones className="h-3.5 w-3.5" />
            Listen
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Audiobooks</h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            Every story on WorldStories with narration — listen on the go, wherever you are.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-2 text-xs sm:gap-2 sm:text-sm">
            <Headphones className="h-4 w-4 text-primary" />
            <span className="font-semibold">{formatViews(totalCount)}</span>
            <span className="hidden text-muted-foreground sm:inline">audiobooks</span>
          </div>

          <form
            className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[220px]"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch();
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search audiobooks..."
                className="h-9 pl-8 text-sm"
              />
            </div>
          </form>

          <div className="w-full sm:w-auto sm:min-w-[160px]">
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
        </div>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {stories.map((story) => (
            <StoryCard key={story.id} {...story} />
          ))}
        </section>

        {stories.length === 0 && (
          <div className="mt-6 rounded-lg border border-border p-6 text-center text-muted-foreground">
            {searchQuery ? "No audiobooks match your search." : "No audiobooks available yet."}
          </div>
        )}

        <div ref={sentinelRef} className="mt-8 flex items-center justify-center py-4">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more audiobooks...
            </div>
          )}
          {!hasNextPage && stories.length > 0 && (
            <p className="text-sm text-muted-foreground">You've reached the end of the audiobooks.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Audiobooks;
