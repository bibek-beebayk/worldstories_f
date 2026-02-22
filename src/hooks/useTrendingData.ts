import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { TrendingDataResponse } from "@/api/types";

export function useTrendingData() {
  return useQuery<TrendingDataResponse>({
    queryKey: ["trending-data"],
    queryFn: storyApi.getTrendingData,
  });
}
