import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

// =====================================================================
// Types
// =====================================================================

export type PuzzleType = "opening_line" | "quote" | "trivia" | "author_bio";
export type AnswerKind = "story" | "author";
export type AttemptStatus = "in_progress" | "solved" | "failed";
export type EraMatch = "same" | "close" | "different";
export type ShareToken = "wrong" | "right" | "empty";

export interface PuzzleTypeMeta {
  type: PuzzleType;
  label: string;
  shortLabel: string;
  answerKind: AnswerKind;
  instructions: string;
  description: string;
}

export const PUZZLE_TYPE_META: Record<PuzzleType, PuzzleTypeMeta> = {
  opening_line: {
    type: "opening_line",
    label: "Opening line",
    shortLabel: "Opening line",
    answerKind: "story",
    instructions: "Read the opening line and name the story in 6 guesses.",
    description: "Start with the very first sentence of a classic work. Each miss unlocks another clue.",
  },
  quote: {
    type: "quote",
    label: "In-book quote",
    shortLabel: "In-book quote",
    answerKind: "story",
    instructions: "Identify the story from a memorable line inside the book.",
    description: "A single passage from the middle of a story, followed by genre, country, era, length, and author initials.",
  },
  trivia: {
    type: "trivia",
    label: "Trivia ladder",
    shortLabel: "Trivia ladder",
    answerKind: "story",
    instructions: "Climb the clue ladder from hardest to easiest to name the story.",
    description: "Hand-crafted literary clues ordered from cryptic to unmistakable.",
  },
  author_bio: {
    type: "author_bio",
    label: "Who wrote it",
    shortLabel: "Who wrote it",
    answerKind: "author",
    instructions: "Use the biography and bibliography clues to name the author.",
    description: "Follow the trail of genres, notable works, country, and era to identify the writer.",
  },
};

export interface RevealedClue {
  position: number;
  kind: "text" | "attribute" | "cover";
  label: string;
  value: string;
  locked: false;
}

export interface LockedClue {
  position: number;
  locked: true;
}

export type PublicClue = RevealedClue | LockedClue;

export interface GuessMatches {
  genre?: boolean;
  country?: boolean;
  era?: EraMatch;
}

export interface GuessHistoryItem {
  target_id: number | null;
  title: string;
  subtitle: string;
  initials: string;
  correct: boolean;
  matches: GuessMatches;
  skipped: boolean;
}

export interface StoryAnswerCard {
  kind: "story";
  id: number;
  title: string;
  slug: string;
  author: string;
  year: number | null;
  cover: string | null;
  read_time: number | null;
  audiobook_slug: string | null;
}

export interface AuthorWorkSummary {
  id: number;
  title: string;
  slug: string;
  year: number | null;
  cover: string | null;
}

export interface AuthorAnswerCard {
  kind: "author";
  id: number;
  name: string;
  slug: string;
  years: string;
  initials: string;
  image: string | null;
  works: AuthorWorkSummary[];
}

export type AnswerCard = StoryAnswerCard | AuthorAnswerCard;

export interface YesterdaySummary {
  date: string;
  puzzle_number: number;
  puzzle_type: PuzzleType;
  answer_kind: AnswerKind;
  card: AnswerCard;
}

export interface PublicPuzzleResponse {
  puzzle_number: number;
  date: string;
  puzzle_type: PuzzleType;
  answer_kind: AnswerKind;
  max_guesses: number;
  guesses_used: number;
  status: AttemptStatus;
  is_archive: boolean;
  clues: PublicClue[];
  guesses: GuessHistoryItem[];
  answer?: AnswerCard;
  share_tokens?: ShareToken[];
  yesterday?: YesterdaySummary | null;
}

export interface StorySearchResult {
  id: number;
  title: string;
  author: string;
  cover_thumb: string | null;
}

export interface AuthorSearchResult {
  id: number;
  name: string;
  subtitle: string;
  initials: string;
}

export type SearchResultItem = StorySearchResult | AuthorSearchResult;

export interface SearchResponse {
  kind: AnswerKind;
  results: SearchResultItem[];
}

export interface WeekHistoryItem {
  date: string;
  status: "solved" | "failed" | "unplayed";
}

export interface PuzzleStatsResponse {
  played: number;
  wins: number;
  win_percentage: number;
  current_streak: number;
  best_streak: number;
  guess_distribution: Record<string, number>;
  week_history: WeekHistoryItem[];
}

export interface ArchiveItem {
  puzzle_number: number;
  date: string;
  puzzle_type: PuzzleType;
  answer_kind: AnswerKind;
  status: "solved" | "failed" | "in_progress" | "unplayed";
  guess_count: number;
}

export interface ArchiveResponse {
  count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  results: ArchiveItem[];
}

export interface WeekDaySchedule {
  date: string;
  puzzle_type: PuzzleType;
  answer_kind: AnswerKind;
  is_today: boolean;
}

export interface WeekResponse {
  days: WeekDaySchedule[];
}

// =====================================================================
// Admin Types
// =====================================================================

export type AdminRowStatus = "live_today" | "scheduled" | "draft" | "auto" | "empty";

export interface AdminClueItem {
  kind: "text" | "attribute" | "cover";
  key?: string;
  label: string;
  value?: string;
}

export interface AdminPuzzleListItem {
  id: number | null;
  date: string;
  number: number | null;
  puzzle_type: PuzzleType;
  answer_kind: AnswerKind;
  answer_id: number | null;
  answer_label: string;
  clue1_preview: string;
  difficulty: string;
  status: AdminRowStatus;
  approval_status: "draft" | "approved" | null;
  auto_filled: boolean;
  players_count: number;
  solve_rate: number | null;
}

export interface AdminPuzzleListResponse {
  from: string;
  to: string;
  results: AdminPuzzleListItem[];
}

export interface LeakIssue {
  clue_index: number;
  term: string;
}

export interface AdminPuzzleDetail {
  id: number;
  number: number;
  date: string;
  puzzle_type: PuzzleType;
  answer_kind: AnswerKind;
  answer_id: number | null;
  answer_label: string;
  clues: AdminClueItem[];
  source_chapter_id: number | null;
  difficulty: string;
  approval_status: "draft" | "approved";
  status: AdminRowStatus;
  auto_filled: boolean;
  approved_by_id: number | null;
  approved_at: string | null;
  attempts_count: number;
  locked_for_edit: boolean;
  validation_errors: string[];
  leaks: LeakIssue[];
  created_at: string;
  updated_at: string;
}

export interface AdminValidateResponse {
  valid: boolean;
  errors: string[];
  leaks: LeakIssue[];
}

export interface CandidateLine {
  index: number;
  text: string;
  word_count: number;
  chapter_id: number;
}

export interface RotationEntry {
  weekday: number;
  day_name: string;
  puzzle_type: PuzzleType;
  answer_kind: AnswerKind;
}

export interface NeedsAttentionItem {
  date: string;
  puzzle_id: number | null;
  puzzle_type: PuzzleType;
  reason: "empty" | "draft" | "auto";
  label: string;
}

export interface AdminSummaryResponse {
  scheduled_ahead_days: number;
  empty_in_next_14: number;
  average_solve_rate: number;
  players_today: number;
  needs_attention: NeedsAttentionItem[];
}

export interface AdminAutofillResponse {
  created: string[];
  drafted: string[];
  skipped_empty: string[];
  created_count: number;
  drafted_count: number;
  skipped_empty_count: number;
}

// =====================================================================
// Guest Key, Share Text, and Countdown Helpers (SSR-safe)
// =====================================================================

const GUEST_KEY_STORAGE = "ws_nts_guest_key_v1";

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

export function getOrCreateGuestKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(GUEST_KEY_STORAGE);
    if (existing) return existing;
    const created = generateUuid();
    window.localStorage.setItem(GUEST_KEY_STORAGE, created);
    return created;
  } catch {
    return "";
  }
}

export function getStoredGuestKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(GUEST_KEY_STORAGE) || "";
  } catch {
    return "";
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

function guestHeaders(): Record<string, string> {
  const key = getOrCreateGuestKey();
  return key ? { "X-Guest-Key": key } : {};
}

export function buildShareText(
  puzzleNumber: number,
  status: AttemptStatus,
  guessesUsed: number,
  tokens: ShareToken[],
  siteUrl = "https://worldstories.org/games/name-that-story"
): string {
  const score = status === "solved" ? `${guessesUsed}/6` : "X/6";
  const grid = tokens
    .slice(0, 6)
    .map((t) => {
      if (t === "right") return "O";
      if (t === "wrong") return "X";
      return "-";
    })
    .join("");
  return `Name That Story #${puzzleNumber} ${score}\n${grid}\n${siteUrl}`;
}

export function getCountdownToUtcMidnight(now: Date = new Date()): {
  hours: string;
  minutes: string;
  seconds: string;
  formatted: string;
  totalSeconds: number;
} {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0
  );
  const totalSeconds = Math.max(0, Math.floor((nextMidnight - now.getTime()) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = pad(h);
  const minutes = pad(m);
  const seconds = pad(s);
  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours}:${minutes}:${seconds}`,
    totalSeconds,
  };
}

// =====================================================================
// API Functions
// =====================================================================

const PUBLIC_BASE = "/games/name-that-story";
const ADMIN_BASE = "/admin/games/name-that-story";

function withQuery(path: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") {
      qs.set(k, String(v));
    }
  }
  const str = qs.toString();
  return str ? `${path}?${str}` : path;
}

export const gamesApi = {
  getToday: async (): Promise<PublicPuzzleResponse> => {
    return apiClient<PublicPuzzleResponse>(`${PUBLIC_BASE}/today/`, {
      headers: guestHeaders(),
    });
  },

  getPuzzle: async (date: string): Promise<PublicPuzzleResponse> => {
    return apiClient<PublicPuzzleResponse>(
      `${PUBLIC_BASE}/puzzles/${encodeURIComponent(date)}/`,
      { headers: guestHeaders() }
    );
  },

  search: async (q: string, date?: string, kind?: AnswerKind): Promise<SearchResponse> => {
    return apiClient<SearchResponse>(
      withQuery(`${PUBLIC_BASE}/search/`, { q, date, kind }),
      { headers: guestHeaders() }
    );
  },

  guess: async (payload: { date?: string; target_id: number }): Promise<PublicPuzzleResponse> => {
    return apiClient<PublicPuzzleResponse>(`${PUBLIC_BASE}/guess/`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: guestHeaders(),
    });
  },

  skip: async (payload: { date?: string }): Promise<PublicPuzzleResponse> => {
    return apiClient<PublicPuzzleResponse>(`${PUBLIC_BASE}/skip/`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: guestHeaders(),
    });
  },

  getStats: async (): Promise<PuzzleStatsResponse> => {
    return apiClient<PuzzleStatsResponse>(`${PUBLIC_BASE}/stats/`, {
      headers: guestHeaders(),
    });
  },

  getArchive: async (page = 1): Promise<ArchiveResponse> => {
    return apiClient<ArchiveResponse>(withQuery(`${PUBLIC_BASE}/archive/`, { page }), {
      headers: guestHeaders(),
    });
  },

  getWeek: async (): Promise<WeekResponse> => {
    return apiClient<WeekResponse>(`${PUBLIC_BASE}/week/`);
  },

  mergeGuest: async (guestKey: string): Promise<{ merged: number; skipped: number }> => {
    return apiClient<{ merged: number; skipped: number }>(`${PUBLIC_BASE}/merge-guest/`, {
      method: "POST",
      body: JSON.stringify({ guest_key: guestKey }),
    });
  },

  // Admin
  adminList: async (params?: {
    from?: string;
    to?: string;
    status?: string;
    type?: string;
    q?: string;
  }): Promise<AdminPuzzleListResponse> => {
    return apiClient<AdminPuzzleListResponse>(withQuery(`${ADMIN_BASE}/puzzles/`, params));
  },

  adminGet: async (id: number): Promise<AdminPuzzleDetail> => {
    return apiClient<AdminPuzzleDetail>(`${ADMIN_BASE}/puzzles/${id}/`);
  },

  adminCreate: async (payload: {
    date: string;
    puzzle_type: PuzzleType;
    answer_id: number;
    clues: AdminClueItem[];
    source_chapter_id?: number | null;
    difficulty?: string;
  }): Promise<AdminPuzzleDetail> => {
    return apiClient<AdminPuzzleDetail>(`${ADMIN_BASE}/puzzles/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  adminUpdate: async (
    id: number,
    payload: {
      date?: string;
      puzzle_type?: PuzzleType;
      answer_id?: number;
      clues?: AdminClueItem[];
      source_chapter_id?: number | null;
      difficulty?: string;
    }
  ): Promise<AdminPuzzleDetail> => {
    return apiClient<AdminPuzzleDetail>(`${ADMIN_BASE}/puzzles/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  adminDelete: async (id: number): Promise<void> => {
    await apiClient<void>(`${ADMIN_BASE}/puzzles/${id}/`, { method: "DELETE" });
  },

  adminApprove: async (id: number): Promise<AdminPuzzleDetail> => {
    return apiClient<AdminPuzzleDetail>(`${ADMIN_BASE}/puzzles/${id}/approve/`, {
      method: "POST",
    });
  },

  adminUnapprove: async (id: number): Promise<AdminPuzzleDetail> => {
    return apiClient<AdminPuzzleDetail>(`${ADMIN_BASE}/puzzles/${id}/unapprove/`, {
      method: "POST",
    });
  },

  adminValidate: async (payload: {
    puzzle_type: PuzzleType;
    answer_kind: AnswerKind;
    answer_id: number | null;
    clues: AdminClueItem[];
  }): Promise<AdminValidateResponse> => {
    return apiClient<AdminValidateResponse>(`${ADMIN_BASE}/validate/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  adminCandidates: async (params: {
    type: PuzzleType;
    answer_kind: AnswerKind;
    answer_id: number;
  }): Promise<{ candidates: CandidateLine[] }> => {
    return apiClient<{ candidates: CandidateLine[] }>(
      withQuery(`${ADMIN_BASE}/candidates/`, params)
    );
  },

  adminBuildClues: async (payload: {
    type: PuzzleType;
    answer_kind: AnswerKind;
    answer_id: number;
    chosen_text?: string;
  }): Promise<{ clues: AdminClueItem[]; fallback_attributes?: AdminClueItem[] }> => {
    return apiClient<{ clues: AdminClueItem[]; fallback_attributes?: AdminClueItem[] }>(
      `${ADMIN_BASE}/build-clues/`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  adminGetRotation: async (): Promise<{ rotation: RotationEntry[] }> => {
    return apiClient<{ rotation: RotationEntry[] }>(`${ADMIN_BASE}/rotation/`);
  },

  adminSaveRotation: async (
    rotation: Array<{ weekday: number; puzzle_type: PuzzleType }>
  ): Promise<{ rotation: RotationEntry[] }> => {
    return apiClient<{ rotation: RotationEntry[] }>(`${ADMIN_BASE}/rotation/`, {
      method: "PUT",
      body: JSON.stringify({ rotation }),
    });
  },

  adminAutofill: async (days = 14): Promise<AdminAutofillResponse> => {
    return apiClient<AdminAutofillResponse>(`${ADMIN_BASE}/autofill/`, {
      method: "POST",
      body: JSON.stringify({ days }),
    });
  },

  adminSummary: async (): Promise<AdminSummaryResponse> => {
    return apiClient<AdminSummaryResponse>(`${ADMIN_BASE}/summary/`);
  },
};

// =====================================================================
// Query Keys & React-Query Hooks
// =====================================================================

export const gamesKeys = {
  all: ["games", "name-that-story"] as const,
  today: () => [...gamesKeys.all, "today"] as const,
  puzzle: (date: string) => [...gamesKeys.all, "puzzle", date] as const,
  search: (q: string, date?: string, kind?: AnswerKind) =>
    [...gamesKeys.all, "search", q, date ?? "", kind ?? ""] as const,
  stats: () => [...gamesKeys.all, "stats"] as const,
  archive: (page: number) => [...gamesKeys.all, "archive", page] as const,
  week: () => [...gamesKeys.all, "week"] as const,
  adminList: (params?: Record<string, string | undefined>) =>
    [...gamesKeys.all, "admin", "list", params ?? {}] as const,
  adminDetail: (id: number) => [...gamesKeys.all, "admin", "detail", id] as const,
  adminRotation: () => [...gamesKeys.all, "admin", "rotation"] as const,
  adminSummary: () => [...gamesKeys.all, "admin", "summary"] as const,
  adminCandidates: (type: PuzzleType, answerKind: AnswerKind, answerId: number | null) =>
    [...gamesKeys.all, "admin", "candidates", type, answerKind, answerId ?? 0] as const,
};

export function useTodayPuzzle() {
  return useQuery({
    queryKey: gamesKeys.today(),
    queryFn: () => gamesApi.getToday(),
    retry: false,
  });
}

export function usePuzzle(date?: string) {
  return useQuery({
    queryKey: date ? gamesKeys.puzzle(date) : gamesKeys.today(),
    queryFn: () => (date ? gamesApi.getPuzzle(date) : gamesApi.getToday()),
    retry: false,
  });
}

export function useSearch(q: string, date?: string, kind?: AnswerKind) {
  const [debounced, setDebounced] = useState(q.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(q.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q]);

  return useQuery({
    queryKey: gamesKeys.search(debounced, date, kind),
    queryFn: () => gamesApi.search(debounced, date, kind),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });
}

export function useGuess(date?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetId: number) => gamesApi.guess({ date, target_id: targetId }),
    onSuccess: (data) => {
      if (date) {
        qc.setQueryData(gamesKeys.puzzle(date), data);
      } else {
        qc.setQueryData(gamesKeys.today(), data);
      }
      qc.invalidateQueries({ queryKey: gamesKeys.stats() });
      qc.invalidateQueries({ queryKey: [...gamesKeys.all, "archive"] });
    },
  });
}

export function useSkip(date?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => gamesApi.skip({ date }),
    onSuccess: (data) => {
      if (date) {
        qc.setQueryData(gamesKeys.puzzle(date), data);
      } else {
        qc.setQueryData(gamesKeys.today(), data);
      }
      qc.invalidateQueries({ queryKey: gamesKeys.stats() });
      qc.invalidateQueries({ queryKey: [...gamesKeys.all, "archive"] });
    },
  });
}

export function usePuzzleStats() {
  return useQuery({
    queryKey: gamesKeys.stats(),
    queryFn: () => gamesApi.getStats(),
  });
}

export function useArchive(page = 1) {
  return useQuery({
    queryKey: gamesKeys.archive(page),
    queryFn: () => gamesApi.getArchive(page),
  });
}

export function useWeek() {
  return useQuery({
    queryKey: gamesKeys.week(),
    queryFn: () => gamesApi.getWeek(),
    staleTime: 60_000,
  });
}

export function useMergeGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const key = getStoredGuestKey();
      if (!key) return { merged: 0, skipped: 0 };
      const res = await gamesApi.mergeGuest(key);
      clearGuestKey();
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamesKeys.all });
    },
  });
}

// =====================================================================
// Admin React-Query Hooks
// =====================================================================

export function useAdminPuzzles(params?: {
  from?: string;
  to?: string;
  status?: string;
  type?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: gamesKeys.adminList(params),
    queryFn: () => gamesApi.adminList(params),
  });
}

export function useAdminPuzzle(id: number | null) {
  return useQuery({
    queryKey: gamesKeys.adminDetail(id ?? 0),
    queryFn: () => gamesApi.adminGet(id!),
    enabled: Boolean(id),
  });
}

export function useAdminSavePuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id?: number;
      date: string;
      puzzle_type: PuzzleType;
      answer_id: number;
      clues: AdminClueItem[];
      source_chapter_id?: number | null;
      difficulty?: string;
    }) => {
      const { id, ...body } = vars;
      return id ? gamesApi.adminUpdate(id, body) : gamesApi.adminCreate(body);
    },
    onSuccess: (data) => {
      qc.setQueryData(gamesKeys.adminDetail(data.id), data);
      qc.invalidateQueries({ queryKey: [...gamesKeys.all, "admin"] });
    },
  });
}

export function useAdminDeletePuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.adminDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...gamesKeys.all, "admin"] });
    },
  });
}

export function useAdminApprovePuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.adminApprove(id),
    onSuccess: (data) => {
      qc.setQueryData(gamesKeys.adminDetail(data.id), data);
      qc.invalidateQueries({ queryKey: [...gamesKeys.all, "admin"] });
    },
  });
}

export function useAdminUnapprovePuzzle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.adminUnapprove(id),
    onSuccess: (data) => {
      qc.setQueryData(gamesKeys.adminDetail(data.id), data);
      qc.invalidateQueries({ queryKey: [...gamesKeys.all, "admin"] });
    },
  });
}

export function useAdminValidatePuzzle() {
  return useMutation({
    mutationFn: (payload: {
      puzzle_type: PuzzleType;
      answer_kind: AnswerKind;
      answer_id: number | null;
      clues: AdminClueItem[];
    }) => gamesApi.adminValidate(payload),
  });
}

export function useAdminCandidates(
  type: PuzzleType,
  answerKind: AnswerKind,
  answerId: number | null
) {
  return useQuery({
    queryKey: gamesKeys.adminCandidates(type, answerKind, answerId),
    queryFn: () =>
      gamesApi.adminCandidates({ type, answer_kind: answerKind, answer_id: answerId! }),
    enabled: Boolean(answerId) && (type === "opening_line" || type === "quote"),
  });
}

export function useAdminBuildClues() {
  return useMutation({
    mutationFn: (payload: {
      type: PuzzleType;
      answer_kind: AnswerKind;
      answer_id: number;
      chosen_text?: string;
    }) => gamesApi.adminBuildClues(payload),
  });
}

export function useAdminRotation() {
  return useQuery({
    queryKey: gamesKeys.adminRotation(),
    queryFn: () => gamesApi.adminGetRotation(),
  });
}

export function useAdminSaveRotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rotation: Array<{ weekday: number; puzzle_type: PuzzleType }>) =>
      gamesApi.adminSaveRotation(rotation),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamesKeys.adminRotation() });
      qc.invalidateQueries({ queryKey: [...gamesKeys.all, "admin"] });
    },
  });
}

export function useAdminAutofill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: number = 14) => gamesApi.adminAutofill(days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...gamesKeys.all, "admin"] });
    },
  });
}

export function useAdminPuzzleSummary() {
  return useQuery({
    queryKey: gamesKeys.adminSummary(),
    queryFn: () => gamesApi.adminSummary(),
  });
}
