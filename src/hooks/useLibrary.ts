import { keepPreviousData, useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { LibraryFacets, Story, StoryListResponse } from "@/api/types";

export function useLibraryStories(params: Record<string, string>) {
  return useInfiniteQuery<StoryListResponse>({
    queryKey: ["library-stories", params],
    queryFn: ({ pageParam }) => storyApi.getLibraryStories(pageParam as number, params),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
    // Keep the old results on screen while a changed filter loads, so the grid
    // does not flash empty between every click.
    placeholderData: keepPreviousData,
  });
}

/** Counts for the sidebar. `params` should not include `sort` (it cannot change a count). */
export function useLibraryFacets(params: Record<string, string>, enabled = true) {
  return useQuery<LibraryFacets>({
    queryKey: ["library-facets", params],
    queryFn: () => storyApi.getLibraryFacets(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useLibraryCollections(enabled = true) {
  return useQuery({
    queryKey: ["library-collections"],
    queryFn: storyApi.getLibraryCollections,
    enabled,
    staleTime: 10 * 60_000,
  });
}

/**
 * The signed-in reader's progress for the stories on screen, one request per
 * loaded page (not per card). Returns {storyId: 0–1}.
 */
export function useStoryProgressMap(stories: Story[], enabled: boolean, pageSize = 12): Record<number, number> {
  const chunks: number[][] = [];
  for (let index = 0; index < stories.length; index += pageSize) {
    chunks.push(stories.slice(index, index + pageSize).map((story) => story.id));
  }
  const results = useQueries({
    queries: chunks.map((ids) => ({
      queryKey: ["story-progress", ids.join(",")],
      queryFn: () => storyApi.getStoryProgress(ids),
      enabled,
      staleTime: 60_000,
    })),
  });
  const merged: Record<number, number> = {};
  for (const result of results) {
    for (const [id, value] of Object.entries(result.data?.progress ?? {})) merged[Number(id)] = value;
  }
  return merged;
}
