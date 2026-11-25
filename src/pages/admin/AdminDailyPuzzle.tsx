import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { PuzzleEditDrawer } from "@/components/admin/games/PuzzleEditDrawer";
import {
  useAdminPuzzles,
  useAdminPuzzleSummary,
  useAutofillPuzzles,
  useDeleteAdminPuzzle,
  useImportAdminBooksCsv,
  type AdminBookImportResult,
  type AdminPuzzleRow,
} from "@/lib/games/nameThatStory";

function utcIsoDate(offsetDays = 0): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

const STATUS_BADGE: Record<AdminPuzzleRow["status"], { label: string; className: string }> = {
  live_today: {
    label: "Live today",
    className: "border-emerald-300 bg-emerald-100 text-emerald-900",
  },
  scheduled: {
    label: "Scheduled",
    className: "border-blue-200 bg-blue-100 text-blue-900",
  },
  auto: {
    label: "Auto-filled",
    className: "border-neutral-300 bg-neutral-100 text-neutral-800",
  },
  empty: {
    label: "Empty",
    className: "border-amber-300 bg-amber-50 text-amber-900",
  },
};

export default function AdminDailyPuzzle() {
  const [dayOffset, setDayOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AdminPuzzleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPuzzleRow | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvResult, setCsvResult] = useState<AdminBookImportResult | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const fromDate = useMemo(() => utcIsoDate(dayOffset), [dayOffset]);
  const toDate = useMemo(() => utcIsoDate(dayOffset + 6), [dayOffset]);

  const { data: summary } = useAdminPuzzleSummary();
  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = useAdminPuzzles({
    from: fromDate,
    to: toDate,
    status: statusFilter,
    q: search,
  });
  const autofillMutation = useAutofillPuzzles();
  const deleteMutation = useDeleteAdminPuzzle();
  const importCsvMutation = useImportAdminBooksCsv();

  const rows = listData?.results ?? [];

  const handleAutofill = async () => {
    try {
      const res = await autofillMutation.mutateAsync(14);
      toast.success(`Auto-fill complete: created ${res.created.length}, skipped ${res.skipped.length}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not auto-fill puzzles.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Puzzle deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete puzzle.");
    }
  };

  return (
    <div className="h-full overflow-y-auto space-y-6 pr-1 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Daily Puzzle</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule opening lines for Name That Story, review solve rates, or auto-fill upcoming days.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCsvResult(null);
              setCsvDialogOpen(true);
            }}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Import books CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={autofillMutation.isPending}
            onClick={() => void handleAutofill()}
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            {autofillMutation.isPending ? "Auto-filling..." : "Auto-fill next 14 days"}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setEditingRow(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New puzzle
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Scheduled ahead</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {summary ? `${summary.scheduled_ahead_days} days` : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Empty in next 14 days</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {summary ? summary.empty_in_next_14 : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Average solve rate</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {summary ? `${summary.average_solve_rate}%` : "--"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Players today</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {summary ? summary.players_today : "--"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & 7-day range switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search
              className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search story or opening line..."
              aria-label="Search puzzles"
              className="pl-8"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="live_today">Live today</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="auto">Auto-filled</SelectItem>
              <SelectItem value="empty">Empty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDayOffset((d) => d - 7)}
            aria-label="Previous 7 days"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
            {fromDate} to {toDate}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDayOffset((d) => d + 7)}
            aria-label="Next 7 days"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* 7-day table */}
      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Could not load schedule.</p>
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3">#</th>
                <th className="px-4 py-3">Opening line</th>
                <th className="px-4 py-3">Story</th>
                <th className="px-3 py-3">Level</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => {
                const badge = STATUS_BADGE[row.status];
                return (
                  <tr key={row.date} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-foreground">{row.date}</td>
                    <td className="px-3 py-3 text-xs tabular-nums text-muted-foreground">
                      {row.number ? `#${row.number}` : "—"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-foreground">
                      {row.opening_line || <span className="text-muted-foreground">No puzzle scheduled</span>}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-xs font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{row.answer?.title || row.story?.title || "—"}</span>
                        {row.answer && !row.answer.in_catalogue && (
                          <span className="shrink-0 rounded-full border border-purple-200 bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-900">
                            External
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs capitalize text-muted-foreground">{row.difficulty || "—"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Actions for ${row.date}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditingRow(row);
                              setDrawerOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                            {row.id ? "Edit puzzle" : "Schedule puzzle"}
                          </DropdownMenuItem>
                          {row.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setDeleteTarget(row)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PuzzleEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editingRow={editingRow}
        defaultDate={editingRow?.date || utcIsoDate(0)}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scheduled puzzle</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the puzzle for <strong className="text-foreground">{deleteTarget?.date}</strong> (
              {deleteTarget?.answer?.title || deleteTarget?.story?.title})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV bulk import dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import external books (CSV)</DialogTitle>
            <DialogDescription>
              Upload a UTF-8 CSV with columns:{" "}
              <code className="text-[11px]">
                title, author_name, genres, country, original_published_year, length_label, cover_image_link
              </code>
              . Duplicates are skipped automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const res = await importCsvMutation.mutateAsync(file);
                  setCsvResult(res);
                  toast.success(`Imported ${res.created} book(s), skipped ${res.skipped}.`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "CSV import failed.");
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={importCsvMutation.isPending}
              onClick={() => csvInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {importCsvMutation.isPending ? "Importing..." : "Choose CSV file"}
            </Button>

            {csvResult && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  Created: {csvResult.created} · Skipped: {csvResult.skipped} · Errors: {csvResult.errors.length}
                </p>
                {csvResult.errors.length > 0 && (
                  <ul className="max-h-32 list-disc space-y-1 overflow-y-auto pl-4 text-destructive">
                    {csvResult.errors.map((err) => (
                      <li key={`${err.row}-${err.error}`}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCsvDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
