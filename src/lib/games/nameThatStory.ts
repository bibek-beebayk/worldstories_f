import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

export type ShareToken = "wrong" | "right" | "empty";
export type EraMatch = "same" | "close" | "different";
export type PuzzleStatus = "in_progress" | "solved" | "failed";
export type PuzzleDifficulty = "easy" | "medium" | "hard" | "";

export interface PuzzleClue {
  key: "genre" | "country" | "era" | "length" | "author_initials" | "cover";
  label: string;
  value: string;
}

export interface PuzzleGuessEntry {
  key?: string | null;
  story_id: number | null;
  book_id?: number | null;
  title: string | null;
  author: string;
  correct: boolean;
  matches: {
    genre: boolean;
    country: boolean;
    era: EraMatch;
  };
  skipped: boolean;
}

export interface PuzzleAnswerCard {
  key?: string;
  id: number;
  title: string;
  slug: string | null;
  author: string;
  year: number | null;
  cover: string;
  read_time: number | null;
  has_audiobook: boolean;
  audiobook_slug: string | null;
}

export interface YesterdayAnswerCard extends PuzzleAnswerCard {
  puzzle_number: number;
  date: string;
}

export interface PuzzleSharePayload {
  header: string;
  tokens: ShareToken[];
}

export interface PuzzlePayload {
  puzzle_number: number;
  date: string;
  opening_line: string;
  clues: PuzzleClue[];
  guesses_used: number;
  guesses: PuzzleGuessEntry[];
  status: PuzzleStatus;
  max_guesses: number;
  newly_unlocked_clue?: PuzzleClue | null;
  answer?: PuzzleAnswerCard;
  share?: PuzzleSharePayload;
  yesterday?: YesterdayAnswerCard | null;
}

export interface PuzzleSearchItem {
  key: string;
  title: string;
  author: string;
  cover_thumb: string;
}

export function parseGuessKey(key: string): { story_id: number } | { book_id: number } | null {
  if (key.startsWith("story:")) {
    const id = Number(key.slice(6));
    return Number.isInteger(id) && id > 0 ? { story_id: id } : null;
  }
  if (key.startsWith("book:")) {
    const id = Number(key.slice(5));
    return Number.isInteger(id) && id > 0 ? { book_id: id } : null;
  }
  return null;
}

export interface PuzzleStats {
  played: number;
  wins: number;
  win_percentage: number;
  current_streak: number;
  best_streak: number;
  guess_distribution: Record<string, number>;
  week_days: { date: string; label: string; solved: boolean }[];
}

export interface ArchivePuzzleItem {
  puzzle_number: number;
  date: string;
  status: "solved" | "failed" | "in_progress" | "none";
  guess_count: number | null;
}

export interface ArchiveResponse {
  results: ArchivePuzzleItem[];
  pagination: {
    page: number;
    pages: number;
    count: number;
    size: number;
  };
}

export interface AdminPuzzleAnswerSummary {
  key: string;
  title: string;
  author: string;
  in_catalogue: boolean;
}

export interface AdminPuzzleRow {
  id: number | null;
  date: string;
  number: number | null;
  opening_line: string;
  story: { id: number; title: string } | null;
  book?: { id: number; title: string } | null;
  answer?: AdminPuzzleAnswerSummary | null;
  difficulty: PuzzleDifficulty;
  auto_filled: boolean;
  status: "live_today" | "scheduled" | "auto" | "empty";
  players_count: number;
  solve_rate: number | null;
}

export type PuzzleBookLength = "Short story" | "Novella" | "Novel";

export interface AdminPuzzleBook {
  id: number;
  key: string;
  title: string;
  author_name: string;
  genres: { id: number; name: string }[];
  country: string;
  country_display: string;
  original_published_year: number | null;
  length_label: PuzzleBookLength;
  cover: string;
  cover_image: string;
  puzzle_count: number;
}

export interface AdminBookImportResult {
  created: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

export interface AdminPuzzleSummary {
  scheduled_ahead_days: number;
  empty_in_next_14: number;
  average_solve_rate: number;
  players_today: number;
}

export interface AdminCandidateLine {
  index: number;
  text: string;
  word_count: number;
}

export interface AdminCandidatesResponse {
  candidates: AdminCandidateLine[];
  clues_preview: PuzzleClue[];
}

// ---------------------------------------------------------------------------
// Guest Key Helpers (SSR-safe, try/catch around localStorage)
// ---------------------------------------------------------------------------

export const GUEST_KEY_STORAGE = "ws_nts_guest_key";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function peekGuestKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(GUEST_KEY_STORAGE);
    return existing && existing.trim() ? existing.trim() : null;
  } catch {
    return null;
  }
}

export function getOrCreateGuestKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(GUEST_KEY_STORAGE);
    if (existing && existing.trim()) return existing.trim();
    const fresh = generateUuid();
    window.localStorage.setItem(GUEST_KEY_STORAGE, fresh);
    return fresh;
  } catch {
    return generateUuid();
  }
}

export function clearGuestKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_KEY_STORAGE);
  } catch {
    // ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Pure Helpers: Share Text & UTC Midnight Countdown
// ---------------------------------------------------------------------------

const SHARE_CHAR: Record<ShareToken, string> = {
  right: "\u{1F7E9}",
  wrong: "\u{1F7E5}",
  empty: "\u2B1C",
};

export function buildShareText(
  puzzleNumber: number,
  status: "solved" | "failed",
  guessCount: number,
  tokens: ShareToken[],
  siteUrl = "https://worldstories.net",
): string {
  const score = status === "solved" ? String(guessCount) : "X";
  const grid = tokens
    .slice(0, 6)
    .map((t) => SHARE_CHAR[t] ?? SHARE_CHAR.empty)
    .join("");
  const base = siteUrl.replace(/\/+$/, "");
  return `Name That Story #${puzzleNumber} ${score}/6\n${grid}\n${base}/games/name-that-story`;
}

export function getUtcMidnightCountdown(now: Date = new Date()): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  formatted: string;
} {
  const nextMidnightMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  const totalSeconds = Math.max(0, Math.floor((nextMidnightMs - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

// ---------------------------------------------------------------------------
// API Client Functions
// ---------------------------------------------------------------------------

function guestHeaders(): Record<string, string> {
  const key = getOrCreateGuestKey();
  return key ? { "X-Guest-Key": key } : {};
}

export const gamesApi = {
  getTodayPuzzle: () =>
    apiClient<PuzzlePayload>("/games/name-that-story/today/", {
      headers: guestHeaders(),
    }),
  getPuzzleByDate: (puzzleDate: string) =>
    apiClient<PuzzlePayload>(`/games/name-that-story/puzzles/${encodeURIComponent(puzzleDate)}/`, {
      headers: guestHeaders(),
    }),
  searchStories: (q: string) =>
    apiClient<{ results: PuzzleSearchItem[] }>(`/games/name-that-story/search/?q=${encodeURIComponent(q)}`, {
      headers: guestHeaders(),
    }),
  submitGuess: (payload: { date?: string; story_id?: number; book_id?: number }) =>
    apiClient<PuzzlePayload>("/games/name-that-story/guess/", {
      method: "POST",
      headers: guestHeaders(),
      body: JSON.stringify(payload),
    }),
  skipGuess: (payload: { date?: string }) =>
    apiClient<PuzzlePayload>("/games/name-that-story/skip/", {
      method: "POST",
      headers: guestHeaders(),
      body: JSON.stringify(payload),
    }),
  getStats: () =>
    apiClient<PuzzleStats>("/games/name-that-story/stats/", {
      headers: guestHeaders(),
    }),
  getArchive: (page = 1) =>
    apiClient<ArchiveResponse>(`/games/name-that-story/archive/?page=${page}`, {
      headers: guestHeaders(),
    }),
  mergeGuest: (guestKey: string) =>
    apiClient<{ merged: number; skipped: number }>("/games/name-that-story/merge-guest/", {
      method: "POST",
      body: JSON.stringify({ guest_key: guestKey }),
    }),

  // Admin
  listAdminPuzzles: (params: { from?: string; to?: string; status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.status && params.status !== "all") qs.set("status", params.status);
    if (params.q && params.q.trim()) qs.set("q", params.q.trim());
    const query = qs.toString();
    return apiClient<{ results: AdminPuzzleRow[] }>(`/admin/games/name-that-story/puzzles/${query ? `?${query}` : ""}`);
  },
  createAdminPuzzle: (payload: {
    date: string;
    story_id?: number;
    book_id?: number;
    opening_line: string;
    difficulty?: PuzzleDifficulty;
    allow_custom?: boolean;
  }) =>
    apiClient<AdminPuzzleRow>("/admin/games/name-that-story/puzzles/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAdminPuzzle: (
    id: number,
    payload: Partial<{
      date: string;
      story_id: number | null;
      book_id: number | null;
      opening_line: string;
      difficulty: PuzzleDifficulty;
      allow_custom: boolean;
    }>,
  ) =>
    apiClient<AdminPuzzleRow>(`/admin/games/name-that-story/puzzles/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAdminPuzzle: (id: number) =>
    apiClient<void>(`/admin/games/name-that-story/puzzles/${id}/`, {
      method: "DELETE",
    }),
  getAdminCandidates: (target: { storyId?: number; bookId?: number }) => {
    const qs = target.bookId ? `book_id=${target.bookId}` : `story_id=${target.storyId ?? 0}`;
    return apiClient<AdminCandidatesResponse>(`/admin/games/name-that-story/candidates/?${qs}`);
  },
  listAdminBooks: (q?: string) =>
    apiClient<{ results: AdminPuzzleBook[] }>(
      `/admin/games/name-that-story/books/${q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`,
    ),
  createAdminBook: (payload: FormData | Record<string, unknown>) =>
    apiClient<AdminPuzzleBook>("/admin/games/name-that-story/books/", {
      method: "POST",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  updateAdminBook: (id: number, payload: FormData | Record<string, unknown>) =>
    apiClient<AdminPuzzleBook>(`/admin/games/name-that-story/books/${id}/`, {
      method: "PATCH",
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  deleteAdminBook: (id: number) =>
    apiClient<void>(`/admin/games/name-that-story/books/${id}/`, {
      method: "DELETE",
    }),
  importAdminBooksCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient<AdminBookImportResult>("/admin/games/name-that-story/books/import-csv/", {
      method: "POST",
      body: fd,
    });
  },
  autofillAdminPuzzles: (days = 14) =>
    apiClient<{ created: { id: number; date: string; story_title: string }[]; skipped: unknown[] }>(
      "/admin/games/name-that-story/autofill/",
      {
        method: "POST",
        body: JSON.stringify({ days }),
      },
    ),
  getAdminSummary: () => apiClient<AdminPuzzleSummary>("/admin/games/name-that-story/summary/"),
};

// ---------------------------------------------------------------------------
// React Query Hooks
// ---------------------------------------------------------------------------

export const gameKeys = {
  today: ["nts", "today"] as const,
  byDate: (d: string) => ["nts", "puzzle", d] as const,
  search: (q: string) => ["nts", "search", q] as const,
  stats: ["nts", "stats"] as const,
  archive: (page: number) => ["nts", "archive", page] as const,
  adminList: (params: Record<string, string | undefined>) => ["admin-nts", "list", params] as const,
  adminSummary: ["admin-nts", "summary"] as const,
  adminCandidates: (key: string) => ["admin-nts", "candidates", key] as const,
  adminBooks: (q: string) => ["admin-nts", "books", q] as const,
};

export function useTodayPuzzle(enabled = true) {
  return useQuery({
    queryKey: gameKeys.today,
    queryFn: gamesApi.getTodayPuzzle,
    enabled,
    retry: false,
  });
}

export function usePuzzle(dateStr?: string) {
  return useQuery({
    queryKey: dateStr ? gameKeys.byDate(dateStr) : gameKeys.today,
    queryFn: () => (dateStr ? gamesApi.getPuzzleByDate(dateStr) : gamesApi.getTodayPuzzle()),
    retry: false,
  });
}

export function useSearchStories(query: string) {
  const [debounced, setDebounced] = useState(query.trim());
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: gameKeys.search(debounced),
    queryFn: () => gamesApi.searchStories(debounced),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });
}

export function useGuess(dateStr?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => {
      const parsed = parseGuessKey(key);
      if (!parsed) throw new Error("Invalid story selection.");
      return gamesApi.submitGuess(dateStr ? { date: dateStr, ...parsed } : parsed);
    },
    onSuccess: (updated) => {
      qc.setQueryData(dateStr ? gameKeys.byDate(dateStr) : gameKeys.today, (prev: PuzzlePayload | undefined) => ({
        ...updated,
        yesterday: updated.yesterday ?? prev?.yesterday,
      }));
      qc.invalidateQueries({ queryKey: gameKeys.stats });
      qc.invalidateQueries({ queryKey: ["nts", "archive"] });
    },
  });
}

export function useSkip(dateStr?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gamesApi.skipGuess(dateStr ? { date: dateStr } : {}),
    onSuccess: (updated) => {
      qc.setQueryData(dateStr ? gameKeys.byDate(dateStr) : gameKeys.today, (prev: PuzzlePayload | undefined) => ({
        ...updated,
        yesterday: updated.yesterday ?? prev?.yesterday,
      }));
      qc.invalidateQueries({ queryKey: gameKeys.stats });
      qc.invalidateQueries({ queryKey: ["nts", "archive"] });
    },
  });
}

export function usePuzzleStats() {
  return useQuery({
    queryKey: gameKeys.stats,
    queryFn: gamesApi.getStats,
  });
}

export function useArchive(page = 1) {
  return useQuery({
    queryKey: gameKeys.archive(page),
    queryFn: () => gamesApi.getArchive(page),
  });
}

export function useMergeGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (guestKey: string) => gamesApi.mergeGuest(guestKey),
    onSuccess: () => {
      clearGuestKey();
      qc.invalidateQueries({ queryKey: ["nts"] });
    },
  });
}

// Admin Hooks
export function useAdminPuzzles(params: { from?: string; to?: string; status?: string; q?: string }) {
  return useQuery({
    queryKey: gameKeys.adminList(params),
    queryFn: () => gamesApi.listAdminPuzzles(params),
  });
}

export function useAdminPuzzleSummary() {
  return useQuery({
    queryKey: gameKeys.adminSummary,
    queryFn: gamesApi.getAdminSummary,
  });
}

export function useAdminPuzzleCandidates(target: { storyId?: number; bookId?: number } | null) {
  const key = target?.bookId ? `book:${target.bookId}` : target?.storyId ? `story:${target.storyId}` : "";
  return useQuery({
    queryKey: gameKeys.adminCandidates(key),
    queryFn: () => gamesApi.getAdminCandidates(target!),
    enabled: Boolean(key),
  });
}

export function useAdminPuzzleBooks(q = "", enabled = true) {
  return useQuery({
    queryKey: gameKeys.adminBooks(q),
    queryFn: () => gamesApi.listAdminBooks(q),
    enabled,
  });
}

export function useCreateAdminPuzzleBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FormData | Record<string, unknown>) => gamesApi.createAdminBook(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-nts", "books"] });
    },
  });
}

export function useImportAdminBooksCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => gamesApi.importAdminBooksCsv(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-nts", "books"] });
    },
  });
}

export function useCreateAdminPuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: gamesApi.createAdminPuzzle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-nts"] });
    },
  });
}

export function useUpdateAdminPuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof gamesApi.updateAdminPuzzle>[1] }) =>
      gamesApi.updateAdminPuzzle(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-nts"] });
    },
  });
}

export function useDeleteAdminPuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.deleteAdminPuzzle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-nts"] });
    },
  });
}

export function useAutofillPuzzles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: number) => gamesApi.autofillAdminPuzzles(days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-nts"] });
    },
  });
}
