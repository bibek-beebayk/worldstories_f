import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { QuickReadHeroResponse } from "@/api/types";

export function useQuickReadHero(enabled: boolean) {
  return useQuery<QuickReadHeroResponse>({
    queryKey: ["quick-read-hero"],
    queryFn: storyApi.getQuickReadHero,
    enabled,
    staleTime: 60_000,
  });
}
