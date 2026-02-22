import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { HomeDataResponse } from "@/api/types";

export function useHomeData() {
  return useQuery<HomeDataResponse>({
    queryKey: ["home-data"],
    queryFn: storyApi.getHomeData,
  });
}
