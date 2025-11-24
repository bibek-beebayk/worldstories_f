import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { StoryListResponse } from "@/api/types";

export function useStories(page: number = 1, genres: number[] = [], sort: string = "popular", status: string = "all") {
  return useQuery<StoryListResponse>({
    queryKey: ["stories", page, genres, sort, status],
    queryFn: () => storyApi.getStories(page, genres, sort, status),
  });
}
