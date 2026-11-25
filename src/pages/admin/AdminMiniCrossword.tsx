import { useState } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
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
  useAdminImportClueBank,
  useAdminMiniList,
  useAdminMiniSummary,
} from "@/lib/games/miniCrossword";

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
  const [newAnswer, setNewAnswer] = useState("");
  const [newClue, setNewClue] = useState("");
  const [newStorySlug, setNewStorySlug] = useState("");
  const [csvText, setCsvText] = useState("");

  const { data: listData, isLoading } = useAdminMiniList({
    status: statusFilter || undefined,
  });
  const { data: summary } = useAdminMiniSummary();
  const autogen = useAdminAutogenerateMinis();
  const deleteMini = useAdminDeleteMini();

  const { data: bankData, isLoading: bankLoading } = useAdminClueBank(bankQuery.trim() || undefined);
  const addBank = useAdminAddClueBank();
  const deleteBank = useAdminDeleteClueBank();
  const importBank = useAdminImportClueBank();

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
      },
      {
        onSuccess: () => {
          toast.success("Clue added to bank.");
          setNewAnswer("");
          setNewClue("");
          setNewStorySlug("");
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
                      <th className="px-3.5 py-2.5">Clues filled</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Loading schedule...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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
          <div className="space-y-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={bankQuery}
                onChange={(e) => setBankQuery(e.target.value)}
                placeholder="Filter clue bank by answer or clue..."
                aria-label="Filter clue bank"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5">Answer</th>
                    <th className="px-3.5 py-2.5">Clue</th>
                    <th className="px-3.5 py-2.5">Story</th>
                    <th className="px-3.5 py-2.5">Used</th>
                    <th className="px-3.5 py-2.5 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bankLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        Loading clue bank...
                      </td>
                    </tr>
                  ) : (bankData?.results ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No clues found.
                      </td>
                    </tr>
                  ) : (
                    (bankData?.results ?? []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-3.5 py-2.5 font-mono text-xs font-bold text-slate-900">
                          {item.answer}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-800">{item.clue}</td>
                        <td className="px-3.5 py-2.5 text-xs text-slate-600">
                          {item.story_title || "—"}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-slate-600">
                          {item.times_used}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              deleteBank.mutate(item.id, {
                                onSuccess: () => toast.success("Clue removed."),
                              })
                            }
                            aria-label={`Delete clue for ${item.answer}`}
                            className="rounded p-1 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                className="h-9 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase text-slate-900"
              />
              <input
                type="text"
                value={newClue}
                onChange={(e) => setNewClue(e.target.value)}
                placeholder="Clue text"
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
              />
              <input
                type="text"
                value={newStorySlug}
                onChange={(e) => setNewStorySlug(e.target.value)}
                placeholder="Optional story slug (e.g. the-raven)"
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900"
              />
              <button
                type="submit"
                disabled={addBank.isPending}
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Add to clue bank
              </button>
            </form>

            {/* CSV Import */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">CSV import</h2>
              <p className="text-xs text-slate-600">
                Header: <code className="font-mono">answer,clue,story_slug</code>
              </p>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"answer,clue,story_slug\nRAVEN,Midnight visitor of Poe,the-raven"}
                className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-xs text-slate-900"
              />
              <button
                type="button"
                onClick={handleImportCsv}
                disabled={importBank.isPending || !csvText.trim()}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {importBank.isPending ? "Importing..." : "Import CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
