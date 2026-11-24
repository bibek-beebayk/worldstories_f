import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  GripVertical,
  Headphones,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useAddAudiobooksToSeries,
  useAdminSeries,
  useRemoveAudiobooksFromSeries,
  useReorderSeries,
  useUpdateAdminAudiobookSeries,
} from "@/hooks/useAdminAudiobooks";
import { AddAudiobooksToSeriesDialog } from "@/components/admin/audiobooks/AddAudiobooksToSeriesDialog";
import { StatusChip } from "@/components/admin/audiobooks/StatusChip";
import { formatLong } from "@/lib/formatDuration";

export default function AdminAudiobookSeriesDetail() {
  const { id } = useParams();
  const seriesId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: series, isLoading, isError, refetch } = useAdminSeries(seriesId);
  const updateSeriesMutation = useUpdateAdminAudiobookSeries();
  const addAudiobooksMutation = useAddAudiobooksToSeries(seriesId);
  const removeAudiobooksMutation = useRemoveAudiobooksFromSeries(seriesId);
  const reorderMutation = useReorderSeries(seriesId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmRemoveIds, setConfirmRemoveIds] = useState<number[] | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  useEffect(() => {
    if (series) {
      setTitle(series.title);
      setDescription(series.description ?? "");
    }
  }, [series]);

  const audiobooks = useMemo(() => series?.audiobooks ?? [], [series]);

  useEffect(() => {
    // Drop selected IDs that are no longer in the series
    const present = new Set(audiobooks.map((ab) => ab.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<number>();
      prev.forEach((itemId) => {
        if (present.has(itemId)) {
          next.add(itemId);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [audiobooks]);

  const isMetaDirty = Boolean(series && (title.trim() !== series.title || description !== (series.description ?? "")));

  const allSelected = audiobooks.length > 0 && audiobooks.every((ab) => selectedIds.has(ab.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(audiobooks.map((ab) => ab.id)));
    }
  };

  const toggleOne = (audiobookId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(audiobookId)) {
        next.delete(audiobookId);
      } else {
        next.add(audiobookId);
      }
      return next;
    });
  };

  const handleSaveMeta = async () => {
    if (!series || !title.trim()) {
      toast({
        title: "Title is required",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateSeriesMutation.mutateAsync({
        id: series.id,
        payload: { title: title.trim(), description },
      });
      toast({ title: "Series saved" });
    } catch (err) {
      toast({
        title: "Could not save series",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddAudiobooks = async (audiobookIds: number[]) => {
    try {
      const res = await addAudiobooksMutation.mutateAsync(audiobookIds);
      setAddDialogOpen(false);
      toast({
        title: "Audiobooks added to series",
        description:
          res.skipped > 0
            ? `Added ${res.added}, skipped ${res.skipped} already in this series.`
            : `Added ${res.added} audiobook(s).`,
      });
    } catch (err) {
      toast({
        title: "Could not add audiobooks",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemoveIds || confirmRemoveIds.length === 0) return;
    try {
      const res = await removeAudiobooksMutation.mutateAsync(confirmRemoveIds);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        confirmRemoveIds.forEach((removedId) => next.delete(removedId));
        return next;
      });
      setConfirmRemoveIds(null);
      toast({
        title: "Removed from series",
        description: `Removed ${res.removed} audiobook(s). The audiobooks themselves were kept.`,
      });
    } catch (err) {
      toast({
        title: "Could not remove audiobooks",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const commitOrder = async (nextIds: number[]) => {
    try {
      await reorderMutation.mutateAsync(nextIds);
      toast({ title: "Series order updated" });
    } catch (err) {
      toast({
        title: "Could not reorder series",
        description: err instanceof Error ? err.message : "Restored previous order.",
        variant: "destructive",
      });
    }
  };

  const moveByOffset = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= audiobooks.length) return;
    const ids = audiobooks.map((ab) => ab.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);
    void commitOrder(ids);
  };

  const handleDropOn = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = audiobooks.map((ab) => ab.id);
    const fromIndex = ids.indexOf(draggedId);
    const toIndex = ids.indexOf(targetId);
    setDraggedId(null);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, moved);
    void commitOrder(ids);
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto space-y-4 pr-1 pb-8">
        <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (isError || !series) {
    return (
      <div className="h-full overflow-y-auto pr-1 pb-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-foreground">Could not load this series.</p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/admin/audiobooks?tab=series">Back to series</Link>
              </Button>
              <Button type="button" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 pr-1 pb-8">
      {/* Header & Breadcrumb */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/admin/audiobooks" className="hover:text-foreground hover:underline">
              Audiobooks
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link to="/admin/audiobooks?tab=series" className="hover:text-foreground hover:underline">
              Series
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate text-foreground">{series.title}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{series.title}</h1>
            <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-foreground">
              {audiobooks.length} {audiobooks.length === 1 ? "audiobook" : "audiobooks"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add audiobooks
          </Button>
        </div>
      </div>

      {/* Series details card */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <div className="space-y-1.5">
              <Label htmlFor="series-detail-title">Title</Label>
              <Input
                id="series-detail-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Series title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="series-detail-description">Description</Label>
              <Textarea
                id="series-detail-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional description shown on the site..."
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted-foreground">Slug: {series.slug}</span>
            <Button
              type="button"
              size="sm"
              disabled={!isMetaDirty || updateSeriesMutation.isPending}
              onClick={() => void handleSaveMeta()}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {updateSeriesMutation.isPending ? "Saving..." : "Save details"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk selection bar */}
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Series selection actions"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 px-4 py-2.5"
        >
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirmRemoveIds(Array.from(selectedIds))}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Remove {selectedIds.size} from series
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Ordered audiobooks list */}
      {audiobooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Headphones className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">No audiobooks in this series yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add audiobooks to arrange them in order on the public audiobooks page.
              </p>
            </div>
            <Button type="button" size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add audiobooks
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all audiobooks in series"
                  />
                </th>
                <th className="w-24 px-3 py-3">Order</th>
                <th className="px-4 py-3">Audiobook</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {audiobooks.map((ab, index) => {
                const isSelected = selectedIds.has(ab.id);
                const durationLabel = formatLong(ab.total_duration_seconds);
                return (
                  <tr
                    key={ab.id}
                    draggable
                    onDragStart={() => setDraggedId(ab.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOn(ab.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className={`transition-colors hover:bg-muted/30 ${draggedId === ab.id ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(ab.id)}
                        aria-label={`Select ${ab.title}`}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <span
                          className="cursor-grab text-muted-foreground active:cursor-grabbing"
                          aria-hidden="true"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums text-foreground">
                          {ab.order}
                        </span>
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === 0 || reorderMutation.isPending}
                            onClick={() => moveByOffset(index, -1)}
                            aria-label={`Move ${ab.title} up`}
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === audiobooks.length - 1 || reorderMutation.isPending}
                            onClick={() => moveByOffset(index, 1)}
                            aria-label={`Move ${ab.title} down`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/audiobooks/${ab.id}`} className="group flex items-center gap-3">
                        {ab.cover ? (
                          <img src={ab.cover} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                            <Headphones className="h-4 w-4" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground group-hover:underline">{ab.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[ab.author_name, ab.narrator ? `Narrated by ${ab.narrator}` : ""]
                              .filter(Boolean)
                              .join(" · ") || "No author set"}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-foreground">{durationLabel || "—"}</td>
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
                            aria-label={`Actions for ${ab.title}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/admin/audiobooks/${ab.id}`)}>
                            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                            Open audiobook
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => setConfirmRemoveIds([ab.id])}
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                            Remove from series
                          </DropdownMenuItem>
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

      {/* Add audiobooks dialog */}
      <AddAudiobooksToSeriesDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        seriesId={series.id}
        seriesTitle={series.title}
        isSubmitting={addAudiobooksMutation.isPending}
        onSubmit={handleAddAudiobooks}
      />

      {/* Confirm remove dialog */}
      <Dialog
        open={Boolean(confirmRemoveIds && confirmRemoveIds.length > 0)}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveIds(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove from series</DialogTitle>
            <DialogDescription>
              Remove {confirmRemoveIds?.length ?? 0}{" "}
              {(confirmRemoveIds?.length ?? 0) === 1 ? "audiobook" : "audiobooks"} from{" "}
              <strong className="text-foreground">{series.title}</strong>? The audiobooks themselves will be kept and
              will remain in any other series they belong to.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRemoveIds(null)}
              disabled={removeAudiobooksMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmRemove()}
              disabled={removeAudiobooksMutation.isPending}
            >
              {removeAudiobooksMutation.isPending ? "Removing..." : "Remove from series"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
