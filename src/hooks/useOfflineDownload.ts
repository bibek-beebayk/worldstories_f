import { useCallback, useEffect, useState } from "react";
import { fetchAuthenticatedBinary } from "@/api/client";
import { storyApi } from "@/api/story";
import { Chapter } from "@/api/types";
import { decryptFromStorage, encryptForStorage } from "@/lib/offlineCrypto";
import {
  DownloadType,
  deleteDownload,
  getDownload,
  listDownloads,
  makeDownloadId,
  saveDownload,
} from "@/lib/offlineDb";
import { getOfflineOwnerId } from "@/lib/offlineIdentity";
import { preloadOfflineReader } from "@/lib/preloadOfflineReader";
import { toast } from "@/components/ui/sonner";
import { trackAnalyticsEvent } from "@/lib/analytics";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
export const MAX_DOWNLOADED_TITLES = 3;
const titleReservations = new Map<string, number>();

async function reserveDownloadTitle(storySlug: string): Promise<boolean> {
  const downloads = await listDownloads();
  const titleSlugs = new Set(downloads.map((record) => record.story_slug));
  titleReservations.forEach((_count, slug) => titleSlugs.add(slug));
  if (!titleSlugs.has(storySlug) && titleSlugs.size >= MAX_DOWNLOADED_TITLES) {
    toast.error(`You can save up to ${MAX_DOWNLOADED_TITLES} titles at a time. Remove a downloaded title to add another.`);
    return false;
  }
  titleReservations.set(storySlug, (titleReservations.get(storySlug) || 0) + 1);
  return true;
}

function releaseDownloadTitle(storySlug: string) {
  const remaining = (titleReservations.get(storySlug) || 1) - 1;
  if (remaining <= 0) titleReservations.delete(storySlug);
  else titleReservations.set(storySlug, remaining);
}

export interface DownloadableStory {
  slug: string;
  title: string;
  cover_image: string;
  author?: string;
  genres?: string[];
  story_type?: string;
}

async function storePlaintext(
  id: string,
  story: DownloadableStory,
  type: DownloadType,
  item_slug: string,
  title: string,
  order: number,
  plaintext: ArrayBuffer
) {
  const encrypted = await encryptForStorage(plaintext);
  await saveDownload({
    id,
    owner_id: getOfflineOwnerId(),
    story_slug: story.slug,
    story_title: story.title,
    story_cover_image: story.cover_image,
    story_author: story.author,
    story_genres: story.genres,
    story_type: story.story_type,
    type,
    item_slug,
    title,
    order,
    size_bytes: plaintext.byteLength,
    downloaded_at: new Date().toISOString(),
    ...encrypted,
  });
  trackAnalyticsEvent({
    event_type: "download",
    story_slug: story.slug,
    value: plaintext.byteLength,
    metadata: { content_type: type, item_slug },
  });
}

// Business-logic layer for downloading/reading back encrypted offline
// content — kept separate from the useOfflineDownload hook below so reader
// pages can call getDecrypted*() directly without needing the hook's
// per-item pending-state bookkeeping (which only download-button UI needs).

export async function getDecryptedChapter(story_slug: string, chapter_slug: string): Promise<Chapter | null> {
  const record = await getDownload(makeDownloadId(story_slug, "chapter", chapter_slug));
  if (!record) return null;
  const plaintext = await decryptFromStorage(record);
  return JSON.parse(textDecoder.decode(plaintext)) as Chapter;
}

export async function getDecryptedBinary(id: string): Promise<ArrayBuffer | null> {
  const record = await getDownload(id);
  if (!record) return null;
  return decryptFromStorage(record);
}

export function isDownloaded(story_slug: string, type: DownloadType, item_slug?: string): Promise<boolean> {
  return getDownload(makeDownloadId(story_slug, type, item_slug)).then((record) => Boolean(record));
}

// Loads once and lets download-status checks for a story's chapters/audios
// be cheap Set lookups instead of each row doing its own IndexedDB query.
export function useDownloadedIds(story_slug: string) {
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    listDownloads().then((all) => {
      setDownloadedIds(new Set(all.filter((record) => record.story_slug === story_slug).map((record) => record.id)));
    });
  }, [story_slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { downloadedIds, refresh };
}

export function useOfflineDownload() {
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  // Only set for downloads that stream (audio/epub/pdf) — chapters are tiny
  // JSON payloads fetched via apiClient (not a raw stream), so there's no
  // byte-level progress to report for them; they just show a spinner.
  const [progressById, setProgressById] = useState<Record<string, number>>({});

  const withPending = useCallback(async (id: string, run: () => Promise<void>) => {
    setPendingIds((prev) => ({ ...prev, [id]: true }));
    try {
      await run();
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setProgressById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, []);

  const downloadChapter = useCallback(
    async (story: DownloadableStory, chapter_slug: string, title: string, order: number) => {
      if (!(await reserveDownloadTitle(story.slug))) return false;
      const id = makeDownloadId(story.slug, "chapter", chapter_slug);
      try {
        await withPending(id, async () => {
          const chapter = await storyApi.getChapter(story.slug, chapter_slug, "text");
          const plaintext = textEncoder.encode(JSON.stringify(chapter)).buffer;
          await storePlaintext(id, story, "chapter", chapter_slug, title, order, plaintext);
        });
        return true;
      } finally {
        releaseDownloadTitle(story.slug);
      }
    },
    [withPending]
  );

  const downloadAudio = useCallback(
    async (story: DownloadableStory, audio_slug: string, title: string, order: number) => {
      if (!(await reserveDownloadTitle(story.slug))) return false;
      const id = makeDownloadId(story.slug, "audio", audio_slug);
      // Set before the fetch starts, not just on the first chunk — opening
      // the connection to R2 alone can take over a second with nothing to
      // show for it otherwise, and the file itself often arrives in only a
      // couple of chunks milliseconds apart, so waiting for real data before
      // showing anything means most downloads never visibly show a percentage
      // at all.
      setProgressById((prev) => ({ ...prev, [id]: 0 }));
      try {
        await withPending(id, async () => {
          const plaintext = await fetchAuthenticatedBinary(
            `/stories/${story.slug}/audios/${audio_slug}/stream/`,
            (fraction) => setProgressById((prev) => ({ ...prev, [id]: fraction }))
          );
          await storePlaintext(id, story, "audio", audio_slug, title, order, plaintext);
        });
        return true;
      } finally {
        releaseDownloadTitle(story.slug);
      }
    },
    [withPending]
  );

  const downloadFile = useCallback(
    async (story: DownloadableStory, type: "epub" | "pdf", title: string) => {
      if (!(await reserveDownloadTitle(story.slug))) return false;
      const id = makeDownloadId(story.slug, type);
      setProgressById((prev) => ({ ...prev, [id]: 0 }));
      try {
        await withPending(id, async () => {
          const plaintext = await fetchAuthenticatedBinary(
            `/stories/${story.slug}/${type}-stream/`,
            (fraction) => setProgressById((prev) => ({ ...prev, [id]: fraction }))
          );
          await storePlaintext(id, story, type, "", title, 0, plaintext);
          await preloadOfflineReader(type).catch(() => undefined);
        });
        return true;
      } finally {
        releaseDownloadTitle(story.slug);
      }
    },
    [withPending]
  );

  const removeDownloadItem = useCallback((id: string) => deleteDownload(id), []);

  return {
    downloadChapter,
    downloadAudio,
    downloadFile,
    removeDownloadItem,
    isPending: (id: string) => Boolean(pendingIds[id]),
    getProgress: (id: string): number | null => (id in progressById ? progressById[id] : null),
  };
}
