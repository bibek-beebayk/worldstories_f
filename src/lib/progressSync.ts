import { storyApi } from "@/api/story";
import { PendingSave, deletePendingSave, listPendingSaves, queuePendingSave } from "@/lib/offlineDb";

// A progress save that fails (almost always because the device is offline)
// gets queued here instead of silently discarded, and retried the next time
// connectivity comes back — see flushPendingSaves(), triggered from
// DefaultLayout on the browser's `online` event (and once on mount, to catch
// anything left over from a previous offline session).

export function queueChapterProgress(
  story_slug: string,
  chapter_slug: string,
  progress: number,
  last_element_id?: string
): Promise<void> {
  return queuePendingSave({
    key: `chapter:${story_slug}:${chapter_slug}`,
    kind: "chapter",
    story_slug,
    chapter_slug,
    progress,
    last_element_id,
    queued_at: new Date().toISOString(),
  });
}

export function queueAudioProgress(
  story_slug: string,
  audio_slug: string,
  progress: number,
  position_seconds: number,
  duration_seconds: number
): Promise<void> {
  return queuePendingSave({
    key: `audio:${story_slug}:${audio_slug}`,
    kind: "audio",
    story_slug,
    audio_slug,
    progress,
    position_seconds,
    duration_seconds,
    queued_at: new Date().toISOString(),
  });
}

export function queueFileProgress(
  story_slug: string,
  format: "epub" | "pdf",
  progress: number,
  position: string
): Promise<void> {
  return queuePendingSave({
    key: `file:${story_slug}:${format}`,
    kind: "file",
    story_slug,
    format,
    progress,
    position,
    queued_at: new Date().toISOString(),
  });
}

async function replay(save: PendingSave): Promise<void> {
  switch (save.kind) {
    case "chapter":
      await storyApi.saveReadingProgress(save.story_slug, save.chapter_slug, save.progress, save.last_element_id);
      return;
    case "audio":
      await storyApi.saveAudioProgress(
        save.story_slug,
        save.audio_slug,
        save.progress,
        save.position_seconds,
        save.duration_seconds
      );
      return;
    case "file":
      await storyApi.saveFileReadingProgress(save.story_slug, save.format, save.progress, save.position);
      return;
  }
}

let isFlushing = false;

// Best-effort: each queued save is tried once. Ones that still fail (still
// offline, or the request itself is genuinely invalid) are left in the queue
// for the next trigger rather than retried in a tight loop here.
export async function flushPendingSaves(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;
  try {
    const pending = await listPendingSaves();
    for (const save of pending) {
      try {
        await replay(save);
        await deletePendingSave(save.key);
      } catch {
        // Still unreachable (or the save is otherwise still failing) — leave
        // it queued and move on to the rest rather than aborting the batch.
      }
    }
  } finally {
    isFlushing = false;
  }
}
