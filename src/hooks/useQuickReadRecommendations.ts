import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { storyApi } from "@/api/story";
import { Story } from "@/api/types";

export function useQuickReadRecommendations(enabled: boolean, excludeSlug?: string, isAuthenticated: boolean = true) {
  return useQuery<Story[]>({
    queryKey: ["quick-read-recommendations", isAuthenticated ? "auth" : "guest", excludeSlug],
    queryFn: async () => {
      if (isAuthenticated) {
        return authApi.getQuickReadRecommendations(excludeSlug);
      }
      const res = await storyApi.getStories(1, [], "popular", "all", "", "all", "all", [], false, true);
      return res.results.filter((story) => story.slug !== excludeSlug).slice(0, 6);
    },
    enabled,
    staleTime: 30_000,
  });
}
