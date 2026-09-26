import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import type { Chapter } from "../api/types";

// `initialData` is optional and comes from a route loader when the page has
// one — seeds the very first render (server and client) with real data
// instead of a loading state, without changing how this hook behaves for
// callers that don't pass it.
export function useChapter(
  story_slug: string,
  chapter_slug: string,
  type: string,
  initialData?: Chapter
) {
  return useQuery({
    queryKey: ["story", story_slug, chapter_slug],
    queryFn: () => storyApi.getChapter(story_slug, chapter_slug, type),
    initialData,
  });
}
