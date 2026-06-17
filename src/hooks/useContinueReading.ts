import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { ContinueReadingItem, PaginatedResponse } from "@/api/types";

export function useContinueReading(enabled: boolean) {
  return useQuery<PaginatedResponse<ContinueReadingItem>>({
    queryKey: ["home-continue-reading"],
    queryFn: () => authApi.getContinueReading(1),
    enabled,
    staleTime: 30_000,
  });
}
