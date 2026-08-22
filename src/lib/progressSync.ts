import { storyApi } from "@/api/story";
import { PendingSave, claimAnonymousDownloads, claimAnonymousLocalProgress, deletePendingSave, listPendingSaves, queuePendingSave, saveLocalProgress } from "@/lib/offlineDb";
import { getOfflineOwnerId } from "@/lib/offlineIdentity";
import { PENDING_PROGRESS_EVENT } from "@/lib/progressEvents";
import { trackCompletionOnce } from "@/lib/analytics";
import { markStoryFinishedIfComplete } from "@/lib/storyCompletion";

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
    key: `${getOfflineOwnerId()}:chapter:${story_slug}:${chapter_slug}`,
    owner_id: getOfflineOwnerId(),
    kind: "chapter",
    story_slug,
    chapter_slug,
    progress,
    last_element_id,
    queued_at: new Date().toISOString(),
  }).then(() => window.dispatchEvent(new Event(PENDING_PROGRESS_EVENT)));
}

export async function saveChapterProgressLocally(
  story_slug: string,
  chapter_slug: string,
  progress: number,
  last_element_id?: string
): Promise<void> {
  await saveLocalProgress({
    kind: "chapter",
    story_slug,
    item_slug: chapter_slug,
    progress,
    position: last_element_id,
  });
  if (progress >= 0.995) trackCompletionOnce(story_slug, "chapter", chapter_slug);
  window.dispatchEvent(new Event(PENDING_PROGRESS_EVENT));
}

export async function saveAudioProgressLocally(
  story_slug: string,
  audio_slug: string,
  progress: number,
  position_seconds: number,
  duration_seconds: number
): Promise<void> {
  await saveLocalProgress({ kind: "audio", story_slug, item_slug: audio_slug, progress, position_seconds, duration_seconds });
  if (progress >= 0.995) trackCompletionOnce(story_slug, "audio", audio_slug);
  window.dispatchEvent(new Event(PENDING_PROGRESS_EVENT));
}

export async function saveFileProgressLocally(
  story_slug: string,
  format: "epub" | "pdf",
  progress: number,
  position: string
): Promise<void> {
  await saveLocalProgress({ kind: "file", story_slug, item_slug: format, progress, position });
  if (progress >= 0.995) {
    trackCompletionOnce(story_slug, format, format);
    markStoryFinishedIfComplete(story_slug, true);
  }
  window.dispatchEvent(new Event(PENDING_PROGRESS_EVENT));
}

export function queueAudioProgress(
  story_slug: string,
  audio_slug: string,
  progress: number,
  position_seconds: number,
  duration_seconds: number
): Promise<void> {
  return queuePendingSave({
    key: `${getOfflineOwnerId()}:audio:${story_slug}:${audio_slug}`,
    owner_id: getOfflineOwnerId(),
    kind: "audio",
    story_slug,
    audio_slug,
    progress,
    position_seconds,
    duration_seconds,
    queued_at: new Date().toISOString(),
  }).then(() => window.dispatchEvent(new Event(PENDING_PROGRESS_EVENT)));
}

export function queueFileProgress(
  story_slug: string,
  format: "epub" | "pdf",
  progress: number,
  position: string
): Promise<void> {
  return queuePendingSave({
    key: `${getOfflineOwnerId()}:file:${story_slug}:${format}`,
    owner_id: getOfflineOwnerId(),
    kind: "file",
    story_slug,
    format,
    progress,
    position,
    queued_at: new Date().toISOString(),
  }).then(() => window.dispatchEvent(new Event(PENDING_PROGRESS_EVENT)));
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

export async function adoptGuestProgress(): Promise<void> {
  await claimAnonymousDownloads();
  const records = await claimAnonymousLocalProgress();
  for (const record of records) {
    try {
      if (record.kind === "chapter") {
        const remote = await storyApi.getReadingProgress(record.story_slug).catch(() => null);
        const remoteProgress = remote?.chapter_progresses.find((item) => item.chapter_slug === record.item_slug)?.progress || 0;
        if (record.progress >= remoteProgress) {
          await storyApi.saveReadingProgress(record.story_slug, record.item_slug, record.progress, record.position);
        }
      } else if (record.kind === "audio") {
        const remote = await storyApi.getAudioProgress(record.story_slug).catch(() => null);
        const remoteProgress = remote?.audio_progresses.find((item) => item.audio_slug === record.item_slug)?.progress || 0;
        if (record.progress >= remoteProgress) {
          await storyApi.saveAudioProgress(
            record.story_slug,
            record.item_slug,
            record.progress,
            record.position_seconds || 0,
            record.duration_seconds || 0
          );
        }
      } else {
        const format = record.item_slug as "epub" | "pdf";
        const remote = await storyApi.getFileReadingProgress(record.story_slug, format).catch(() => null);
        if (record.progress >= (remote?.progress || 0)) {
          await storyApi.saveFileReadingProgress(record.story_slug, format, record.progress, record.position || "");
        }
      }
    } catch {
      if (record.kind === "chapter") {
        await queueChapterProgress(record.story_slug, record.item_slug, record.progress, record.position);
      } else if (record.kind === "audio") {
        await queueAudioProgress(record.story_slug, record.item_slug, record.progress, record.position_seconds || 0, record.duration_seconds || 0);
      } else {
        await queueFileProgress(record.story_slug, record.item_slug as "epub" | "pdf", record.progress, record.position || "");
      }
    }
  }
  window.dispatchEvent(new Event(PENDING_PROGRESS_EVENT));
}
