import { useInfiniteQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { StoryListResponse } from "@/api/types";

export function useInfiniteOriginals() {
  return useInfiniteQuery<StoryListResponse>({
    queryKey: ["infinite-originals"],
    queryFn: ({ pageParam }) => storyApi.getOriginals(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages
        ? lastPage.pagination.page + 1
        : undefined,
  });
}
