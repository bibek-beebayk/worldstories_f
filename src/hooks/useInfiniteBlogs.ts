import { useInfiniteQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { Blog, PaginatedResponse } from "@/api/types";

export function useInfiniteBlogs(q: string = "", sort: string = "newest", linkedToStory?: boolean) {
  return useInfiniteQuery<PaginatedResponse<Blog>>({
    queryKey: ["infinite-blogs", q, sort, linkedToStory],
    queryFn: ({ pageParam }) => storyApi.getBlogs(pageParam as number, q, sort, linkedToStory),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.pages ? lastPage.pagination.page + 1 : undefined,
  });
}
