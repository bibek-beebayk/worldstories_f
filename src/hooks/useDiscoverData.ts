import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { DiscoverDataResponse } from "@/api/types";

// `initialData` is optional and comes from the Discover route's loader.
export function useDiscoverData(initialData?: DiscoverDataResponse) {
  return useQuery<DiscoverDataResponse>({
    queryKey: ["discover-data"],
    queryFn: storyApi.getDiscoverData,
    initialData,
  });
}
