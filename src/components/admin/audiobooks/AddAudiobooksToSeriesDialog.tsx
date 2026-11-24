import { useEffect, useState } from "react";
import { Headphones, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminAudiobooks } from "@/hooks/useAdminAudiobooks";

interface AddAudiobooksToSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: number;
  seriesTitle: string;
  isSubmitting?: boolean;
  onSubmit: (audiobookIds: number[]) => Promise<void> | void;
}

export function AddAudiobooksToSeriesDialog({
  open,
  onOpenChange,
  seriesId,
  seriesTitle,
  isSubmitting = false,
  onSubmit,
}: AddAudiobooksToSeriesDialogProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [hideExisting, setHideExisting] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setDebouncedQuery("");
      setHideExisting(true);
      setPage(1);
      setSelectedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useAdminAudiobooks({
    page,
    q: debouncedQuery,
    exclude_series: hideExisting ? String(seriesId) : undefined,
    ordering: "title",
  });

  const results = data?.results ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.pages ?? 1;

  const allLoadedSelected = results.length > 0 && results.every((ab) => selectedIds.has(ab.id));

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAllLoaded = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allLoadedSelected) {
        results.forEach((ab) => next.delete(ab.id));
      } else {
        results.forEach((ab) => next.add(ab.id));
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;
    await onSubmit(Array.from(selectedIds));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Add audiobooks to {seriesTitle}</DialogTitle>
          <DialogDescription>
            Search and select audiobooks to append to this series. Your selection stays intact as you search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search audiobooks by title, author, narrator..."
                aria-label="Search audiobooks to add"
                className="pl-8"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="hide-existing-in-series"
                checked={hideExisting}
                onCheckedChange={(checked) => {
                  setHideExisting(checked);
                  setPage(1);
                }}
              />
              <Label htmlFor="hide-existing-in-series" className="cursor-pointer text-xs">
                Hide audiobooks already in this series
              </Label>
            </div>
          </div>

          {results.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleToggleAllLoaded}
              >
                {allLoadedSelected ? `Deselect all ${results.length} results` : `Select all ${results.length} results`}
              </Button>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <span className="tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-h-[220px] flex-1 overflow-y-auto rounded-md border">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">Could not load audiobooks.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No audiobooks match your search.</div>
          ) : (
            <div className="divide-y">
              {results.map((ab) => {
                const isChecked = selectedIds.has(ab.id);
                const otherSeries = (ab.series ?? []).filter((s) => s.id !== seriesId);
                return (
                  <label
                    key={ab.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleOne(ab.id)}
                      aria-label={`Select ${ab.effective_title || ab.title}`}
                    />
                    {ab.cover ? (
                      <img src={ab.cover} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                        <Headphones className="h-4 w-4" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{ab.effective_title || ab.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[ab.author_name, ab.narrator ? `Narrated by ${ab.narrator}` : ""]
                          .filter(Boolean)
                          .join(" · ") || "No author set"}
                      </p>
                      {otherSeries.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {otherSeries.slice(0, 3).map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex max-w-[140px] items-center truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                            >
                              {s.title}
                            </span>
                          ))}
                          {otherSeries.length > 3 && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              +{otherSeries.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <span className="text-xs font-medium text-muted-foreground">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedIds.size === 0 || isSubmitting}
              onClick={() => void handleConfirm()}
            >
              {isSubmitting
                ? "Adding..."
                : `Add ${selectedIds.size} ${selectedIds.size === 1 ? "audiobook" : "audiobooks"}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
