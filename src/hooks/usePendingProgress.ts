import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listLocalProgress, listPendingSaves } from "@/lib/offlineDb";
import { PENDING_PROGRESS_EVENT } from "@/lib/progressEvents";

export function usePendingProgress(storySlug: string) {
  const queryClient = useQueryClient();
  const queryKey = ["pending-progress", storySlug] as const;
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const [local, pending] = await Promise.all([listLocalProgress(storySlug), listPendingSaves()]);
      return { local, pending: pending.filter((save) => save.story_slug === storySlug) };
    },
    staleTime: 0,
  });

  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["pending-progress", storySlug] });
    window.addEventListener(PENDING_PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PENDING_PROGRESS_EVENT, refresh);
  }, [queryClient, storySlug]);

  const chapterProgress: Record<string, number> = {};
  // The content anchor saved alongside the percentage (see lib/readerPosition.ts).
  // Surfaced separately so a signed-out reader resumes by paragraph too, not
  // only signed-in readers whose position round-trips through the API.
  const chapterPosition: Record<string, string> = {};
  const audioProgress: Record<string, number> = {};
  let fileProgress: number | undefined;

  (query.data?.local || []).forEach((save) => {
    if (save.kind === "chapter") {
      chapterProgress[save.item_slug] = save.progress;
      if (save.position) chapterPosition[save.item_slug] = save.position;
    }
    if (save.kind === "audio") audioProgress[save.item_slug] = save.progress;
    if (save.kind === "file") fileProgress = save.progress;
  });
  (query.data?.pending || []).forEach((save) => {
    if (save.kind === "chapter") {
      chapterProgress[save.chapter_slug] = save.progress;
      if (save.last_element_id) chapterPosition[save.chapter_slug] = save.last_element_id;
    }
    if (save.kind === "audio") audioProgress[save.audio_slug] = save.progress;
    if (save.kind === "file") fileProgress = save.progress;
  });

  return { chapterProgress, chapterPosition, audioProgress, fileProgress };
}
