import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { ContinueListeningItem, PaginatedResponse } from "@/api/types";

export function useContinueListening(enabled: boolean) {
  return useQuery<PaginatedResponse<ContinueListeningItem>>({
    queryKey: ["home-continue-listening"],
    queryFn: () => authApi.getContinueListening(1),
    enabled,
    staleTime: 30_000,
  });
}
