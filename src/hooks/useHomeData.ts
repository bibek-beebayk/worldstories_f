import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { HomeDataResponse } from "@/api/types";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

// `initialData` is optional and comes from the home route's loader — seeds
// the very first render (server and client) with real data instead of a
// loading state.
//
// The loader's payload is the signed-out page: the server renders without the
// reader's token, so audience-gated sections ("signed-in only" / "signed-out
// only") are resolved for a guest. A signed-in reader therefore refetches with
// their token under a different key. While that loads the guest payload stays
// on screen, flagged by `isPlaceholderData`, so callers can hold back anything
// that would flash the wrong sections.
export function useHomeData(initialData?: HomeDataResponse) {
  const isLoggedIn = useIsLoggedIn();
  return useQuery<HomeDataResponse>({
    queryKey: ["home-data", isLoggedIn ? "member" : "guest"],
    queryFn: storyApi.getHomeData,
    initialData: isLoggedIn ? undefined : initialData,
    placeholderData: keepPreviousData,
    // The SSR loader already fetched this server-to-server. Treat that data as
    // fresh so the browser doesn't immediately re-request it cross-origin on
    // hydration — that refetch adds a slow round trip (and, if the API's CORS
    // isn't allowing this origin, a console error) for data already on screen.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
