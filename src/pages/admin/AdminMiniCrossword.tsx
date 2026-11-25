import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  Download,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  type AdminMiniRowStatus,
  useAdminAddClueBank,
  useAdminAutogenerateMinis,
  useAdminClueBank,
  useAdminDeleteClueBank,
  useAdminDeleteMini,
  useAdminExportClueBank,
  useAdminImportClueBank,
  useAdminMiniList,
  useAdminMiniSummary,
  useAdminUpdateClueBank,
} from "@/lib/games/miniCrossword";
import MiniDifficultyChip from "@/components/games/MiniDifficultyChip";

const STATUS_BADGES: Record<AdminMiniRowStatus, { label: string; cls: string }> = {
  live_today: { label: "Live today", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  scheduled: { label: "Scheduled", cls: "bg-slate-900 text-white border-slate-900" },
  auto: { label: "Auto", cls: "bg-sky-100 text-sky-900 border-sky-300" },
  draft: { label: "Draft", cls: "bg-amber-100 text-amber-950 border-amber-300" },
  empty: { label: "Empty", cls: "bg-slate-100 text-slate-600 border-slate-300" },
};

export default function AdminMiniCrossword() {
  const [tab, setTab] = useState<"schedule" | "clue_bank">("schedule");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Clue bank state
  const [bankQuery, setBankQuery] = useState("");
  const [debouncedBankQuery, setDebouncedBankQuery] = useState("");
  const [bankLength, setBankLength] = useState<"" | "3" | "4" | "5">("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newClue, setNewClue] = useState("");
  const [newStorySlug, setNewStorySlug] = useState("");
  const [newIsName, setNewIsName] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [liveStatus, setLiveStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [exportError, setExportError] = useState("");

  const bankScrollRef = useRef<HTMLDivElement | null>(null);
  const bankSentinelRef = useRef<HTMLDivElement | null>(null);
  const prevPageCountRef = useRef(0);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedBankQuery(bankQuery.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [bankQuery]);

  // Reset scroll position when filters change
  useEffect(() => {
    if (bankScrollRef.current) {
      bankScrollRef.current.scrollTop = 0;
    }
    prevPageCountRef.current = 0;
  }, [debouncedBankQuery, bankLength]);

  const { data: listData, isLoading } = useAdminMiniList({
    status: statusFilter || undefined,
  });
  const { data: summary } = useAdminMiniSummary();
  const autogen = useAdminAutogenerateMinis();
  const deleteMini = useAdminDeleteMini();

  const bankFilters = {
    q: debouncedBankQuery || undefined,
    length: bankLength ? Number(bankLength) : undefined,
  };
  const {
    data: bankData,
    items: bankItems,
    total: bankTotal,
    isLoading: bankLoading,
    isError: bankError,
    isFetchNextPageError: bankNextPageError,
    hasNextPage: bankHasNext,
    isFetchingNextPage: bankFetchingNext,
    fetchNextPage: fetchNextBankPage,
    refetch: refetchBank,
  } = useAdminClueBank(bankFilters);
  const addBank = useAdminAddClueBank();
  const updateBank = useAdminUpdateClueBank();
  const deleteBank = useAdminDeleteClueBank();
  const importBank = useAdminImportClueBank();
  const exportBank = useAdminExportClueBank();

  // Announce newly loaded pages via aria-live region
  const loadedPagesCount = bankData?.pages.length ?? 0;
  useEffect(() => {
    if (loadedPagesCount > 1 && loadedPagesCount > prevPageCountRef.current) {
      const lastPage = bankData?.pages[loadedPagesCount - 1];
      const added = lastPage?.results.length ?? 0;
      if (added > 0) {
        setLiveStatus(`Loaded ${added} more ${added === 1 ? "clue" : "clues"}`);
      }
    }
    prevPageCountRef.current = loadedPagesCount;
  }, [loadedPagesCount, bankData]);

  // Infinite scroll via IntersectionObserver rooted in the scroll container
  useEffect(() => {
    if (tab !== "clue_bank") return;
    const sentinel = bankSentinelRef.current;
    const rootEl = bankScrollRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!bankHasNext || bankFetchingNext || bankNextPageError) return;
        fetchNextBankPage();
      },
      { root: rootEl, rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tab, bankHasNext, bankFetchingNext, bankNextPageError, fetchNextBankPage]);

  const rows = listData?.results ?? [];

  const handleAutogen = () => {
    autogen.mutate(14, {
      onSuccess: (res) => {
        toast.success(
          `Auto-generate finished: ${res.created_count} draft(s) created, ${res.skipped_count} skipped.`
        );
      },
      onError: () => toast.error("Auto-generate failed."),
    });
  };

  const handleDelete = (id: number) => {
    deleteMini.mutate(id, {
      onSuccess: () => {
        toast.success("Mini crossword deleted.");
        setConfirmDeleteId(null);
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Could not delete mini crossword.");
        setConfirmDeleteId(null);
      },
    });
  };

  const handleAddClueBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim() || !newClue.trim()) return;
    addBank.mutate(
      {
        answer: newAnswer.trim().toUpperCase(),
        clue: newClue.trim(),
        story_slug: newStorySlug.trim() || undefined,
        is_name: newIsName,
      },
      {
        onSuccess: () => {
          toast.success("Clue added to bank.");
          setNewAnswer("");
          setNewClue("");
          setNewStorySlug("");
          setNewIsName(false);
          if (bankScrollRef.current) {
            bankScrollRef.current.scrollTop = 0;
          }
        },
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : "Failed to add clue."),
      }
    );
  };

  const handleImportCsv = () => {
    if (!csvText.trim()) return;
    importBank.mutate(csvText, {
      onSuccess: (res) => {
        toast.success(
          `Imported ${res.imported}, updated ${res.updated}, skipped ${res.skipped}.`
        );
        setCsvText("");
      },
      onError: () => toast.error("CSV import failed."),
    });
  };

  const handleExportCsv = () => {
    setExportError("");
    setExportStatus("");
    exportBank.mutate(bankFilters, {
      onSuccess: ({ blob, filename, rowCount }) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        const msg = `Exported ${rowCount} ${rowCount === 1 ? "clue" : "clues"}`;
        setExportStatus(msg);
        toast.success(msg);
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "CSV export failed.";
        setExportError(msg);
        toast.error(msg);
      },
    });
  };

  const hasActiveBankFilter = Boolean(debouncedBankQuery || bankLength);

  return (
    <div className="h-full overflow-y-auto pr-1 pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mini Crossword</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, validate, and schedule daily 5x5 literary mini crosswords.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutogen}
            disabled={autogen.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
          >
            {autogen.isPending ? (
              <RefreshCw
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            Auto-generate next 14 days
          </button>

          <Link
            to="/admin/games/mini-crossword/new"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New grid
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("schedule")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "schedule"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={() => setTab("clue_bank")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "clue_bank"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Clue bank
        </button>
      </div>

      {tab === "schedule" ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-600">Scheduled ahead</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                {summary?.scheduled_ahead_days ?? 0} days
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-600">Empty in next 14 days</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                {summary?.empty_in_next_14 ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-600">Average solve rate</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                {summary?.average_solve_rate ?? 0}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-600">Players today</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                {summary?.players_today ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
            {/* Schedule Table */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900"
                >
                  <option value="">All statuses</option>
                  <option value="live_today">Live today</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="auto">Auto</option>
                  <option value="draft">Draft</option>
                  <option value="empty">Empty</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">#</th>
                      <th className="px-3.5 py-2.5">Theme</th>
                      <th className="px-3.5 py-2.5">Level</th>
                      <th className="px-3.5 py-2.5">Clues filled</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          Loading schedule...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No dates match this filter.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const badge = STATUS_BADGES[row.status];
                        return (
                          <tr key={row.date} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-3.5 py-3 font-mono text-xs text-slate-900">
                              {row.date}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-3 font-mono text-xs text-slate-600">
                              {row.number ? `#${row.number}` : "—"}
                            </td>
                            <td className="max-w-[200px] truncate px-3.5 py-3 font-medium text-slate-900">
                              {row.title || <span className="text-slate-400">—</span>}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-3">
                              {row.difficulty ? (
                                <MiniDifficultyChip difficulty={row.difficulty} />
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-3 font-mono text-xs text-slate-700">
                              {row.filled_clues}
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3.5 py-3 text-right">
                              {row.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <Link
                                    to={`/admin/games/mini-crossword/${row.id}`}
                                    aria-label={`Edit mini crossword for ${row.date}`}
                                    className="rounded p-1.5 text-slate-700 hover:bg-slate-200"
                                  >
                                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                                  </Link>
                                  {confirmDeleteId === row.id ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(row.id!)}
                                      className="rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white hover:bg-red-800"
                                    >
                                      Confirm
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(row.id)}
                                      aria-label={`Delete mini crossword for ${row.date}`}
                                      className="rounded p-1.5 text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <Link
                                  to={`/admin/games/mini-crossword/new?date=${row.date}`}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                                >
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                  Create
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Needs Attention */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 self-start">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
              </div>

              {(summary?.needs_attention ?? []).length === 0 ? (
                <p className="text-xs text-slate-600">All next 14 days are approved.</p>
              ) : (
                <ul className="space-y-2">
                  {(summary?.needs_attention ?? []).slice(0, 10).map((item) => (
                    <li key={item.date}>
                      <Link
                        to={
                          item.puzzle_id
                            ? `/admin/games/mini-crossword/${item.puzzle_id}`
                            : `/admin/games/mini-crossword/new?date=${item.date}`
                        }
                        className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-900">
                            {item.date}
                          </span>
                          <span className="text-[11px] font-medium uppercase text-amber-800">
                            {item.reason}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-600">{item.label}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : (
        /* CLUE BANK TAB */
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={bankQuery}
                  onChange={(e) => setBankQuery(e.target.value)}
                  placeholder="Filter clue bank by answer or clue..."
                  aria-label="Filter clue bank"
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </div>

              <select
                value={bankLength}
                onChange={(e) => setBankLength(e.target.value as "" | "3" | "4" | "5")}
                aria-label="Filter by answer length"
                className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <option value="">All lengths</option>
                <option value="3">3 letters</option>
                <option value="4">4 letters</option>
                <option value="5">5 letters</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span data-testid="clue-bank-count">
                {bankLoading
                  ? "Loading clue bank..."
                  : `Showing ${bankItems.length} of ${bankTotal}`}
              </span>
              <span className="sr-only" aria-live="polite" role="status">
                {liveStatus}
              </span>
            </div>

            <div
              ref={bankScrollRef}
              data-testid="clue-bank-scroll"
              className="max-h-[70vh] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 bg-white"
            >
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <tr>
                    <th className="px-3.5 py-2.5">Answer</th>
                    <th className="px-3.5 py-2.5">Clue</th>
                    <th className="px-3.5 py-2.5">Story</th>
                    <th className="px-3.5 py-2.5">Name</th>
                    <th className="px-3.5 py-2.5">Used</th>
                    <th className="px-3.5 py-2.5 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bankLoading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={`skeleton-${idx}`} aria-hidden="true">
                        <td className="px-3.5 py-3">
                          <div className="h-4 w-14 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="h-4 w-48 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="h-4 w-24 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="h-4 w-4 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="h-4 w-6 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="ml-auto h-4 w-5 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
                        </td>
                      </tr>
                    ))
                  ) : bankError && bankItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <p className="text-sm font-medium text-red-700">
                          Could not load clue bank.
                        </p>
                        <button
                          type="button"
                          onClick={() => refetchBank()}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : bankItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-700">
                        <p>
                          {hasActiveBankFilter
                            ? "No clues match your filter"
                            : "No clues in the bank yet."}
                        </p>
                        {hasActiveBankFilter && (
                          <button
                            type="button"
                            onClick={() => {
                              setBankQuery("");
                              setDebouncedBankQuery("");
                              setBankLength("");
                            }}
                            className="mt-2 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                          >
                            Clear filter
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {bankItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3.5 py-2.5 font-mono text-xs font-bold text-slate-900">
                            {item.answer}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-800">{item.clue}</td>
                          <td className="px-3.5 py-2.5 text-xs text-slate-700">
                            {item.story_title || "—"}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <input
                              type="checkbox"
                              checked={Boolean(item.is_name)}
                              aria-label={`Mark ${item.answer} as proper name`}
                              onChange={(e) =>
                                updateBank.mutate({ id: item.id, is_name: e.target.checked })
                              }
                            />
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-xs text-slate-700">
                            {item.times_used}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                deleteBank.mutate(item.id, {
                                  onSuccess: () => toast.success("Clue removed."),
                                  onError: () => toast.error("Failed to remove clue."),
                                })
                              }
                              aria-label={`Delete clue for ${item.answer}`}
                              className="rounded p-1 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {bankFetchingNext && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-center text-xs text-slate-700">
                            <span className="inline-flex items-center gap-2">
                              <RefreshCw
                                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                                aria-hidden="true"
                              />
                              Loading more clues...
                            </span>
                          </td>
                        </tr>
                      )}

                      {bankNextPageError && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-center">
                            <span className="mr-3 text-xs font-medium text-red-700">
                              Failed to load more clues.
                            </span>
                            <button
                              type="button"
                              onClick={() => fetchNextBankPage()}
                              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                            >
                              Retry
                            </button>
                          </td>
                        </tr>
                      )}

                      {bankHasNext && !bankFetchingNext && !bankNextPageError && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => fetchNextBankPage()}
                              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                            >
                              Load more
                            </button>
                          </td>
                        </tr>
                      )}

                      {!bankHasNext && !bankFetchingNext && (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-center text-xs text-slate-600">
                            End of clue bank
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
              <div ref={bankSentinelRef} aria-hidden="true" className="h-1 w-full" />
            </div>
          </div>

          <div className="space-y-4">
            {/* Add single clue */}
            <form
              onSubmit={handleAddClueBank}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
            >
              <h2 className="text-sm font-semibold text-slate-900">Add clue</h2>
              <input
                type="text"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value.toUpperCase())}
                placeholder="Answer (3-5 letters, e.g. RAVEN)"
                maxLength={5}
                className="h-9 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
              <input
                type="text"
                value={newClue}
                onChange={(e) => setNewClue(e.target.value)}
                placeholder="Clue text"
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
              <input
                type="text"
                value={newStorySlug}
                onChange={(e) => setNewStorySlug(e.target.value)}
                placeholder="Optional story slug (e.g. the-raven)"
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={newIsName}
                  onChange={(e) => setNewIsName(e.target.checked)}
                />
                Proper name (is_name)
              </label>
              <button
                type="submit"
                disabled={addBank.isPending}
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                Add to clue bank
              </button>
            </form>

            {/* CSV Import & Export */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">CSV import &amp; export</h2>
              <p className="text-xs text-slate-700">
                Header: <code className="font-mono">answer,clue,story_slug,is_name</code> (
                <code className="font-mono">story_slug</code> and{" "}
                <code className="font-mono">is_name</code> optional)
              </p>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"answer,clue,story_slug\nRAVEN,Midnight visitor of Poe,the-raven"}
                className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleImportCsv}
                  disabled={importBank.isPending || !csvText.trim()}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {importBank.isPending ? "Importing..." : "Import CSV"}
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={exportBank.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
                >
                  {exportBank.isPending ? (
                    <RefreshCw
                      className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {exportBank.isPending ? "Exporting..." : "Export CSV"}
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Exported CSV files can be re-imported with the Import control.
              </p>
              <div aria-live="polite" role="status" className="min-h-[1rem]">
                {exportStatus && (
                  <p className="text-xs font-medium text-emerald-800">{exportStatus}</p>
                )}
                {exportError && (
                  <p className="text-xs font-medium text-red-700">{exportError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
