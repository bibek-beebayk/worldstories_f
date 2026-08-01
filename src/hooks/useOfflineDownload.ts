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

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

async function storePlaintext(
  id: string,
  story_slug: string,
  story_title: string,
  type: DownloadType,
  item_slug: string,
  title: string,
  plaintext: ArrayBuffer
) {
  const encrypted = await encryptForStorage(plaintext);
  await saveDownload({
    id,
    story_slug,
    story_title,
    type,
    item_slug,
    title,
    size_bytes: plaintext.byteLength,
    downloaded_at: new Date().toISOString(),
    ...encrypted,
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
    }
  }, []);

  const downloadChapter = useCallback(
    (story_slug: string, story_title: string, chapter_slug: string, title: string) => {
      const id = makeDownloadId(story_slug, "chapter", chapter_slug);
      return withPending(id, async () => {
        const chapter = await storyApi.getChapter(story_slug, chapter_slug, "text");
        const plaintext = textEncoder.encode(JSON.stringify(chapter)).buffer;
        await storePlaintext(id, story_slug, story_title, "chapter", chapter_slug, title, plaintext);
      });
    },
    [withPending]
  );

  const downloadAudio = useCallback(
    (story_slug: string, story_title: string, audio_slug: string, title: string) => {
      const id = makeDownloadId(story_slug, "audio", audio_slug);
      return withPending(id, async () => {
        const plaintext = await fetchAuthenticatedBinary(`/stories/${story_slug}/audios/${audio_slug}/stream/`);
        await storePlaintext(id, story_slug, story_title, "audio", audio_slug, title, plaintext);
      });
    },
    [withPending]
  );

  const downloadFile = useCallback(
    (story_slug: string, story_title: string, type: "epub" | "pdf", title: string) => {
      const id = makeDownloadId(story_slug, type);
      return withPending(id, async () => {
        const plaintext = await fetchAuthenticatedBinary(`/stories/${story_slug}/${type}-stream/`);
        await storePlaintext(id, story_slug, story_title, type, "", title, plaintext);
      });
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
  };
}
