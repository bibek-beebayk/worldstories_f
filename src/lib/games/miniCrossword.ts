import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient, fetchAuthenticatedFile } from "@/api/client";
import {
  clearGuestKey,
  getOrCreateGuestKey,
  getStoredGuestKey,
} from "@/lib/games/nameThatStory";

// =====================================================================
// Types
// =====================================================================

export type ClueDirection = "across" | "down";
export type MiniAttemptStatus = "in_progress" | "solved";
export type AdminMiniRowStatus = "live_today" | "scheduled" | "auto" | "draft" | "empty";
export type MiniDifficulty = "easy" | "medium" | "hard" | "";

export interface MiniDifficultyBreakdown {
  label: Exclude<MiniDifficulty, "">;
  score: number;
  avg_zipf: number;
  rare_words: string[];
  names: string[];
  entry_count: number;
}

export interface MiniEntry {
  number: number;
  direction: ClueDirection;
  row: number;
  col: number;
  length: number;
}

export interface MiniPublicClue {
  number: number;
  direction: ClueDirection;
  clue: string;
  length: number;
}

export interface MiniAttemptState {
  status: MiniAttemptStatus;
  letters: string[];
  revealed: Array<[number, number]>;
  started_at: string;
  hints_used: number;
  elapsed_seconds: number | null;
  is_archive: boolean;
}

export interface MiniLinkedStory {
  number: number;
  direction: ClueDirection;
  answer: string;
  story_id: number;
  title: string;
  slug: string;
  author: string;
  cover: string | null;
}

export interface MiniPublicResponse {
  number: number;
  date: string;
  title: string;
  difficulty?: MiniDifficulty;
  pattern: string[];
  numbering: Array<Array<number | null>>;
  entries: MiniEntry[];
  clues: MiniPublicClue[];
  is_archive: boolean;
  attempt: MiniAttemptState | null;
  solution?: string[];
  share_tokens?: string[];
  linked_stories?: MiniLinkedStory[];
}

export interface MiniStatsResponse {
  played: number;
  solved: number;
  solved_percentage: number;
  average_time: number | null;
  best_time: number | null;
  current_streak: number;
  best_streak: number;
  last_7_times: Array<{ date: string; elapsed_seconds: number; hints_used: number }>;
  week_history: Array<{ date: string; status: string }>;
}

export interface MiniArchiveItem {
  number: number;
  date: string;
  title: string;
  difficulty?: MiniDifficulty;
  status: "solved" | "in_progress" | "unplayed";
  elapsed_seconds: number | null;
  hints_used: number;
}

export interface MiniArchiveResponse {
  count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  results: MiniArchiveItem[];
}

// Admin types
export interface AdminMiniClue {
  number: number;
  direction: ClueDirection;
  answer: string;
  clue: string;
  story_id: number | null;
  save_to_bank?: boolean;
  in_bank?: boolean;
}

export interface AdminMiniListItem {
  id: number | null;
  date: string;
  number: number | null;
  title: string;
  difficulty?: MiniDifficulty;
  difficulty_score?: number | null;
  difficulty_override?: boolean;
  filled_clues: string;
  status: AdminMiniRowStatus;
  approval_status: "draft" | "approved" | null;
  auto_generated: boolean;
  players_count: number;
  solve_rate: number | null;
}

export interface AdminMiniListResponse {
  from: string;
  to: string;
  results: AdminMiniListItem[];
}

export interface AdminMiniDetail {
  id: number;
  number: number;
  date: string;
  title: string;
  pattern: string[];
  solution: string[];
  clues: AdminMiniClue[];
  difficulty: MiniDifficulty;
  difficulty_score: number | null;
  difficulty_override: boolean;
  difficulty_breakdown: MiniDifficultyBreakdown | null;
  approval_status: "draft" | "approved";
  status: AdminMiniRowStatus;
  auto_generated: boolean;
  attempts_count: number;
  locked_for_edit: boolean;
  validation_errors: string[];
  validation_warnings: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminMiniSummaryResponse {
  scheduled_ahead_days: number;
  empty_in_next_14: number;
  average_solve_rate: number;
  players_today: number;
  needs_attention: Array<{
    date: string;
    puzzle_id: number | null;
    reason: "empty" | "draft" | "auto";
    label: string;
  }>;
}

export interface ClueBankItem {
  id: number;
  answer: string;
  clue: string;
  story_id: number | null;
  story_slug?: string | null;
  story_title: string | null;
  is_name: boolean;
  times_used: number;
}

export interface ClueBankPage {
  results: ClueBankItem[];
  next_cursor: string | null;
  total: number;
}

export interface ClueBankListFilters {
  q?: string;
  length?: 3 | 4 | 5 | number | "";
  storyId?: number | null;
  isName?: boolean | null;
  answer?: string;
  pageSize?: number;
}

export interface ClueBankExportResult {
  blob: Blob;
  filename: string;
  rowCount: number;
}

// =====================================================================
// Pure Helpers
// =====================================================================

export function formatTimer(totalSeconds: number, padMinutes = true): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  const mStr = padMinutes ? String(mins).padStart(2, "0") : String(mins);
  const sStr = String(secs).padStart(2, "0");
  return `${mStr}:${sStr}`;
}

export function buildMiniShareText(
  puzzleNumber: number,
  elapsedSeconds: number,
  tokens: string[],
  hintsUsed: number,
  siteUrl = "https://worldstories.org/games/mini-crossword"
): string {
  const timeStr = formatTimer(elapsedSeconds, false);
  const gridLines = tokens.slice(0, 5).map((row) =>
    row
      .split("")
      .map((ch) => {
        if (ch === "G") return "\u{1F7E9}";
        if (ch === "Y") return "\u{1F7E8}";
        return "\u2B1B";
      })
      .join("")
  );
  const lines = [`Mini Crossword #${puzzleNumber}, ${timeStr}`, ...gridLines];
  if (hintsUsed > 0) {
    lines.push(`${hintsUsed} ${hintsUsed === 1 ? "hint" : "hints"}`);
  }
  lines.push(siteUrl);
  return lines.join("\n");
}

export function numberGridClient(pattern: string[]): {
  numbering: Array<Array<number | null>>;
  entries: MiniEntry[];
} {
  const size = 5;
  const numbering: Array<Array<number | null>> = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );
  const entries: MiniEntry[] = [];
  let num = 1;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (pattern[r]?.[c] !== ".") continue;
      const startsAcross =
        (c === 0 || pattern[r][c - 1] === "#") && c + 1 < size && pattern[r][c + 1] === ".";
      const startsDown =
        (r === 0 || pattern[r - 1][c] === "#") && r + 1 < size && pattern[r + 1][c] === ".";
      if (!startsAcross && !startsDown) continue;
      numbering[r][c] = num;
      if (startsAcross) {
        let len = 0;
        let cc = c;
        while (cc < size && pattern[r][cc] === ".") {
          len++;
          cc++;
        }
        entries.push({ number: num, direction: "across", row: r, col: c, length: len });
      }
      if (startsDown) {
        let len = 0;
        let rr = r;
        while (rr < size && pattern[rr][c] === ".") {
          len++;
          rr++;
        }
        entries.push({ number: num, direction: "down", row: r, col: c, length: len });
      }
      num++;
    }
  }
  entries.sort((a, b) =>
    a.number !== b.number ? a.number - b.number : a.direction === "across" ? -1 : 1
  );
  return { numbering, entries };
}

export function extractAnswerClient(solution: string[], entry: MiniEntry): string {
  let out = "";
  for (let i = 0; i < entry.length; i++) {
    const r = entry.direction === "across" ? entry.row : entry.row + i;
    const c = entry.direction === "across" ? entry.col + i : entry.col;
    out += solution[r]?.[c] || ".";
  }
  return out;
}

// =====================================================================
// API Functions
// =====================================================================

const PUBLIC_BASE = "/games/mini-crossword";
const ADMIN_BASE = "/admin/games/mini-crossword";

function guestHeaders(): Record<string, string> {
  const key = getOrCreateGuestKey();
  return key ? { "X-Guest-Key": key } : {};
}

export function countCsvDataRows(csvText: string): number {
  const cleaned = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return 0;
  let rows = 0;
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"') {
      if (inQuotes && cleaned[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && ch === "\n") {
      rows++;
    }
  }
  // Total logical rows = newlines outside quotes + 1; subtract 1 for header
  return Math.max(0, rows);
}

export function buildClueBankQueryParams(
  params?: ClueBankListFilters & { cursor?: string | null }
): Record<string, string | number | undefined> {
  if (!params) return {};
  return {
    q: params.q?.trim() || undefined,
    cursor: params.cursor || undefined,
    page_size: params.pageSize,
    length: params.length ? Number(params.length) : undefined,
    story_id: params.storyId ?? undefined,
    is_name:
      typeof params.isName === "boolean" ? (params.isName ? "true" : "false") : undefined,
    answer: params.answer?.trim().toUpperCase() || undefined,
  };
}

function withQuery(path: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export const miniApi = {
  getToday: async (): Promise<MiniPublicResponse> =>
    apiClient<MiniPublicResponse>(`${PUBLIC_BASE}/today/`, { headers: guestHeaders() }),

  getPuzzle: async (date: string): Promise<MiniPublicResponse> =>
    apiClient<MiniPublicResponse>(`${PUBLIC_BASE}/puzzles/${encodeURIComponent(date)}/`, {
      headers: guestHeaders(),
    }),

  start: async (date?: string): Promise<MiniPublicResponse> =>
    apiClient<MiniPublicResponse>(`${PUBLIC_BASE}/start/`, {
      method: "POST",
      body: JSON.stringify(date ? { date } : {}),
      headers: guestHeaders(),
    }),

  save: async (payload: {
    date?: string;
    letters: string[];
  }): Promise<{ saved: boolean; letters: string[] }> =>
    apiClient<{ saved: boolean; letters: string[] }>(`${PUBLIC_BASE}/save/`, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: guestHeaders(),
    }),

  check: async (payload: {
    date?: string;
    scope: "word" | "grid";
    row?: number;
    col?: number;
    direction?: ClueDirection;
    letters?: string[];
  }): Promise<{ wrong: Array<[number, number]> }> =>
    apiClient<{ wrong: Array<[number, number]> }>(`${PUBLIC_BASE}/check/`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: guestHeaders(),
    }),

  reveal: async (payload: {
    date?: string;
    row: number;
    col: number;
  }): Promise<{
    letter: string;
    hints_used: number;
    revealed: Array<[number, number]>;
    letters: string[];
  }> =>
    apiClient(`${PUBLIC_BASE}/reveal/`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: guestHeaders(),
    }),

  submit: async (payload: {
    date?: string;
    letters: string[];
  }): Promise<{ solved: boolean; puzzle?: MiniPublicResponse }> =>
    apiClient(`${PUBLIC_BASE}/submit/`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: guestHeaders(),
    }),

  getStats: async (): Promise<MiniStatsResponse> =>
    apiClient<MiniStatsResponse>(`${PUBLIC_BASE}/stats/`, { headers: guestHeaders() }),

  getArchive: async (page = 1): Promise<MiniArchiveResponse> =>
    apiClient<MiniArchiveResponse>(withQuery(`${PUBLIC_BASE}/archive/`, { page }), {
      headers: guestHeaders(),
    }),

  mergeGuest: async (guestKey: string): Promise<{ merged: number; skipped: number }> =>
    apiClient(`${PUBLIC_BASE}/merge-guest/`, {
      method: "POST",
      body: JSON.stringify({ guest_key: guestKey }),
    }),

  // Admin
  adminList: async (params?: {
    from?: string;
    to?: string;
    status?: string;
  }): Promise<AdminMiniListResponse> =>
    apiClient<AdminMiniListResponse>(withQuery(`${ADMIN_BASE}/puzzles/`, params)),

  adminGet: async (id: number): Promise<AdminMiniDetail> =>
    apiClient<AdminMiniDetail>(`${ADMIN_BASE}/puzzles/${id}/`),

  adminCreate: async (payload: {
    date: string;
    title: string;
    pattern: string[];
    solution: string[];
    clues: AdminMiniClue[];
    difficulty?: string | null;
    difficulty_override?: boolean;
  }): Promise<AdminMiniDetail> =>
    apiClient<AdminMiniDetail>(`${ADMIN_BASE}/puzzles/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminUpdate: async (
    id: number,
    payload: {
      date?: string;
      title?: string;
      pattern?: string[];
      solution?: string[];
      clues?: AdminMiniClue[];
      difficulty?: string | null;
      difficulty_override?: boolean;
    }
  ): Promise<AdminMiniDetail> =>
    apiClient<AdminMiniDetail>(`${ADMIN_BASE}/puzzles/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  adminDelete: async (id: number): Promise<void> => {
    await apiClient<void>(`${ADMIN_BASE}/puzzles/${id}/`, { method: "DELETE" });
  },

  adminApprove: async (id: number): Promise<AdminMiniDetail> =>
    apiClient<AdminMiniDetail>(`${ADMIN_BASE}/puzzles/${id}/approve/`, { method: "POST" }),

  adminUnapprove: async (id: number): Promise<AdminMiniDetail> =>
    apiClient<AdminMiniDetail>(`${ADMIN_BASE}/puzzles/${id}/unapprove/`, { method: "POST" }),

  adminValidate: async (payload: {
    pattern: string[];
    solution: string[];
    clues: AdminMiniClue[];
    exclude_puzzle_id?: number | null;
  }): Promise<{
    errors: string[];
    warnings: string[];
    difficulty: MiniDifficultyBreakdown | null;
  }> =>
    apiClient(`${ADMIN_BASE}/validate/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminGenerateFill: async (payload: {
    pattern: string[];
    theme_words?: string[];
    seed?: number;
  }): Promise<{ solutions: string[][] }> =>
    apiClient(`${ADMIN_BASE}/generate-fill/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminDraftClues: async (payload: {
    pattern: string[];
    solution: string[];
  }): Promise<{ clues: AdminMiniClue[] }> =>
    apiClient(`${ADMIN_BASE}/draft-clues/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminClueSuggestions: async (answer: string): Promise<{ suggestions: ClueBankItem[] }> =>
    apiClient(withQuery(`${ADMIN_BASE}/clue-suggestions/`, { answer })),

  adminAutogenerate: async (
    days = 14
  ): Promise<{ created: string[]; skipped: string[]; created_count: number; skipped_count: number }> =>
    apiClient(`${ADMIN_BASE}/autogenerate/`, {
      method: "POST",
      body: JSON.stringify({ days }),
    }),

  adminSummary: async (): Promise<AdminMiniSummaryResponse> =>
    apiClient<AdminMiniSummaryResponse>(`${ADMIN_BASE}/summary/`),

  adminClueBankList: async (
    params?: (ClueBankListFilters & { cursor?: string | null }) | string
  ): Promise<ClueBankPage> => {
    const normalized = typeof params === "string" ? { q: params } : params;
    return apiClient<ClueBankPage>(
      withQuery(`${ADMIN_BASE}/clue-bank/`, buildClueBankQueryParams(normalized))
    );
  },

  adminClueBankExport: async (
    filters?: ClueBankListFilters
  ): Promise<ClueBankExportResult> => {
    const endpoint = withQuery(
      `${ADMIN_BASE}/clue-bank/export/`,
      buildClueBankQueryParams(filters)
    );
    const { buffer, filename, contentType } = await fetchAuthenticatedFile(
      endpoint,
      "clue-bank.csv"
    );
    const text = new TextDecoder("utf-8").decode(buffer);
    const rowCount = countCsvDataRows(text);
    const blob = new Blob([buffer], { type: contentType || "text/csv;charset=utf-8" });
    return { blob, filename: filename || "clue-bank.csv", rowCount };
  },

  adminClueBankAdd: async (payload: {
    answer: string;
    clue: string;
    story_slug?: string;
    story_id?: number | null;
    is_name?: boolean;
  }): Promise<ClueBankItem> =>
    apiClient(`${ADMIN_BASE}/clue-bank/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  adminClueBankUpdate: async (
    id: number,
    payload: { is_name: boolean }
  ): Promise<ClueBankItem> =>
    apiClient(`${ADMIN_BASE}/clue-bank/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  adminClueBankDelete: async (id: number): Promise<void> => {
    await apiClient<void>(`${ADMIN_BASE}/clue-bank/${id}/`, { method: "DELETE" });
  },

  adminClueBankImport: async (
    csv: string
  ): Promise<{ imported: number; updated: number; skipped: number }> =>
    apiClient(`${ADMIN_BASE}/clue-bank/import/`, {
      method: "POST",
      body: JSON.stringify({ csv }),
    }),
};

// =====================================================================
// Query Keys & Hooks
// =====================================================================

export const miniKeys = {
  all: ["games", "mini-crossword"] as const,
  today: () => [...miniKeys.all, "today"] as const,
  puzzle: (date: string) => [...miniKeys.all, "puzzle", date] as const,
  stats: () => [...miniKeys.all, "stats"] as const,
  archive: (page: number) => [...miniKeys.all, "archive", page] as const,
  adminList: (params?: Record<string, string | undefined>) =>
    [...miniKeys.all, "admin", "list", params ?? {}] as const,
  adminDetail: (id: number) => [...miniKeys.all, "admin", "detail", id] as const,
  adminSummary: () => [...miniKeys.all, "admin", "summary"] as const,
  adminClueBank: (filters?: { q?: string; length?: number | "" } | string) => {
    if (typeof filters === "string") {
      return [...miniKeys.all, "admin", "clue-bank", { q: filters, length: "" }] as const;
    }
    return [
      ...miniKeys.all,
      "admin",
      "clue-bank",
      { q: filters?.q ?? "", length: filters?.length ?? "" },
    ] as const;
  },
};

export function useMiniToday() {
  return useQuery({
    queryKey: miniKeys.today(),
    queryFn: () => miniApi.getToday(),
    retry: false,
  });
}

export function useMiniPuzzle(date?: string) {
  return useQuery({
    queryKey: date ? miniKeys.puzzle(date) : miniKeys.today(),
    queryFn: () => (date ? miniApi.getPuzzle(date) : miniApi.getToday()),
    retry: false,
  });
}

export function useStart(date?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => miniApi.start(date),
    onSuccess: (data) => {
      qc.setQueryData(date ? miniKeys.puzzle(date) : miniKeys.today(), data);
    },
  });
}

/**
 * Debounced 1500ms save hook that flushes on blur, visibilitychange, and unmount.
 */
export function useSave(date?: string) {
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<string[] | null>(null);

  const mutation = useMutation({
    mutationFn: (letters: string[]) => miniApi.save({ date, letters }),
  });

  const flushSave = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current) {
      const payload = pendingRef.current;
      pendingRef.current = null;
      mutation.mutate(payload);
    }
  }, [mutation]);

  const scheduleSave = useCallback(
    (letters: string[]) => {
      pendingRef.current = letters;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (pendingRef.current) {
          const payload = pendingRef.current;
          pendingRef.current = null;
          mutation.mutate(payload);
        }
      }, 1500);
    },
    [mutation]
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    const onBlur = () => flushSave();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      flushSave();
    };
  }, [flushSave]);

  return { scheduleSave, flushSave, isSaving: mutation.isPending };
}

export function useCheck(date?: string) {
  return useMutation({
    mutationFn: (payload: {
      scope: "word" | "grid";
      row?: number;
      col?: number;
      direction?: ClueDirection;
      letters?: string[];
    }) => miniApi.check({ date, ...payload }),
  });
}

export function useReveal(date?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { row: number; col: number }) => miniApi.reveal({ date, ...payload }),
    onSuccess: (res) => {
      const key = date ? miniKeys.puzzle(date) : miniKeys.today();
      qc.setQueryData<MiniPublicResponse | undefined>(key, (prev) => {
        if (!prev || !prev.attempt) return prev;
        return {
          ...prev,
          attempt: {
            ...prev.attempt,
            letters: res.letters,
            revealed: res.revealed,
            hints_used: res.hints_used,
          },
        };
      });
    },
  });
}

export function useSubmit(date?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (letters: string[]) => miniApi.submit({ date, letters }),
    onSuccess: (res) => {
      if (res.solved && res.puzzle) {
        qc.setQueryData(date ? miniKeys.puzzle(date) : miniKeys.today(), res.puzzle);
        qc.invalidateQueries({ queryKey: miniKeys.stats() });
        qc.invalidateQueries({ queryKey: [...miniKeys.all, "archive"] });
      }
    },
  });
}

export function useMiniStats() {
  return useQuery({
    queryKey: miniKeys.stats(),
    queryFn: () => miniApi.getStats(),
  });
}

export function useMiniArchive(page = 1) {
  return useQuery({
    queryKey: miniKeys.archive(page),
    queryFn: () => miniApi.getArchive(page),
  });
}

export function useMiniMergeGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const key = getStoredGuestKey();
      if (!key) return { merged: 0, skipped: 0 };
      const res = await miniApi.mergeGuest(key);
      clearGuestKey();
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: miniKeys.all });
    },
  });
}

// Admin Hooks
export function useAdminMiniList(params?: { from?: string; to?: string; status?: string }) {
  return useQuery({
    queryKey: miniKeys.adminList(params),
    queryFn: () => miniApi.adminList(params),
  });
}

export function useAdminMini(id: number | null) {
  return useQuery({
    queryKey: miniKeys.adminDetail(id ?? 0),
    queryFn: () => miniApi.adminGet(id!),
    enabled: Boolean(id),
  });
}

export function useAdminSaveMini() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id?: number;
      date: string;
      title: string;
      pattern: string[];
      solution: string[];
      clues: AdminMiniClue[];
      difficulty?: string | null;
      difficulty_override?: boolean;
    }) => {
      const { id, ...body } = vars;
      return id ? miniApi.adminUpdate(id, body) : miniApi.adminCreate(body);
    },
    onSuccess: (data) => {
      qc.setQueryData(miniKeys.adminDetail(data.id), data);
      qc.invalidateQueries({ queryKey: [...miniKeys.all, "admin"] });
    },
  });
}

export function useAdminDeleteMini() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => miniApi.adminDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...miniKeys.all, "admin"] });
    },
  });
}

export function useAdminApproveMini() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => miniApi.adminApprove(id),
    onSuccess: (data) => {
      qc.setQueryData(miniKeys.adminDetail(data.id), data);
      qc.invalidateQueries({ queryKey: [...miniKeys.all, "admin"] });
    },
  });
}

export function useAdminUnapproveMini() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => miniApi.adminUnapprove(id),
    onSuccess: (data) => {
      qc.setQueryData(miniKeys.adminDetail(data.id), data);
      qc.invalidateQueries({ queryKey: [...miniKeys.all, "admin"] });
    },
  });
}

export function useAdminGenerateFill() {
  return useMutation({
    mutationFn: (payload: { pattern: string[]; theme_words?: string[]; seed?: number }) =>
      miniApi.adminGenerateFill(payload),
  });
}

export function useAdminDraftClues() {
  return useMutation({
    mutationFn: (payload: { pattern: string[]; solution: string[] }) =>
      miniApi.adminDraftClues(payload),
  });
}

export function useAdminAutogenerateMinis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: number = 14) => miniApi.adminAutogenerate(days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...miniKeys.all, "admin"] });
    },
  });
}

export function useAdminMiniSummary() {
  return useQuery({
    queryKey: miniKeys.adminSummary(),
    queryFn: () => miniApi.adminSummary(),
  });
}

export function useAdminClueBank(
  filters?: ClueBankListFilters | string
) {
  const normalized: ClueBankListFilters =
    typeof filters === "string" ? { q: filters } : (filters ?? {});
  const q = normalized.q?.trim() || "";
  const length = normalized.length ? Number(normalized.length) : "";
  const pageSize = normalized.pageSize ?? 50;

  const query = useInfiniteQuery<
    ClueBankPage,
    Error,
    InfiniteData<ClueBankPage, string | null>,
    ReturnType<typeof miniKeys.adminClueBank>,
    string | null
  >({
    queryKey: miniKeys.adminClueBank({ q, length }),
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      miniApi.adminClueBankList({
        ...normalized,
        q: q || undefined,
        length: length || undefined,
        pageSize,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.results) ?? [],
    [query.data]
  );
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    items,
    total,
  };
}

export function useAdminAddClueBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      answer: string;
      clue: string;
      story_slug?: string;
      story_id?: number | null;
      is_name?: boolean;
    }) => miniApi.adminClueBankAdd(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...miniKeys.all, "admin", "clue-bank"] });
    },
  });
}

export function useAdminUpdateClueBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; is_name: boolean }) =>
      miniApi.adminClueBankUpdate(vars.id, { is_name: vars.is_name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...miniKeys.all, "admin", "clue-bank"] });
    },
  });
}

export function useAdminDeleteClueBank() {
  const qc = useQueryClient();
  const baseKey = [...miniKeys.all, "admin", "clue-bank"] as const;
  return useMutation({
    mutationFn: (id: number) => miniApi.adminClueBankDelete(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: baseKey });
      const previous = qc.getQueriesData<InfiniteData<ClueBankPage, string | null>>({
        queryKey: baseKey,
      });
      qc.setQueriesData<InfiniteData<ClueBankPage, string | null>>(
        { queryKey: baseKey },
        (old) => {
          if (!old) return old;
          let removed = false;
          const pages = old.pages.map((page) => {
            const nextResults = page.results.filter((row) => {
              if (row.id === id) {
                removed = true;
                return false;
              }
              return true;
            });
            return { ...page, results: nextResults };
          });
          if (!removed) return old;
          return {
            ...old,
            pages: pages.map((page) => ({
              ...page,
              total: Math.max(0, page.total - 1),
            })),
          };
        }
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (!ctx?.previous) return;
      for (const [key, data] of ctx.previous) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: baseKey });
    },
  });
}

export function useAdminImportClueBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (csv: string) => miniApi.adminClueBankImport(csv),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...miniKeys.all, "admin", "clue-bank"] });
    },
  });
}

export function useAdminExportClueBank() {
  return useMutation({
    mutationFn: (filters?: ClueBankListFilters) => miniApi.adminClueBankExport(filters),
  });
}
