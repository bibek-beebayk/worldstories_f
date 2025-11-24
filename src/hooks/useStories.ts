import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { StoryListResponse } from "@/api/types";

export function useStories() {
  return useQuery<StoryListResponse>({
    queryKey: ["stories"],
    queryFn: storyApi.getStories,
  });
}
