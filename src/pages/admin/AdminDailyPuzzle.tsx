import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertTriangle,
  Copy,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PUZZLE_TYPE_META,
  type AdminPuzzleListItem,
  type AdminRowStatus,
  type PuzzleType,
  useAdminAutofill,
  useAdminDeletePuzzle,
  useAdminPuzzleSummary,
  useAdminPuzzles,
  useAdminRotation,
  useAdminSaveRotation,
} from "@/lib/games/nameThatStory";

const STATUS_BADGES: Record<AdminRowStatus, { label: string; cls: string }> = {
  live_today: { label: "Live today", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  scheduled: { label: "Scheduled", cls: "bg-slate-900 text-white border-slate-900" },
  auto: { label: "Auto", cls: "bg-sky-100 text-sky-900 border-sky-300" },
  draft: { label: "Draft", cls: "bg-amber-100 text-amber-950 border-amber-300" },
  empty: { label: "Empty", cls: "bg-slate-100 text-slate-600 border-slate-300" },
};

const PUZZLE_TYPE_OPTIONS: PuzzleType[] = ["opening_line", "quote", "trivia", "author_bio"];

export default function AdminDailyPuzzle() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [localRotation, setLocalRotation] = useState<
    Array<{ weekday: number; day_name: string; puzzle_type: PuzzleType }>
  >([]);

  const { data: listData, isLoading } = useAdminPuzzles({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    q: search.trim() || undefined,
  });
  const { data: summary } = useAdminPuzzleSummary();
  const { data: rotationData } = useAdminRotation();
  const saveRotation = useAdminSaveRotation();
  const autofill = useAdminAutofill();
  const deletePuzzle = useAdminDeletePuzzle();

  useEffect(() => {
    if (rotationData?.rotation) {
      setLocalRotation(
        rotationData.rotation.map((r) => ({
          weekday: r.weekday,
          day_name: r.day_name,
          puzzle_type: r.puzzle_type,
        }))
      );
    }
  }, [rotationData]);

  const rows = listData?.results ?? [];

  const handleAutofill = () => {
    autofill.mutate(14, {
      onSuccess: (res) => {
        toast.success(
          `Auto-fill finished: ${res.created_count} approved, ${res.drafted_count} drafted, ${res.skipped_empty_count} empty.`
        );
      },
      onError: () => toast.error("Auto-fill failed."),
    });
  };

  const handleSaveRotation = () => {
    saveRotation.mutate(
      localRotation.map((r) => ({ weekday: r.weekday, puzzle_type: r.puzzle_type })),
      {
        onSuccess: () => toast.success("Weekly rotation saved."),
        onError: () => toast.error("Could not save rotation."),
      }
    );
  };

  const handleDelete = (id: number) => {
    deletePuzzle.mutate(id, {
      onSuccess: () => {
        toast.success("Puzzle deleted.");
        setConfirmDeleteId(null);
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error && err.message ? err.message : "Could not delete puzzle.";
        toast.error(msg);
        setConfirmDeleteId(null);
      },
    });
  };

  const handleDuplicate = (row: AdminPuzzleListItem) => {
    if (!row.id) return;
    navigate(`/admin/games/daily-puzzle/new?duplicateFrom=${row.id}`);
  };

  return (
    <div className="h-full overflow-y-auto pr-1 pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Puzzle</h1>
          <p className="mt-1 text-sm text-slate-600">
            Schedule and review Name That Story clue ladders across the weekly rotation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutofill}
            disabled={autofill.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
          >
            {autofill.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            Auto-fill next 14 days
          </button>

          <Link
            to="/admin/games/daily-puzzle/new"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New puzzle
          </Link>
        </div>
      </div>

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

      {/* Main Grid: Table + Right Column */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Schedule Table */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search answer, clue, or date..."
                aria-label="Search puzzles"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <option value="">All statuses</option>
              <option value="live_today">Live today</option>
              <option value="scheduled">Scheduled</option>
              <option value="auto">Auto</option>
              <option value="draft">Draft</option>
              <option value="empty">Empty</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by puzzle type"
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <option value="">All types</option>
              {PUZZLE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {PUZZLE_TYPE_META[t].label}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">#</th>
                  <th className="px-3.5 py-2.5">Type</th>
                  <th className="px-3.5 py-2.5">Answer</th>
                  <th className="px-3.5 py-2.5">Clue 1</th>
                  <th className="px-3.5 py-2.5">Level</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      Loading schedule...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No dates match the current filters.
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
                        <td className="whitespace-nowrap px-3.5 py-3 text-xs font-medium text-slate-800">
                          {PUZZLE_TYPE_META[row.puzzle_type].label}
                        </td>
                        <td className="max-w-[160px] truncate px-3.5 py-3 font-medium text-slate-900">
                          {row.answer_label || (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="max-w-[200px] truncate px-3.5 py-3 text-xs text-slate-600">
                          {row.clue1_preview || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-3 text-xs capitalize text-slate-700">
                          {row.difficulty || "—"}
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
                                to={`/admin/games/daily-puzzle/${row.id}`}
                                aria-label={`Edit puzzle for ${row.date}`}
                                className="rounded p-1.5 text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                              >
                                <Edit3 className="h-4 w-4" aria-hidden="true" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(row)}
                                aria-label={`Duplicate puzzle from ${row.date}`}
                                className="rounded p-1.5 text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                              >
                                <Copy className="h-4 w-4" aria-hidden="true" />
                              </button>
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
                                  aria-label={`Delete puzzle for ${row.date}`}
                                  className="rounded p-1.5 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <Link
                              to={`/admin/games/daily-puzzle/new?date=${row.date}&type=${row.puzzle_type}`}
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

        {/* Right Column: Weekly Rotation + Needs Attention */}
        <div className="space-y-4">
          {/* Weekly Rotation */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Weekly rotation</h2>
              <p className="text-xs text-slate-600">
                Used by Auto-fill and the public This Week strip when a day is unscheduled.
              </p>
            </div>

            <div className="space-y-2">
              {localRotation.map((entry) => (
                <div key={entry.weekday} className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={`rot-day-${entry.weekday}`}
                    className="text-xs font-medium text-slate-800"
                  >
                    {entry.day_name}
                  </label>
                  <select
                    id={`rot-day-${entry.weekday}`}
                    value={entry.puzzle_type}
                    onChange={(e) => {
                      const val = e.target.value as PuzzleType;
                      setLocalRotation((prev) =>
                        prev.map((item) =>
                          item.weekday === entry.weekday
                            ? { ...item, puzzle_type: val }
                            : item
                        )
                      );
                    }}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    {PUZZLE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {PUZZLE_TYPE_META[t].label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveRotation}
              disabled={saveRotation.isPending}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
            >
              {saveRotation.isPending ? "Saving..." : "Save rotation"}
            </button>
          </section>

          {/* Needs Attention */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
            </div>

            {(summary?.needs_attention ?? []).length === 0 ? (
              <p className="text-xs text-slate-600">
                All next 14 days are reviewed and approved.
              </p>
            ) : (
              <ul className="space-y-2">
                {(summary?.needs_attention ?? []).slice(0, 10).map((item) => (
                  <li key={item.date}>
                    <Link
                      to={
                        item.puzzle_id
                          ? `/admin/games/daily-puzzle/${item.puzzle_id}`
                          : `/admin/games/daily-puzzle/new?date=${item.date}&type=${item.puzzle_type}`
                      }
                      className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
      </div>
    </div>
  );
}
