import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { Story } from "@/api/types";

export function useQuickReadRecommendations(enabled: boolean, excludeSlug?: string) {
  return useQuery<Story[]>({
    queryKey: ["quick-read-recommendations", excludeSlug],
    queryFn: () => authApi.getQuickReadRecommendations(excludeSlug),
    enabled,
    staleTime: 30_000,
  });
}
