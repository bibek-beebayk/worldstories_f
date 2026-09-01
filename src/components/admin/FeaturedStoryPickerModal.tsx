import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CoverImage from "@/components/CoverImage";
import { storyApi } from "@/api/story";
import type { AdminStory } from "@/api/types";

interface FeaturedStoryPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Story ids to hide from the results — the stories already featured. */
  excludeIds: number[];
  onSelect: (story: AdminStory) => void;
}

/**
 * Full-story picker for the Featured Stories admin screen: a searchable,
 * infinite-scrolling 2-column grid of cover + title. Opened by clicking any
 * slot (empty or filled) on the Featured Stories page.
 */
export function FeaturedStoryPickerModal({
  open,
  onClose,
  excludeIds,
  onSelect,
}: FeaturedStoryPickerModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Start fresh each time the modal opens for a (possibly different) slot.
  useEffect(() => {
    if (open) {
      setSearchInput("");
      setDebouncedQuery("");
    }
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["admin-featured-picker", debouncedQuery],
    queryFn: ({ pageParam }) => storyApi.getAdminStories(pageParam as number, debouncedQuery),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
    enabled: open,
  });

  const excludeSet = new Set(excludeIds);
  const stories = (data?.pages.flatMap((page) => page.results) ?? []).filter(
    (story) => !excludeSet.has(story.id)
  );

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
          <CardTitle className="text-base">Choose a story</CardTitle>
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
              placeholder="Search by title or slug"
              className="pl-8"
              autoFocus
            />
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading stories...</p>
          ) : stories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {debouncedQuery ? "No stories match your search." : "No stories available."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
                {stories.map((story) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => onSelect(story)}
                    className="group text-left focus-visible:outline-none"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-md border bg-muted">
                      <CoverImage
                        src={story.cover_image_url}
                        alt={story.title}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      {!story.is_published && (
                        <span className="absolute left-1 top-1 rounded-full bg-amber-500 px-1 py-0.5 text-[9px] font-medium text-white">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug group-hover:text-primary">
                      {story.title}
                    </p>
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
