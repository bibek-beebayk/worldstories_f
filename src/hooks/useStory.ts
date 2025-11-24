import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";

export function useStory(slug: string) {
  return useQuery({
    queryKey: ["story", slug],
    queryFn: () => storyApi.getStory(slug),
  });
}
