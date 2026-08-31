const OFFLINE_READER_PAGES_CACHE = "offline-reader-pages-v1";

export async function preloadOfflineReadAlong(
  storySlug: string,
  audioSlug: string
): Promise<void> {
  const path = `/read-along/${encodeURIComponent(storySlug)}/${encodeURIComponent(audioSlug)}`;
  const tasks: Promise<unknown>[] = [import("@/pages/ReadAlongReader")];

  if (typeof window !== "undefined" && "caches" in window && navigator.onLine) {
    tasks.push(
      fetch(path, { headers: { Accept: "text/html" } }).then(async (response) => {
        if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return;
        const cache = await caches.open(OFFLINE_READER_PAGES_CACHE);
        await cache.put(path, response);
      })
    );
  }

  await Promise.all(tasks);
}

export async function removeOfflineReadAlongPage(
  storySlug: string,
  audioSlug: string
): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const cache = await caches.open(OFFLINE_READER_PAGES_CACHE);
  await cache.delete(`/read-along/${encodeURIComponent(storySlug)}/${encodeURIComponent(audioSlug)}`);
}

export async function removeOfflineReadAlongPagesForStory(storySlug: string): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const cache = await caches.open(OFFLINE_READER_PAGES_CACHE);
  const prefix = `/read-along/${encodeURIComponent(storySlug)}/`;
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((request) => new URL(request.url).pathname.startsWith(prefix))
      .map((request) => cache.delete(request))
  );
}
