import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  deleteDownload,
  deleteDownloadsForStory,
  getDownload,
  getOfflineTranscript,
  makeDownloadId,
  saveDownload,
  saveOfflineTranscript,
  type DownloadRecord,
} from "@/lib/offlineDb";
import { getOfflineReadAlong, storeOfflineReadAlong } from "@/lib/offlineReadAlong";

const DB_NAME = "worldstories-offline";

const legacyDownload = (slug: string, order: number): DownloadRecord => ({
  id: `anonymous:test-story:audio:${slug}`,
  owner_id: "anonymous",
  story_slug: "test-story",
  story_title: "Test Story",
  story_cover_image: "",
  story_author: "Test Author",
  story_type: "Novel",
  type: "audio",
  item_slug: slug,
  title: `Track ${order}`,
  order,
  size_bytes: 100 * order,
  downloaded_at: "2026-08-31T00:00:00.000Z",
  ciphertext: new ArrayBuffer(1),
  iv: new ArrayBuffer(1),
  wrappedKey: new ArrayBuffer(1),
  wrapIv: new ArrayBuffer(1),
});

function createVersionFourDatabase(record: DownloadRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 4);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("keys");
      db.createObjectStore("downloads", { keyPath: "id" });
      db.createObjectStore("pending-saves", { keyPath: "key" });
      db.createObjectStore("progress", { keyPath: "key" });
      request.transaction?.objectStore("downloads").put(record);
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

const saveTranscript = (audioSlug: string, order: number) =>
  saveOfflineTranscript({
    story_slug: "test-story",
    audio_slug: audioSlug,
    story: {
      id: 1,
      title: "Test Story",
      slug: "test-story",
      language: "en",
      story_type: "Novel",
      cover_image: null,
      author: { id: 1, name: "Test Author" },
    },
    audio: {
      id: order,
      title: `Track ${order}`,
      slug: audioSlug,
      order,
      duration_seconds: 10,
      download_size_bytes: 100 * order,
    },
    transcript_html: `<p>Transcript ${order}</p>`,
    synchronized: false,
    cues: [],
  });

describe("offline Read Along IndexedDB migration", () => {
  it("preserves v4 downloads, creates transcript storage, builds navigation, and cleans up", async () => {
    const first = legacyDownload("track-1", 1);
    await createVersionFourDatabase(first);

    // The first v5 operation upgrades the database. The existing encrypted
    // audio remains readable and the new store accepts transcript records.
    expect((await getDownload(first.id))?.title).toBe("Track 1");
    await saveTranscript("track-1", 1);

    const second = legacyDownload("track-2", 2);
    await saveDownload(second);
    await saveTranscript("track-2", 2);

    const third = legacyDownload("track-3", 3);
    await saveDownload(third);
    await storeOfflineReadAlong({
      story: {
        id: 1, title: "Test Story", slug: "test-story", language: "en",
        story_type: "Novel", cover_image: null, author: null,
      },
      audio: {
        id: 3, title: "Track 3", slug: "track-3", order: 3,
        audio_file: "https://example.test/track.mp3", stream_url: "https://example.test/stream",
        duration_seconds: 10, download_size_bytes: 300, has_transcript: true,
        read_along_available: true, transcript_synchronized: false,
      },
      transcript: {
        html: "<script>alert('no')</script><p>Safe transcript</p>",
        state: "unsynchronized", synchronized: false, cues: [],
      },
      navigation: { previous_audio_slug: "track-2", next_audio_slug: null },
    });
    const sanitized = await getOfflineTranscript("test-story", "track-3");
    expect(sanitized?.transcript_html).toBe("<p>Safe transcript</p>");

    const payload = await getOfflineReadAlong("test-story", "track-1");
    expect(payload?.transcript.html).toBe("<p>Transcript 1</p>");
    expect(payload?.navigation).toEqual({
      previous_audio_slug: null,
      next_audio_slug: "track-2",
    });

    await deleteDownload(makeDownloadId("test-story", "audio", "track-1"));
    expect(await getOfflineTranscript("test-story", "track-1")).toBeUndefined();
    expect(await getOfflineReadAlong("test-story", "track-1")).toBeNull();

    await deleteDownloadsForStory("test-story");
    expect(await getDownload(second.id)).toBeUndefined();
    expect(await getOfflineTranscript("test-story", "track-2")).toBeUndefined();
  });
});
