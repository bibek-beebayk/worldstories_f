import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { SearchResponse } from "@/api/types";

export function useSearchStories(
  q: string,
  page: number = 1,
  sort: string = "popular",
  language: string = "all",
  authorPage: number = 1,
  chapterPage: number = 1
) {
  const trimmed = q.trim();
  return useQuery<SearchResponse>({
    queryKey: ["site-search", trimmed, page, sort, language, authorPage, chapterPage],
    queryFn: () => storyApi.searchStories(trimmed, page, sort, language, authorPage, chapterPage),
    enabled: trimmed.length >= 2,
    placeholderData: (previousData) => previousData,
  });
}
