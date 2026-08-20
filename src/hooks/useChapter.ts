import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { getDecryptedChapter } from "./useOfflineDownload";
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
    queryFn: async () => {
      try {
        return await storyApi.getChapter(story_slug, chapter_slug, type);
      } catch (err) {
        // Network unreachable (or the request otherwise failed) — fall back
        // to a downloaded, decrypted copy of this exact chapter if one
        // exists, rather than surfacing an error the user can't act on.
        if (type === "text") {
          const offline = await getDecryptedChapter(story_slug, chapter_slug);
          if (offline) return offline;
        }
        throw err;
      }
    },
    initialData,
  });
}
