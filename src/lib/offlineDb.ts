// Thin native IndexedDB wrapper for offline-resilience infrastructure: a
// queue for progress saves that failed while offline, and a local cache of
// reading/listening/file progress. No external dependency — the surface
// here (a handful of stores and basic operations) is small enough that
// pulling in a library like `idb` would be pure overhead.
//
// This used to also back "download a story for offline reading" (encrypted
// chapter/audio/epub/pdf blobs, offline Read Along transcripts) — that
// feature has moved to the mobile app, so those stores/exports were removed
// here. The backend API they used is untouched.

const DB_NAME = "worldstories-offline";
import { getOfflineOwnerId } from "./offlineIdentity";

const DB_VERSION = 5;
const PENDING_SAVES_STORE = "pending-saves";
const PROGRESS_STORE = "progress";

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
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PENDING_SAVES_STORE)) {
        db.createObjectStore(PENDING_SAVES_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      // Let a future schema upgrade proceed cleanly when another tab/PWA
      // window still holds one of this version's connections.
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Offline storage upgrade is blocked. Close other WorldStories tabs and try again."));
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
  // Keep a synchronous snapshot as well as the durable IndexedDB record, in
  // case something reads it back before an asynchronous IDB transaction
  // completes.
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
