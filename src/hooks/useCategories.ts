import { useQuery } from "@tanstack/react-query";
import { storyApi } from "../api/story";
import { Category } from "@/api/types";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: storyApi.getCategories,
  });
}
