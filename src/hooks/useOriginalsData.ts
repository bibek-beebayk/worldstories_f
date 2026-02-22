import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import { OriginalsDataResponse } from "@/api/types";

export function useOriginalsData() {
  return useQuery<OriginalsDataResponse>({
    queryKey: ["originals-data"],
    queryFn: storyApi.getOriginalsData,
  });
}
