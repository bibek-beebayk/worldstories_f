import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { Genre, StoryListResponse } from "@/api/types";

export function useGenres() {
  return useQuery<Genre[]>({
    queryKey: ["genres"],
    queryFn: storyApi.getGenres,
  });
}
