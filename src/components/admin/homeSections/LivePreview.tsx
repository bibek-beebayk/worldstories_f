import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AdminHomeSectionPreviewPayload, Blog, PublicVideo, Story } from "@/api/types";
import { storyApi } from "@/api/story";
import BlogCard from "@/components/BlogCard";
import StoryCard from "@/components/StoryCard";
import VideoCard from "@/components/VideoCard";
import { SettingGroup } from "./controls";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

export function LivePreview({
  payload,
  validationError,
}: {
  payload: AdminHomeSectionPreviewPayload | null;
  validationError: string | null;
}) {
  const debounced = useDebouncedValue(payload, 500);
  const preview = useQuery({
    queryKey: ["admin-home-section-preview", debounced],
    queryFn: () => storyApi.previewAdminHomeSection(debounced!),
    enabled: debounced !== null && validationError === null,
    placeholderData: keepPreviousData,
    retry: false,
  });

  if (!payload) return null;
  const data = preview.data;
  const message = preview.error instanceof Error ? preview.error.message : "Could not load the preview.";
  return (
    <SettingGroup title="Live preview" note="Updates about half a second after you change a setting.">
      {validationError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {validationError}
        </p>
      ) : preview.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Loading preview">
          {Array.from({ length: Math.min(payload.item_limit, 6) }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="aspect-[3/4] animate-pulse rounded-md bg-muted" />
              <div className="h-4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : preview.isError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {message}
        </p>
      ) : data?.total_matching === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing matches these rules. Loosen one.
        </p>
      ) : data ? (
        <>
          <p className="text-sm font-medium" aria-live="polite">
            Showing {data.items.length} of {data.total_matching} matching
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {payload.section_type === "stories_query" || payload.section_type === "stories_manual"
              ? data.items.map((item) => <StoryCard key={item.id} {...(item as Story)} compact />)
              : payload.section_type === "videos"
                ? data.items.map((item) => <VideoCard key={item.id} video={item as PublicVideo} />)
                : data.items.map((item) => <BlogCard key={item.id} blog={item as Blog} />)}
          </div>
        </>
      ) : null}
    </SettingGroup>
  );
}
