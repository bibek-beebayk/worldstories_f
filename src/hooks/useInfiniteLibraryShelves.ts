import { useInfiniteQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { LibraryShelvesResponse } from "@/api/types";

export function useInfiniteLibraryShelves(enabled: boolean = true) {
  return useInfiniteQuery<LibraryShelvesResponse>({
    queryKey: ["infinite-library-shelves"],
    queryFn: ({ pageParam }) => storyApi.getLibraryShelves(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
    enabled,
  });
}
