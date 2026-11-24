import { useMemo, useState } from "react";
import { FolderMinus, FolderPlus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AdminAudiobookSeries } from "@/api/types";

const MAX_BULK_SERIES = 20;

interface BulkSeriesPopoverProps {
  mode: "add" | "remove";
  selectedCount: number;
  seriesList: AdminAudiobookSeries[];
  isPending?: boolean;
  disabled?: boolean;
  onApply: (seriesIds: number[]) => Promise<void> | void;
  onRequestCreateSeries?: () => void;
}

export function BulkSeriesPopover({
  mode,
  selectedCount,
  seriesList,
  isPending = false,
  disabled = false,
  onApply,
  onRequestCreateSeries,
}: BulkSeriesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  const filteredSeries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return seriesList;
    return seriesList.filter((s) => s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
  }, [seriesList, search]);

  const toggleSeries = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_BULK_SERIES) {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
      setCheckedIds(new Set());
    }
  };

  const handleApply = async () => {
    if (checkedIds.size === 0) return;
    await onApply(Array.from(checkedIds));
    handleOpenChange(false);
  };

  const label = mode === "add" ? "Add to series" : "Remove from series";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled || isPending}>
          {mode === "add" ? (
            <FolderPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <FolderMinus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          )}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2.5">
          <div>
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground">
              {mode === "add"
                ? `Add ${selectedCount} selected audiobook(s) to the chosen series.`
                : `Remove ${selectedCount} selected audiobook(s) from the chosen series.`}
            </p>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search series..."
              aria-label="Search series"
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {filteredSeries.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No series found</p>
            ) : (
              filteredSeries.map((s) => {
                const isChecked = checkedIds.has(s.id);
                const disableUnchecked = !isChecked && checkedIds.size >= MAX_BULK_SERIES;
                return (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent ${
                      disableUnchecked ? "opacity-50" : ""
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={disableUnchecked}
                      onCheckedChange={() => toggleSeries(s.id)}
                      aria-label={s.title}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{s.title}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{s.audiobook_count}</span>
                  </label>
                );
              })
            )}
          </div>

          {checkedIds.size >= MAX_BULK_SERIES && (
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Maximum of {MAX_BULK_SERIES} series per bulk action.
            </p>
          )}

          {mode === "add" && onRequestCreateSeries && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start px-2 text-xs"
              onClick={() => {
                setOpen(false);
                onRequestCreateSeries();
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              New series...
            </Button>
          )}

          <div className="flex items-center justify-end gap-2 border-t pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={checkedIds.size === 0 || isPending}
              onClick={() => void handleApply()}
            >
              {isPending ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
