import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type {
  AudiobookProgressPayload,
  AudiobooksOverviewResponse,
  AudiobookStats,
  AudioReadingProgress,
  PaginatedResponse,
  PublicAudiobook,
  PublicAudiobookDetail,
  PublicAudiobookListParams,
  ReadAlongPayload,
} from "@/api/types";

export const audiobookKeys = {
  all: ["audiobooks"] as const,
  list: (params: PublicAudiobookListParams) => ["audiobooks", "list", params] as const,
  infinite: (params: Omit<PublicAudiobookListParams, "page">) =>
    ["audiobooks", "infinite", params] as const,
  overview: ["audiobooks", "overview"] as const,
  stats: ["audiobooks", "stats"] as const,
  detail: (slug: string) => ["audiobook", slug] as const,
  progress: (slug: string) => ["audiobook-progress", slug] as const,
  readAlong: (slug: string, audioSlug: string) => ["audiobook-read-along", slug, audioSlug] as const,
};

export function useAudiobooks(params: PublicAudiobookListParams = {}, enabled: boolean = true) {
  return useQuery<PaginatedResponse<PublicAudiobook>>({
    queryKey: audiobookKeys.list(params),
    queryFn: () => storyApi.getAudiobooks(params),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInfiniteAudiobooks(params: Omit<PublicAudiobookListParams, "page"> = {}) {
  return useInfiniteQuery<PaginatedResponse<PublicAudiobook>>({
    queryKey: audiobookKeys.infinite(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      storyApi.getAudiobooks({ ...params, page: pageParam as number }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.next ? lastPage.pagination.page + 1 : undefined,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAudiobooksOverview(
  enabled: boolean = true,
  options: { alwaysFresh?: boolean } = {}
) {
  return useQuery<AudiobooksOverviewResponse>({
    queryKey: audiobookKeys.overview,
    queryFn: () => storyApi.getAudiobooksOverview(),
    enabled,
    staleTime: options.alwaysFresh ? 0 : 60 * 1000,
    refetchOnMount: options.alwaysFresh ? "always" : true,
  });
}

export function useAudiobook(slug: string | undefined, initialData?: PublicAudiobookDetail) {
  return useQuery<PublicAudiobookDetail>({
    queryKey: audiobookKeys.detail(slug ?? ""),
    queryFn: () => storyApi.getAudiobook(slug!),
    enabled: Boolean(slug),
    initialData,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicAudiobookStats() {
  return useQuery<AudiobookStats>({
    queryKey: audiobookKeys.stats,
    queryFn: () => storyApi.getAudiobookStatsPublic(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAudiobookProgress(slug: string | undefined, enabled: boolean = true) {
  const qc = useQueryClient();
  const query = useQuery<AudioReadingProgress>({
    queryKey: audiobookKeys.progress(slug ?? ""),
    queryFn: () => storyApi.getAudiobookProgress(slug!),
    enabled: Boolean(slug) && enabled,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (payload: AudiobookProgressPayload) =>
      storyApi.saveAudiobookProgress(slug!, payload),
    onSuccess: (updated) => {
      if (slug) {
        qc.setQueryData(audiobookKeys.progress(slug), updated);
      }
      qc.invalidateQueries({ queryKey: audiobookKeys.overview });
    },
  });

  return { ...query, saveProgress: mutation };
}

export function useAudiobookReadAlong(
  slug: string | undefined,
  audioSlug: string | undefined,
  initialData?: ReadAlongPayload,
) {
  return useQuery<ReadAlongPayload>({
    queryKey: audiobookKeys.readAlong(slug ?? "", audioSlug ?? ""),
    queryFn: () => storyApi.getAudiobookReadAlong(slug!, audioSlug!),
    enabled: Boolean(slug) && Boolean(audioSlug),
    initialData,
    retry: false,
  });
}
