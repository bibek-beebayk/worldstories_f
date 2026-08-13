// Thin native IndexedDB wrapper for offline downloads. No external
// dependency — the surface here (two stores, get/put/delete/getAll) is small
// enough that pulling in a library like `idb` would be pure overhead.

const DB_NAME = "worldstories-offline";
import { getOfflineOwnerId } from "./offlineIdentity";

const DB_VERSION = 4;
const KEYS_STORE = "keys";
const DOWNLOADS_STORE = "downloads";
const PENDING_SAVES_STORE = "pending-saves";
const PROGRESS_STORE = "progress";
const MASTER_KEY_ID = "master";

export type DownloadType = "chapter" | "audio" | "epub" | "pdf";

// epub/pdf are one-per-story, so they use a fixed item_slug rather than a
// real chapter/audio slug — keeps the id scheme uniform across all 4 types.
const FILE_ITEM_SLUG = "_file";

export interface DownloadRecord {
  id: string;
  owner_id: string;
  story_slug: string;
  story_title: string;
  story_cover_image: string;
  story_author?: string;
  story_genres?: string[];
  story_type?: string;
  type: DownloadType;
  item_slug: string;
  title: string;
  order: number;
  size_bytes: number;
  downloaded_at: string;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  wrappedKey: ArrayBuffer;
  wrapIv: ArrayBuffer;
}

export function makeDownloadId(story_slug: string, type: DownloadType, item_slug?: string): string {
  return `${getOfflineOwnerId()}:${story_slug}:${type}:${item_slug || FILE_ITEM_SLUG}`;
}

// A progress save that failed (almost always because the device was offline)
// and needs to be retried once connectivity comes back. Keyed by `key` — a
// new failed save for the same chapter/audio/file overwrites the previous
// queued one via put(), since only the latest progress value matters, not a
// full history of every failed attempt.
export type PendingSave =
  | {
      key: string;
      owner_id: string;
      kind: "chapter";
      story_slug: string;
      chapter_slug: string;
      progress: number;
      last_element_id?: string;
      queued_at: string;
    }
  | {
      key: string;
      owner_id: string;
      kind: "audio";
      story_slug: string;
      audio_slug: string;
      progress: number;
      position_seconds: number;
      duration_seconds: number;
      queued_at: string;
    }
  | {
      key: string;
      owner_id: string;
      kind: "file";
      story_slug: string;
      format: "epub" | "pdf";
      progress: number;
      position: string;
      queued_at: string;
    };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        db.createObjectStore(KEYS_STORE);
      }
      if (!db.objectStoreNames.contains(DOWNLOADS_STORE)) {
        db.createObjectStore(DOWNLOADS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PENDING_SAVES_STORE)) {
        db.createObjectStore(PENDING_SAVES_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: "key" });
      }
      // Records written before v3 were not associated with an account. They
      // cannot be assigned safely, so remove them during the upgrade.
      if ((event as IDBVersionChangeEvent).oldVersion < 3) {
        for (const storeName of [DOWNLOADS_STORE, PENDING_SAVES_STORE]) {
          const store = request.transaction?.objectStore(storeName);
          if (!store) continue;
          const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (!cursor) return;
            if (!cursor.value?.owner_id) cursor.delete();
            cursor.continue();
          };
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getMasterKeyRecord(): Promise<CryptoKey | undefined> {
  return withStore<CryptoKey | undefined>(KEYS_STORE, "readonly", (store) => store.get(MASTER_KEY_ID));
}

export async function saveMasterKeyRecord(key: CryptoKey): Promise<void> {
  await withStore<IDBValidKey>(KEYS_STORE, "readwrite", (store) => store.put(key, MASTER_KEY_ID));
}

export async function saveDownload(record: DownloadRecord): Promise<void> {
  await withStore<IDBValidKey>(DOWNLOADS_STORE, "readwrite", (store) => store.put(record));
}

export async function getDownload(id: string): Promise<DownloadRecord | undefined> {
  return withStore<DownloadRecord | undefined>(DOWNLOADS_STORE, "readonly", (store) => store.get(id));
}

export async function deleteDownload(id: string): Promise<void> {
  await withStore<undefined>(DOWNLOADS_STORE, "readwrite", (store) => store.delete(id));
}

export async function deleteDownloadsForStory(storySlug: string): Promise<void> {
  const db = await openDb();
  const ownerId = getOfflineOwnerId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOWNLOADS_STORE, "readwrite");
    const store = tx.objectStore(DOWNLOADS_STORE);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const record = cursor.value as DownloadRecord;
      if (record.owner_id === ownerId && record.story_slug === storySlug) {
        cursor.delete();
      }
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not delete the downloaded title."));
    tx.onabort = () => reject(tx.error || new Error("Could not delete the downloaded title."));
  });
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  const ownerId = getOfflineOwnerId();
  const records = await withStore<DownloadRecord[]>(DOWNLOADS_STORE, "readonly", (store) => store.getAll());
  return records.filter((record) => record.owner_id === ownerId);
}

export async function getTotalDownloadedBytes(): Promise<number> {
  const all = await listDownloads();
  return all.reduce((sum, record) => sum + record.size_bytes, 0);
}

export interface DownloadStorySummary {
  story_slug: string;
  story_title: string;
  story_cover_image: string;
  story_author?: string;
  chapterCount: number;
  audioCount: number;
  fileType: "epub" | "pdf" | null;
  totalBytes: number;
}

export function groupDownloadsByStory(records: DownloadRecord[]): DownloadStorySummary[] {
  const summaries = new Map<string, DownloadStorySummary>();
  for (const record of records) {
    let summary = summaries.get(record.story_slug);
    if (!summary) {
      summary = {
        story_slug: record.story_slug,
        story_title: record.story_title,
        story_cover_image: record.story_cover_image,
        story_author: record.story_author,
        chapterCount: 0,
        audioCount: 0,
        fileType: null,
        totalBytes: 0,
      };
      summaries.set(record.story_slug, summary);
    }
    summary.totalBytes += record.size_bytes;
    if (record.type === "chapter") summary.chapterCount += 1;
    else if (record.type === "audio") summary.audioCount += 1;
    else summary.fileType = record.type;
  }
  return Array.from(summaries.values());
}

export async function queuePendingSave(save: PendingSave): Promise<void> {
  await withStore<IDBValidKey>(PENDING_SAVES_STORE, "readwrite", (store) => store.put(save));
}

export async function listPendingSaves(): Promise<PendingSave[]> {
  const ownerId = getOfflineOwnerId();
  const records = await withStore<PendingSave[]>(PENDING_SAVES_STORE, "readonly", (store) => store.getAll());
  return records.filter((record) => record.owner_id === ownerId);
}

export async function deletePendingSave(key: string): Promise<void> {
  await withStore<undefined>(PENDING_SAVES_STORE, "readwrite", (store) => store.delete(key));
}

export interface LocalProgressRecord {
  key: string;
  owner_id: string;
  kind: "chapter" | "audio" | "file";
  story_slug: string;
  item_slug: string;
  progress: number;
  position?: string;
  position_seconds?: number;
  duration_seconds?: number;
  updated_at: string;
}

export async function saveLocalProgress(
  record: Omit<LocalProgressRecord, "key" | "owner_id" | "updated_at">
): Promise<void> {
  const ownerId = getOfflineOwnerId();
  const savedRecord: LocalProgressRecord = {
    ...record,
    key: `${ownerId}:${record.kind}:${record.story_slug}:${record.item_slug}`,
    owner_id: ownerId,
    updated_at: new Date().toISOString(),
  };
  // Keep a synchronous snapshot as well as the durable IndexedDB record.
  // Route navigation can mount the Downloads page before an asynchronous IDB
  // transaction completes; this snapshot prevents a brief/stuck 0% display.
  try {
    localStorage.setItem(`worldstories-progress:${savedRecord.key}`, JSON.stringify(savedRecord));
  } catch {
    // IndexedDB below remains the durable fallback when localStorage is unavailable.
  }
  await withStore<IDBValidKey>(PROGRESS_STORE, "readwrite", (store) =>
    store.put(savedRecord)
  );
}

export async function listLocalProgress(storySlug?: string): Promise<LocalProgressRecord[]> {
  const ownerId = getOfflineOwnerId();
  const records = await withStore<LocalProgressRecord[]>(PROGRESS_STORE, "readonly", (store) => store.getAll());
  const matching = records.filter(
    (record) => record.owner_id === ownerId && (!storySlug || record.story_slug === storySlug)
  );
  const byKey = new Map(matching.map((record) => [record.key, record]));
  const prefix = `worldstories-progress:${ownerId}:`;
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const storageKey = localStorage.key(index);
      if (!storageKey?.startsWith(prefix)) continue;
      const snapshot = JSON.parse(localStorage.getItem(storageKey) || "null") as LocalProgressRecord | null;
      if (!snapshot || (storySlug && snapshot.story_slug !== storySlug)) continue;
      const existing = byKey.get(snapshot.key);
      if (!existing || snapshot.updated_at >= existing.updated_at) byKey.set(snapshot.key, snapshot);
    }
  } catch {
    // Return IndexedDB records if a malformed/unavailable local snapshot cannot be read.
  }
  return Array.from(byKey.values());
}

export async function claimAnonymousLocalProgress(): Promise<LocalProgressRecord[]> {
  const currentOwner = getOfflineOwnerId();
  if (currentOwner === "anonymous") return [];
  const records = await withStore<LocalProgressRecord[]>(PROGRESS_STORE, "readonly", (store) => store.getAll());
  const accountRecords = new Map(
    records.filter((record) => record.owner_id === currentOwner).map((record) => [
      `${record.kind}:${record.story_slug}:${record.item_slug}`,
      record,
    ])
  );
  const claimed: LocalProgressRecord[] = [];
  for (const guest of records.filter((record) => record.owner_id === "anonymous")) {
    const identity = `${guest.kind}:${guest.story_slug}:${guest.item_slug}`;
    const existing = accountRecords.get(identity);
    if (existing && existing.updated_at >= guest.updated_at) continue;
    await saveLocalProgress({
      kind: guest.kind,
      story_slug: guest.story_slug,
      item_slug: guest.item_slug,
      progress: guest.progress,
      position: guest.position,
      position_seconds: guest.position_seconds,
      duration_seconds: guest.duration_seconds,
    });
    claimed.push(guest);
  }
  return claimed;
}

export async function claimAnonymousDownloads(): Promise<void> {
  const currentOwner = getOfflineOwnerId();
  if (currentOwner === "anonymous") return;
  const records = await withStore<DownloadRecord[]>(DOWNLOADS_STORE, "readonly", (store) => store.getAll());
  for (const record of records.filter((item) => item.owner_id === "anonymous")) {
    const id = makeDownloadId(record.story_slug, record.type, record.item_slug);
    const existing = records.find((item) => item.id === id);
    if (!existing) await saveDownload({ ...record, id, owner_id: currentOwner });
  }
}
