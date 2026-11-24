import type { AudiobookContinueItem, ContinueListeningItem } from "@/api/types";

export type AudiobookSort = "popular" | "recent" | "rating" | "audio_shortest" | "audio_longest";
export type AudiobookLength = "all" | "short" | "medium" | "long" | "epic";

export interface AudiobookFilters {
  q: string;
  genre: string;
  language: string;
  series: string;
  sort: AudiobookSort;
  length: AudiobookLength;
  readalong: boolean;
}

export const DEFAULT_AUDIOBOOK_FILTERS: AudiobookFilters = {
  q: "",
  genre: "all",
  language: "all",
  series: "",
  sort: "popular",
  length: "all",
  readalong: false,
};

export const AUDIOBOOK_SORT_OPTIONS: ReadonlyArray<{ value: AudiobookSort; label: string }> = [
  { value: "popular", label: "Popular" },
  { value: "recent", label: "Recently added" },
  { value: "rating", label: "Top rated" },
  { value: "audio_shortest", label: "Shortest" },
  { value: "audio_longest", label: "Longest" },
];

export const AUDIOBOOK_LENGTH_OPTIONS: ReadonlyArray<{ value: AudiobookLength; label: string }> = [
  { value: "all", label: "Any" },
  { value: "short", label: "Under 30 min" },
  { value: "medium", label: "30 min to 2 hr" },
  { value: "long", label: "2 to 5 hr" },
  { value: "epic", label: "5 hr+" },
];

const VALID_SORTS = new Set<AudiobookSort>(AUDIOBOOK_SORT_OPTIONS.map((o) => o.value));
const VALID_LENGTHS = new Set<AudiobookLength>(AUDIOBOOK_LENGTH_OPTIONS.map((o) => o.value));

/**
 * Format total audio minutes for the duration pill:
 * - null / 0 / invalid -> null (hide pill)
 * - under 60 -> "42 min"
 * - exact hours -> "1 hr"
 * - hours + minutes -> "3 hr 20 min"
 */
export function formatAudioDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }
  const total = Math.round(minutes);
  if (total < 60) {
    return `${total} min`;
  }
  const hours = Math.floor(total / 60);
  const rem = total % 60;
  if (rem === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${rem} min`;
}

export function parseAudiobookParams(params: URLSearchParams): AudiobookFilters {
  const q = (params.get("q") ?? "").trim();
  const rawGenre = (params.get("genre") ?? "").trim();
  const genre = /^\d+$/.test(rawGenre) ? rawGenre : "all";
  const rawLanguage = (params.get("language") ?? "").trim().toLowerCase();
  const language = rawLanguage && rawLanguage !== "all" ? rawLanguage : "all";
  const series = (params.get("series") ?? "").trim();
  const rawSort = (params.get("sort") ?? "").trim().toLowerCase() as AudiobookSort;
  const sort: AudiobookSort = VALID_SORTS.has(rawSort) ? rawSort : "popular";
  const rawLength = (params.get("length") ?? "").trim().toLowerCase() as AudiobookLength;
  const length: AudiobookLength = VALID_LENGTHS.has(rawLength) ? rawLength : "all";
  const rawReadalong = (params.get("readalong") ?? "").trim().toLowerCase();
  const readalong = rawReadalong === "1" || rawReadalong === "true";

  return { q, genre, language, series, sort, length, readalong };
}

export function buildAudiobookParams(filters: AudiobookFilters): URLSearchParams {
  const next = new URLSearchParams();
  const q = filters.q.trim();
  if (q) next.set("q", q);
  if (filters.genre && filters.genre !== "all") next.set("genre", filters.genre);
  if (filters.language && filters.language !== "all") next.set("language", filters.language);
  if (filters.series && filters.series.trim()) next.set("series", filters.series.trim());
  if (filters.sort && filters.sort !== "popular") next.set("sort", filters.sort);
  if (filters.length && filters.length !== "all") next.set("length", filters.length);
  if (filters.readalong) next.set("readalong", "1");
  return next;
}

export function hasActiveAudiobookFilters(filters: AudiobookFilters): boolean {
  return Boolean(
    filters.q.trim() ||
      filters.genre !== "all" ||
      filters.language !== "all" ||
      filters.series.trim() ||
      filters.length !== "all" ||
      filters.readalong,
  );
}

/** Map frontend URL sort param to `/api/audiobooks/?sort=` param. */
export function mapAudiobookApiSort(sort: AudiobookSort): string {
  switch (sort) {
    case "recent":
      return "newest";
    case "audio_shortest":
      return "shortest";
    case "audio_longest":
      return "longest";
    case "rating":
      return "popular";
    case "popular":
    default:
      return "popular";
  }
}

/**
 * Build a Map<audiobookSlug, percent (0..100)> from overview continue_listening items.
 */
export function buildAudiobookContinueMap(items?: AudiobookContinueItem[]): Map<string, number> {
  const map = new Map<string, number>();
  if (!items) return map;
  for (const item of items) {
    const slug = item.audiobook?.slug;
    if (!slug) continue;
    if (typeof item.progress_percent === "number" && item.progress_percent > 0) {
      map.set(slug, Math.max(1, Math.min(100, Math.round(item.progress_percent))));
    }
  }
  return map;
}

/**
 * Build a Map<storySlug, percent (0..100)> from ContinueListeningItem results.
 */
export function buildContinueListeningMap(items?: ContinueListeningItem[]): Map<string, number> {
  const map = new Map<string, number>();
  if (!items) return map;
  for (const item of items) {
    const slug = item.story?.slug;
    if (!slug) continue;
    const raw = item.overall_progress > 0 ? item.overall_progress : item.audio_progress;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      const percent = Math.max(1, Math.min(100, Math.round(raw * 100)));
      map.set(slug, percent);
    }
  }
  return map;
}
