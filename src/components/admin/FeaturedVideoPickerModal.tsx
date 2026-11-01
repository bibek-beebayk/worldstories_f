import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storyApi } from "@/api/story";
import type { PublicVideo } from "@/api/types";

interface FeaturedVideoPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Video ids to hide — the videos already featured. */
  excludeIds: number[];
  onSelect: (video: PublicVideo) => void;
}

/** Searchable, infinite-scrolling grid of watchable videos, for the Featured screen. */
export function FeaturedVideoPickerModal({ open, onClose, excludeIds, onSelect }: FeaturedVideoPickerModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setSearchInput("");
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["admin-featured-video-picker", query],
    queryFn: ({ pageParam }) => storyApi.getVideos(pageParam as number, query),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
    enabled: open,
  });

  const excluded = new Set(excludeIds);
  const videos = (data?.pages.flatMap((page) => page.results) ?? []).filter((v) => !excluded.has(v.id));

  useEffect(() => {
    if (!open || !hasNextPage) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Card className="flex h-[85vh] w-full max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b pb-4">
          <CardTitle className="text-base">Choose a video</CardTitle>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by video or story title"
              className="pl-8"
              autoFocus
            />
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading videos...</p>
          ) : videos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {query ? "No videos match your search." : "No videos available."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => onSelect(video)}
                    className="group text-left focus-visible:outline-none"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-md border bg-muted">
                      <img
                        src={video.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug group-hover:text-primary">
                      {video.title}
                    </p>
                    {video.story && (
                      <p className="truncate text-[11px] text-muted-foreground">{video.story.title}</p>
                    )}
                  </button>
                ))}
              </div>
              <div ref={sentinelRef} className="flex h-12 items-center justify-center">
                {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
