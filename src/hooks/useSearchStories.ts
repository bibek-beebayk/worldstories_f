import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { StoryListResponse } from "@/api/types";

export function useSearchStories(
  q: string,
  page: number = 1,
  sort: string = "popular"
) {
  const trimmed = q.trim();
  return useQuery<StoryListResponse>({
    queryKey: ["search-stories", trimmed, page, sort],
    queryFn: () => storyApi.searchStories(trimmed, page, sort),
    enabled: trimmed.length >= 2,
    placeholderData: (previousData) => previousData,
  });
}
