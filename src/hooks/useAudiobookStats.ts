import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { AudiobookStats } from "@/api/types";

export function useAudiobookStats() {
  return useQuery<AudiobookStats>({
    queryKey: ["audiobook-stats"],
    queryFn: storyApi.getAudiobookStats,
    staleTime: 10 * 60 * 1000,
  });
}
