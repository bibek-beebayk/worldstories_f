import { useInfiniteQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { StoryListResponse } from "@/api/types";

export function useInfiniteStories(
  genres: number[] = [],
  sort: string = "popular",
  status: string = "all",
  q: string = "",
  language: string = "all",
  storyType: string = "all",
  enabled: boolean = true,
  categories: number[] = [],
  hasAudio: boolean = false
) {
  return useInfiniteQuery<StoryListResponse>({
    queryKey: ["infinite-stories", genres, sort, status, q, language, storyType, categories, hasAudio],
    queryFn: ({ pageParam }) =>
      storyApi.getStories(pageParam as number, genres, sort, status, q, language, storyType, categories, hasAudio),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
    enabled,
  });
}
