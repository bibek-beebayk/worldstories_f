import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { ReadAlongResponse } from "@/api/types";

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
    queryFn: () => storyApi.getReadAlong(storySlug!, audioSlug!),
    enabled: Boolean(storySlug && audioSlug),
    initialData,
  });
}
