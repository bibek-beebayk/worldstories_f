import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import type { StoryDetail } from "../api/types";

// `initialData` is optional and comes from a route loader when the page has
// one — seeds the very first render (server and client) with real data
// instead of a loading state, without changing how this hook behaves for
// callers that don't pass it.
export function useStory(slug: string, initialData?: StoryDetail) {
  return useQuery({
    queryKey: ["story", slug],
    queryFn: () => storyApi.getStory(slug),
    initialData,
  });
}
