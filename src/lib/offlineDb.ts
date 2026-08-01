// Thin native IndexedDB wrapper for offline downloads. No external
// dependency — the surface here (two stores, get/put/delete/getAll) is small
// enough that pulling in a library like `idb` would be pure overhead.

const DB_NAME = "worldstories-offline";
const DB_VERSION = 1;
const KEYS_STORE = "keys";
const DOWNLOADS_STORE = "downloads";
const MASTER_KEY_ID = "master";

export type DownloadType = "chapter" | "audio" | "epub" | "pdf";

// epub/pdf are one-per-story, so they use a fixed item_slug rather than a
// real chapter/audio slug — keeps the id scheme uniform across all 4 types.
const FILE_ITEM_SLUG = "_file";

export interface DownloadRecord {
  id: string;
  story_slug: string;
  story_title: string;
  type: DownloadType;
  item_slug: string;
  title: string;
  size_bytes: number;
  downloaded_at: string;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  wrappedKey: ArrayBuffer;
  wrapIv: ArrayBuffer;
}

export function makeDownloadId(story_slug: string, type: DownloadType, item_slug?: string): string {
  return `${story_slug}:${type}:${item_slug || FILE_ITEM_SLUG}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        db.createObjectStore(KEYS_STORE);
      }
      if (!db.objectStoreNames.contains(DOWNLOADS_STORE)) {
        db.createObjectStore(DOWNLOADS_STORE, { keyPath: "id" });
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
  return withStore<DownloadRecord[]>(DOWNLOADS_STORE, "readonly", (store) => store.getAll());
}

export async function getTotalDownloadedBytes(): Promise<number> {
  const all = await listDownloads();
  return all.reduce((sum, record) => sum + record.size_bytes, 0);
}
