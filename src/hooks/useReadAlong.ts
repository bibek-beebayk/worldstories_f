import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { ReadAlongResponse } from "@/api/types";
import { getOfflineAudioOnlyReadAlong, getOfflineReadAlong } from "@/lib/offlineReadAlong";

// `initialData` is optional and comes from the route loader — it seeds the
// first render (server and client) with the real payload so there's no
// loading flash and no post-hydration refetch. Mirrors `useStory`.
export function useReadAlong(
  storySlug: string | undefined,
  audioSlug: string | undefined,
  initialData?: ReadAlongResponse
) {
  return useQuery({
    queryKey: ["read-along", storySlug, audioSlug],
    queryFn: async () => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        const offline = await getOfflineReadAlong(storySlug!, audioSlug!);
        if (offline) return offline;
        const audioOnly = await getOfflineAudioOnlyReadAlong(storySlug!, audioSlug!);
        if (audioOnly) return audioOnly;
        throw new Error("This Read Along track is not available offline.");
      }
      try {
        return await storyApi.getReadAlong(storySlug!, audioSlug!);
      } catch (error) {
        if (typeof window !== "undefined") {
          const offline = await getOfflineReadAlong(storySlug!, audioSlug!);
          if (offline) return offline;
          const audioOnly = await getOfflineAudioOnlyReadAlong(storySlug!, audioSlug!);
          if (audioOnly) return audioOnly;
        }
        throw error;
      }
    },
    enabled: Boolean(storySlug && audioSlug),
    initialData,
    retry: false,
    // Local IndexedDB fallback must run even while TanStack's online manager
    // has queries paused because the browser reports an offline connection.
    networkMode: "always",
  });
}
