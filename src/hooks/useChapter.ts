import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";

export function useChapter(story_slug: string, chapter_slug: string, type: string) {
  return useQuery({
    queryKey: ["story", story_slug, chapter_slug],
    queryFn: () => storyApi.getChapter(story_slug, chapter_slug, type),
  });
}
