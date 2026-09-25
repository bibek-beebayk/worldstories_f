import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfiniteStories } from "@/hooks/useInfiniteStories";
import { formatViews } from "@/lib/utils";
import { Headphones, Loader2, Music, Search } from "lucide-react";
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
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-600 text-white">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        {/* Decorative only — a big pulsing headphone watermark plus small
            drifting notes, echoing the "listen" theme the way Quick Reads'
            bolt echoes "fast". */}
        <Headphones className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 animate-flicker text-white/10" style={{ animationDuration: "3s" }} />
        <Music className="pointer-events-none absolute bottom-5 left-[16%] h-6 w-6 animate-float text-white/25" style={{ animationDuration: "4.5s" }} />
        <Music className="pointer-events-none absolute right-[26%] top-8 h-5 w-5 animate-float text-white/20" style={{ animationDelay: "1s", animationDuration: "5.5s" }} />

        <div className="container relative mx-auto px-3 py-8 sm:px-4 sm:py-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Headphones className="h-3.5 w-3.5" />
            Listen
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Audiobooks</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
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

        <section className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {stories.map((story) => (
            <StoryCard key={story.id} {...story} linkTo={`/listen/${story.slug}`} />
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
