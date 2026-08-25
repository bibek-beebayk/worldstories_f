import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { StoryType } from "@/api/types";

export function useStoryTypes() {
  return useQuery<StoryType[]>({
    queryKey: ["story-types"],
    queryFn: storyApi.getStoryTypes,
  });
}
