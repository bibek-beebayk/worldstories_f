import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { StoryListResponse } from "@/api/types";

/**
 * First page of WorldStories Originals, for the "featured at the top" rail on
 * the homepage / library / discover. Kept separate from `useInfiniteOriginals`
 * (the full `/originals` page) — this one never paginates.
 */
export function useOriginals(options?: { enabled?: boolean }) {
  return useQuery<StoryListResponse>({
    queryKey: ["originals-preview"],
    queryFn: () => storyApi.getOriginals(1),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}
