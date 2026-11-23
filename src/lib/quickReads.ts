import type { Genre } from "@/api/types";

export type QuickReadSort = "popular" | "recent" | "rating" | "summary_shortest" | "summary_longest" | "views";
export type QuickReadTime = "all" | "under3" | "mid" | "long";

export interface QuickReadFilters {
  q: string;
  genre: string;
  sort: QuickReadSort;
  time: QuickReadTime;
  unread: boolean;
  audio: boolean;
}

export const DEFAULT_QUICK_READ_FILTERS: QuickReadFilters = {
  q: "",
  genre: "all",
  sort: "popular",
  time: "all",
  unread: false,
  audio: false,
};

export const QUICK_READ_SORT_OPTIONS: ReadonlyArray<{ value: QuickReadSort; label: string }> = [
  { value: "popular", label: "Most popular" },
  { value: "recent", label: "Most recent" },
  { value: "rating", label: "Highest rated" },
  { value: "summary_shortest", label: "Shortest" },
  { value: "summary_longest", label: "Longest" },
  { value: "views", label: "Most viewed" },
];

export const QUICK_READ_TIME_OPTIONS: ReadonlyArray<{ value: QuickReadTime; label: string }> = [
  { value: "all", label: "Any" },
  { value: "under3", label: "Under 3 min" },
  { value: "mid", label: "3 to 5 min" },
  { value: "long", label: "5+ min" },
];

const VALID_SORTS = new Set<QuickReadSort>(QUICK_READ_SORT_OPTIONS.map((o) => o.value));
const VALID_TIMES = new Set<QuickReadTime>(QUICK_READ_TIME_OPTIONS.map((o) => o.value));

export function timeChipToSummaryLength(time: QuickReadTime): string {
  return VALID_TIMES.has(time) ? time : "all";
}

export function parseQuickReadParams(params: URLSearchParams): QuickReadFilters {
  const q = (params.get("q") ?? "").trim();
  const rawGenre = (params.get("genre") ?? "").trim();
  const genre = /^\d+$/.test(rawGenre) ? rawGenre : "all";
  const rawSort = (params.get("sort") ?? "").trim().toLowerCase() as QuickReadSort;
  const sort: QuickReadSort = VALID_SORTS.has(rawSort) ? rawSort : "popular";
  const rawTime = (params.get("time") ?? "").trim().toLowerCase() as QuickReadTime;
  const time: QuickReadTime = VALID_TIMES.has(rawTime) ? rawTime : "all";
  const rawUnread = (params.get("unread") ?? "").trim().toLowerCase();
  const unread = rawUnread === "1" || rawUnread === "true";
  const rawAudio = (params.get("audio") ?? "").trim().toLowerCase();
  const audio = rawAudio === "1" || rawAudio === "true";

  return { q, genre, sort, time, unread, audio };
}

export function buildQuickReadParams(filters: QuickReadFilters): URLSearchParams {
  const next = new URLSearchParams();
  const q = filters.q.trim();
  if (q) next.set("q", q);
  if (filters.genre && filters.genre !== "all") next.set("genre", filters.genre);
  if (filters.sort && filters.sort !== "popular") next.set("sort", filters.sort);
  if (filters.time && filters.time !== "all") next.set("time", filters.time);
  if (filters.unread) next.set("unread", "1");
  if (filters.audio) next.set("audio", "1");
  return next;
}

export function hasActiveQuickReadFilters(filters: QuickReadFilters): boolean {
  return Boolean(
    filters.q.trim() ||
    filters.genre !== "all" ||
    filters.sort !== "popular" ||
    filters.time !== "all" ||
    filters.unread ||
    filters.audio,
  );
}

export function findMysteryGenre(genres: Genre[]): Genre | undefined {
  const exact = genres.find((g) => g.slug.toLowerCase() === "mystery" || g.name.toLowerCase() === "mystery");
  if (exact) return exact;
  return genres.find((g) => /mystery|detective|crime/i.test(g.slug) || /mystery|detective|crime/i.test(g.name));
}
