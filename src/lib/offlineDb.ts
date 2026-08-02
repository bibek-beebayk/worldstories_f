// Thin native IndexedDB wrapper for offline downloads. No external
// dependency — the surface here (two stores, get/put/delete/getAll) is small
// enough that pulling in a library like `idb` would be pure overhead.

const DB_NAME = "worldstories-offline";
import { getOfflineOwnerId } from "./offlineIdentity";

const DB_VERSION = 3;
const KEYS_STORE = "keys";
const DOWNLOADS_STORE = "downloads";
const PENDING_SAVES_STORE = "pending-saves";
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
