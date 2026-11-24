import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  AlertTriangle,
  ExternalLink,
  FolderPlus,
  Headphones,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminAudiobooks,
  useAdminAudiobookSeries,
  useAdminAudiobookStats,
  useCreateAdminAudiobookSeries,
  useDeleteAdminAudiobook,
  useDeleteAdminAudiobookSeries,
  useUpdateAdminAudiobookSeries,
} from "@/hooks/useAdminAudiobooks";
import { StatusChip } from "@/components/admin/audiobooks/StatusChip";
import { DeleteAudiobookDialog } from "@/components/admin/audiobooks/DeleteAudiobookDialog";
import { SeriesDialog } from "@/components/admin/audiobooks/SeriesDialog";
import { formatLong } from "@/lib/formatDuration";
import { audiobookUrl } from "@/lib/urls";
import type { AdminAudiobookListItem, AdminAudiobookSeries, AdminAudiobookStatus } from "@/api/types";

const BACKFILL_NOTICE_KEY = "ws_audiobook_backfill_notice_dismissed";

export default function AdminAudiobooks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") === "series" ? "series" : "audiobooks";
  const qParam = searchParams.get("q") ?? "";
  const storyLinkParam = (searchParams.get("story_link") ?? "all") as "all" | "linked" | "standalone";
  const seriesParam = searchParams.get("series") ?? "";
  const statusParam = (searchParams.get("status") ?? "") as "" | AdminAudiobookStatus;
  const orderingParam = searchParams.get("ordering") ?? "-updated_at";
  const pageParam = Math.max(1, Number(searchParams.get("page") || "1") || 1);

  const [searchInput, setSearchInput] = useState(qParam);
  const [noticeDismissed, setNoticeDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(BACKFILL_NOTICE_KEY) === "1";
  });

  const [deleteTarget, setDeleteTarget] = useState<AdminAudiobookListItem | null>(null);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<AdminAudiobookSeries | null>(null);
  const [deleteSeriesTarget, setDeleteSeriesTarget] = useState<AdminAudiobookSeries | null>(null);

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    if (searchInput.trim() === qParam.trim()) return;
    const timer = window.setTimeout(() => {
      updateParams({ q: searchInput.trim() || null, page: null });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || (key === "story_link" && value === "all")) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next, { replace: true });
  };

  const { data: stats } = useAdminAudiobookStats();
  const { data: seriesList = [], isLoading: seriesLoading } = useAdminAudiobookSeries();
  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = useAdminAudiobooks({
    page: pageParam,
    q: qParam,
    story_link: storyLinkParam,
    series: seriesParam,
    status: statusParam,
    ordering: orderingParam,
  });

  const deleteAudiobookMutation = useDeleteAdminAudiobook();
  const createSeriesMutation = useCreateAdminAudiobookSeries();
  const updateSeriesMutation = useUpdateAdminAudiobookSeries();
  const deleteSeriesMutation = useDeleteAdminAudiobookSeries();

  const audiobooks = listData?.results ?? [];
  const pagination = listData?.pagination;
  const totalCount = pagination?.count ?? audiobooks.length;
  const pageSize = pagination?.size ?? 20;
  const totalPages = pagination?.pages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageParam - 1) * pageSize + 1;
  const endRow = Math.min(totalCount, pageParam * pageSize);

  const dismissNotice = () => {
    setNoticeDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BACKFILL_NOTICE_KEY, "1");
    }
  };

  const handleDeleteAudiobook = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAudiobookMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Audiobook deleted", description: `"${deleteTarget.effective_title}" was removed.` });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: "Could not delete audiobook",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSeries = async (values: { title: string; slug: string; description: string }) => {
    try {
      if (editingSeries) {
        await updateSeriesMutation.mutateAsync({ id: editingSeries.id, payload: values });
        toast({ title: "Series updated" });
      } else {
        await createSeriesMutation.mutateAsync(values);
        toast({ title: "Series created" });
      }
      setSeriesDialogOpen(false);
      setEditingSeries(null);
    } catch (err) {
      toast({
        title: "Could not save series",
        description: err instanceof Error ? err.message : "Please check your inputs.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSeries = async () => {
    if (!deleteSeriesTarget) return;
    try {
      await deleteSeriesMutation.mutateAsync(deleteSeriesTarget.id);
      toast({
        title: "Series deleted",
        description: "Audiobooks in this series remain intact.",
      });
      setDeleteSeriesTarget(null);
    } catch (err) {
      toast({
        title: "Could not delete series",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const missingDurationCount = stats?.missing_duration ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Audiobooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage standalone and story-linked audiobooks, tracks, transcripts, and series.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => updateParams({ tab: "series" })}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Manage series
          </Button>
          <Button asChild>
            <Link to="/admin/audiobooks/new">
              <Plus className="mr-2 h-4 w-4" />
              New audiobook
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Audiobooks</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats ? stats.total : "--"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Standalone</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats ? stats.standalone : "--"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Series</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stats ? stats.series_count : "--"}</p>
          </CardContent>
        </Card>
        <Card
          className={
            missingDurationCount > 0 ? "border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30" : ""
          }
        >
          <CardContent className="p-4">
            <p
              className={`text-xs font-medium ${
                missingDurationCount > 0 ? "text-amber-900 dark:text-amber-200" : "text-muted-foreground"
              }`}
            >
              Missing duration
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                missingDurationCount > 0 ? "text-amber-900 dark:text-amber-100" : "text-foreground"
              }`}
            >
              {stats ? missingDurationCount : "--"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dismissible one-time backfill notice */}
      {!noticeDismissed && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <p>
            Existing story audio tracks have been grouped into audiobooks automatically. You can edit details, upload
            new standalone titles, or organize them into series here.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-blue-900 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900/50"
            onClick={dismissNotice}
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(value) => updateParams({ tab: value === "series" ? "series" : null })}>
        <TabsList>
          <TabsTrigger value="audiobooks">Audiobooks</TabsTrigger>
          <TabsTrigger value="series">Series ({seriesList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="audiobooks" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search title, author, narrator..."
                className="pl-8"
                aria-label="Search audiobooks"
              />
            </div>

            <Select value={storyLinkParam} onValueChange={(v) => updateParams({ story_link: v, page: null })}>
              <SelectTrigger className="w-[150px]" aria-label="Filter by link type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="linked">Linked to story</SelectItem>
                <SelectItem value="standalone">Standalone</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={seriesParam || "all"}
              onValueChange={(v) => updateParams({ series: v === "all" ? null : v, page: null })}
            >
              <SelectTrigger className="w-[170px]" aria-label="Filter by series">
                <SelectValue placeholder="All series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All series</SelectItem>
                {seriesList.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusParam || "all"}
              onValueChange={(v) => updateParams({ status: v === "all" ? null : v, page: null })}
            >
              <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={orderingParam} onValueChange={(v) => updateParams({ ordering: v, page: null })}>
              <SelectTrigger className="w-[160px]" aria-label="Sort audiobooks">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-updated_at">Recently updated</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="-duration">Longest first</SelectItem>
                <SelectItem value="duration">Shortest first</SelectItem>
                <SelectItem value="-tracks">Most tracks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <p className="text-sm font-medium text-foreground">Could not load audiobooks.</p>
                <Button type="button" variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 w-full animate-pulse rounded-md bg-muted" />
                ))}
              </CardContent>
            </Card>
          ) : audiobooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Headphones className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">No audiobooks found</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Try adjusting your filters or create a new audiobook.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link to="/admin/audiobooks/new">New audiobook</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Audiobook</th>
                    <th className="px-4 py-3">Story</th>
                    <th className="px-4 py-3">Series</th>
                    <th className="px-4 py-3 text-right">Tracks</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {audiobooks.map((ab) => {
                    const durationLabel = formatLong(ab.total_duration_seconds);
                    const publicPath = audiobookUrl(ab.slug);
                    return (
                      <tr key={ab.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link to={`/admin/audiobooks/${ab.id}`} className="flex items-center gap-3 group">
                            {ab.cover ? (
                              <img src={ab.cover} alt="" className="h-11 w-11 shrink-0 rounded object-cover" />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                                <Headphones className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground group-hover:underline">
                                {ab.effective_title || ab.title}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[ab.author_name, ab.narrator ? `Narrated by ${ab.narrator}` : ""]
                                  .filter(Boolean)
                                  .join(" · ") || "No author set"}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {ab.story ? (
                            <span className="inline-flex max-w-[180px] items-center truncate rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                              {ab.story.title}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-900 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-200">
                              Standalone
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {ab.series ? <span className="text-foreground">{ab.series.title}</span> : <span>—</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">{ab.track_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium tabular-nums text-foreground">
                              {durationLabel || "—"}
                            </span>
                            {ab.missing_duration_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                                <AlertTriangle className="h-3 w-3" />
                                Duration missing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={ab.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Actions for ${ab.effective_title || ab.title}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => navigate(`/admin/audiobooks/${ab.id}`)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={publicPath} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View on site
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setDeleteTarget(ab)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Showing {startRow} to {endRow} of {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pageParam <= 1}
                    onClick={() => updateParams({ page: String(pageParam - 1) })}
                  >
                    Previous
                  </Button>
                  <span className="tabular-nums">
                    Page {pageParam} of {Math.max(1, totalPages)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pageParam >= totalPages}
                    onClick={() => updateParams({ page: String(pageParam + 1) })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Series tab */}
        <TabsContent value="series" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Organize multi-part audiobooks into named series.</p>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingSeries(null);
                setSeriesDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New series
            </Button>
          </div>

          {seriesLoading ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
              </CardContent>
            </Card>
          ) : seriesList.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No audiobook series yet. Create one to group related audiobooks.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Audiobooks</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {seriesList.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{s.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.slug}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">
                        {s.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{s.audiobook_count}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit ${s.title}`}
                            onClick={() => {
                              setEditingSeries(s);
                              setSeriesDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Delete ${s.title}`}
                            onClick={() => setDeleteSeriesTarget(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Audiobook Dialog */}
      <DeleteAudiobookDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteTarget?.effective_title || deleteTarget?.title || ""}
        trackCount={deleteTarget?.track_count ?? 0}
        hasLinkedStory={Boolean(deleteTarget?.story)}
        isDeleting={deleteAudiobookMutation.isPending}
        onConfirm={handleDeleteAudiobook}
      />

      {/* Create/Edit Series Dialog */}
      <SeriesDialog
        open={seriesDialogOpen}
        onOpenChange={(open) => {
          setSeriesDialogOpen(open);
          if (!open) setEditingSeries(null);
        }}
        editingSeries={editingSeries}
        isSaving={createSeriesMutation.isPending || updateSeriesMutation.isPending}
        onSubmit={handleSaveSeries}
      />

      {/* Delete Series Dialog */}
      <Dialog
        open={Boolean(deleteSeriesTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteSeriesTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete series</DialogTitle>
            <DialogDescription>
              Delete <strong className="text-foreground">{deleteSeriesTarget?.title}</strong>? The audiobooks in this
              series will stay intact and simply be removed from the series.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteSeriesTarget(null)}
              disabled={deleteSeriesMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSeries}
              disabled={deleteSeriesMutation.isPending}
            >
              {deleteSeriesMutation.isPending ? "Deleting..." : "Delete series"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
