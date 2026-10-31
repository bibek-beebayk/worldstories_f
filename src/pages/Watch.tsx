import FullScreenLoader from "@/components/FullScreenLoader";
import VideoCard from "@/components/VideoCard";
import { Input } from "@/components/ui/input";
import { storyApi } from "@/api/story";
import { formatViews } from "@/lib/utils";
import { Loader2, Search, Youtube } from "lucide-react";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildMeta } from "@/lib/buildMeta";

export function meta() {
  return buildMeta({
    title: "Watch — Video Narrations | WorldStories",
    description: "Browse every WorldStories video — animated narrations and more — to watch on YouTube.",
    path: "/watch",
  });
}

const Watch = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [videoType, setVideoType] = useState<number | null>(null);
  const { data: videoTypes = [] } = useQuery({
    queryKey: ["video-types"],
    queryFn: () => storyApi.getVideoTypes(),
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["watch-videos", searchQuery, videoType],
    queryFn: ({ pageParam }) => storyApi.getVideos(pageParam as number, searchQuery, videoType),
    initialPageParam: 1,
    // Keep the grid (and the filter chips) on screen while a new filter loads,
    // instead of dropping back to the full-screen loader.
    placeholderData: keepPreviousData,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.pages ? last.pagination.page + 1 : undefined,
  });

  const videos = useMemo(() => data?.pages.flatMap((page) => page.results) || [], [data]);
  const totalCount = data?.pages[0]?.pagination?.count || 0;

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
      <div className="tinted-panel border-b [--tint:#6366f1] [--tint-2:#d946ef]">
        <div className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
          <div className="mb-2 inline-flex items-center gap-2 tinted-chip rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Youtube className="h-3.5 w-3.5" />
            Watch
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Watch</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Animated narrations and more — sit back and watch.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-2 text-xs sm:gap-2 sm:text-sm">
            <Youtube className="h-4 w-4 text-primary" />
            <span className="font-semibold">{formatViews(totalCount)}</span>
            <span className="hidden text-muted-foreground sm:inline">videos</span>
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
                placeholder="Search videos..."
                className="h-9 pl-8 text-sm"
              />
            </div>
          </form>

        </div>

        {videoTypes.length > 0 && (
          <div className="-mx-3 mb-5 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by category">
            {[{ id: null, name: "All" }, ...videoTypes].map((type) => {
              const active = videoType === type.id;
              return (
                <button
                  key={type.id ?? "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setVideoType(type.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  {type.name}
                </button>
              );
            })}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </section>

        {videos.length === 0 && (
          <div className="mt-6 rounded-lg border border-border p-6 text-center text-muted-foreground">
            {searchQuery || videoType ? "No videos match your filters." : "No videos available yet."}
          </div>
        )}

        <div ref={sentinelRef} className="mt-8 flex items-center justify-center py-4">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more...
            </div>
          )}
          {!hasNextPage && videos.length > 0 && (
            <p className="text-sm text-muted-foreground">You've reached the end.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Watch;
