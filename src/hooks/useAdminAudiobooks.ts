import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { AdminAudiobookDetail, AdminAudiobookListParams, AdminAudiobookTrack } from "@/api/types";

export const adminAudiobookKeys = {
  all: ["admin-audiobooks"] as const,
  list: (params: AdminAudiobookListParams) => ["admin-audiobooks", "list", params] as const,
  detail: (id: number) => ["admin-audiobook", id] as const,
  stats: ["admin-audiobook-stats"] as const,
  series: ["admin-audiobook-series"] as const,
  storySearch: (q: string) => ["admin-audiobook-story-search", q] as const,
};

export function useAdminAudiobooks(params: AdminAudiobookListParams) {
  return useQuery({
    queryKey: adminAudiobookKeys.list(params),
    queryFn: () => storyApi.listAdminAudiobooks(params),
    placeholderData: (prev) => prev,
  });
}

export function useAdminAudiobook(id: number | null) {
  return useQuery({
    queryKey: adminAudiobookKeys.detail(id ?? 0),
    queryFn: () => storyApi.getAdminAudiobook(id as number),
    enabled: typeof id === "number" && Number.isFinite(id) && id > 0,
  });
}

export function useAdminAudiobookStats() {
  return useQuery({
    queryKey: adminAudiobookKeys.stats,
    queryFn: () => storyApi.getAdminAudiobookStats(),
  });
}

export function useAdminAudiobookSeries(q?: string) {
  return useQuery({
    queryKey: q ? [...adminAudiobookKeys.series, q] : adminAudiobookKeys.series,
    queryFn: () => storyApi.listAdminAudiobookSeries(q),
  });
}

export function useAdminStorySearch(q: string, enabled: boolean = true) {
  return useQuery({
    queryKey: adminAudiobookKeys.storySearch(q),
    queryFn: () => storyApi.searchAdminStoriesForAudiobook(q),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateAdminAudiobook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormData | Record<string, unknown>) => storyApi.createAdminAudiobook(payload),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.series });
      qc.setQueryData(adminAudiobookKeys.detail(created.id), created);
    },
  });
}

export function useUpdateAdminAudiobook(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormData | Record<string, unknown>) => storyApi.updateAdminAudiobook(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(adminAudiobookKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.series });
    },
  });
}

export function useDeleteAdminAudiobook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => storyApi.deleteAdminAudiobook(id),
    onSuccess: (_res, id) => {
      qc.removeQueries({ queryKey: adminAudiobookKeys.detail(id) });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.series });
    },
  });
}

export function useUploadAudiobookTracks(audiobookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => storyApi.uploadAdminAudiobookTracks(audiobookId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.detail(audiobookId) });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
    },
  });
}

export function useReorderAudiobookTracks(audiobookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => storyApi.reorderAdminAudiobookTracks(audiobookId, ids),
    onMutate: async (ids: number[]) => {
      await qc.cancelQueries({ queryKey: adminAudiobookKeys.detail(audiobookId) });
      const previous = qc.getQueryData<AdminAudiobookDetail>(adminAudiobookKeys.detail(audiobookId));
      if (previous) {
        const byId = new Map<number, AdminAudiobookTrack>(previous.tracks.map((t) => [t.id, t]));
        const reordered = ids
          .map((id, index) => {
            const track = byId.get(id);
            return track ? { ...track, order: index + 1 } : null;
          })
          .filter((t): t is AdminAudiobookTrack => t !== null);
        if (reordered.length === previous.tracks.length) {
          qc.setQueryData<AdminAudiobookDetail>(adminAudiobookKeys.detail(audiobookId), {
            ...previous,
            tracks: reordered,
          });
        }
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        qc.setQueryData(adminAudiobookKeys.detail(audiobookId), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.detail(audiobookId) });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
    },
  });
}

export function useUpdateAudiobookTrack(audiobookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      trackId,
      payload,
    }: {
      trackId: number;
      payload: FormData | { title?: string; order?: number; read_along_offset_ms?: number };
    }) => storyApi.updateAdminAudiobookTrack(audiobookId, trackId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.detail(audiobookId) });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
    },
  });
}

export function useDeleteAudiobookTrack(audiobookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackId: number) => storyApi.deleteAdminAudiobookTrack(audiobookId, trackId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.detail(audiobookId) });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
    },
  });
}

export function useRereadAudiobookTrackDuration(audiobookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackId: number) => storyApi.rereadAdminAudiobookTrackDuration(audiobookId, trackId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.detail(audiobookId) });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
    },
  });
}

export function useMoveAudiobookTrack(audiobookId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ trackId, targetAudiobookId }: { trackId: number; targetAudiobookId: number }) =>
      storyApi.moveAdminAudiobookTrack(audiobookId, trackId, targetAudiobookId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.detail(audiobookId) });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.detail(variables.targetAudiobookId) });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
    },
  });
}

export function useCreateAdminAudiobookSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; slug?: string; description?: string }) =>
      storyApi.createAdminAudiobookSeries(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.series });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
    },
  });
}

export function useUpdateAdminAudiobookSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<{ title: string; slug: string; description: string }>;
    }) => storyApi.updateAdminAudiobookSeries(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.series });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
    },
  });
}

export function useDeleteAdminAudiobookSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => storyApi.deleteAdminAudiobookSeries(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.series });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.all });
      qc.invalidateQueries({ queryKey: adminAudiobookKeys.stats });
    },
  });
}
