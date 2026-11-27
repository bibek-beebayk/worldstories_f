import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { ContinueReadingItem, PaginatedResponse } from "@/api/types";

export function useContinueReading(enabled: boolean) {
  return useQuery<PaginatedResponse<ContinueReadingItem>>({
    queryKey: ["home-continue-reading"],
    queryFn: () => authApi.getContinueReading(1),
    enabled,
    // Always the latest read: a stale cache would show the wrong card first
    // right after the reader comes back from a chapter, EPUB or PDF.
    staleTime: 0,
    refetchOnMount: "always",
  });
}
