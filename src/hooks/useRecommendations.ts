import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { Story } from "@/api/types";

export function useRecommendations(enabled: boolean) {
  return useQuery<Story[]>({
    queryKey: ["home-recommendations"],
    queryFn: authApi.getRecommendations,
    enabled,
    staleTime: 30_000,
  });
}
