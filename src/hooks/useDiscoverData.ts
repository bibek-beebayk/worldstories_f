import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { DiscoverDataResponse } from "@/api/types";

// `initialData` is optional and comes from the Discover route's loader.
export function useDiscoverData(initialData?: DiscoverDataResponse) {
  return useQuery<DiscoverDataResponse>({
    queryKey: ["discover-data"],
    queryFn: storyApi.getDiscoverData,
    initialData,
    // Seeded by the route loader (server-to-server); don't re-fetch it
    // cross-origin the moment the browser hydrates. See useHomeData.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
