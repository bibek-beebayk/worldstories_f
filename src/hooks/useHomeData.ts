import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { HomeDataResponse } from "@/api/types";

// `initialData` is optional and comes from the home route's loader — seeds
// the very first render (server and client) with real data instead of a
// loading state.
export function useHomeData(initialData?: HomeDataResponse) {
  return useQuery<HomeDataResponse>({
    queryKey: ["home-data"],
    queryFn: storyApi.getHomeData,
    initialData,
  });
}
