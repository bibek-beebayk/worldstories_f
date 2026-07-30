import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { StoryListResponse } from "@/api/types";

export function useSearchStories(
  q: string,
  page: number = 1,
  sort: string = "popular",
  language: string = "all"
) {
  const trimmed = q.trim();
  return useQuery<StoryListResponse>({
    queryKey: ["search-stories", trimmed, page, sort, language],
    queryFn: () => storyApi.searchStories(trimmed, page, sort, language),
    enabled: trimmed.length >= 2,
    placeholderData: (previousData) => previousData,
  });
}
