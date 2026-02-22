import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { DiscoverDataResponse } from "@/api/types";

export function useDiscoverData() {
  return useQuery<DiscoverDataResponse>({
    queryKey: ["discover-data"],
    queryFn: storyApi.getDiscoverData,
  });
}
