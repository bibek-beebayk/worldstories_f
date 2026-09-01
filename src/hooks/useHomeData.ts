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
    // The SSR loader already fetched this server-to-server. Treat that data as
    // fresh so the browser doesn't immediately re-request it cross-origin on
    // hydration — that refetch adds a slow round trip (and, if the API's CORS
    // isn't allowing this origin, a console error) for data already on screen.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
