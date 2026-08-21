import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import type { Blog } from "../api/types";

// `initialData` is optional and comes from a route loader when the page has
// one — seeds the very first render (server and client) with real data
// instead of a loading state, without changing how this hook behaves for
// callers that don't pass it.
export function useBlog(slug: string, initialData?: Blog) {
  return useQuery({
    queryKey: ["blog", slug],
    queryFn: () => storyApi.getBlog(slug),
    initialData,
  });
}
