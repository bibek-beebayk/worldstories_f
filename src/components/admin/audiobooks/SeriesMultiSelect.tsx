import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AdminAudiobookSeries } from "@/api/types";

export interface SeriesItemDraft {
  series_id: number;
  order: number | null;
}

interface SeriesMultiSelectProps {
  seriesList: AdminAudiobookSeries[];
  value: SeriesItemDraft[];
  onChange: (next: SeriesItemDraft[]) => void;
  onRequestCreateSeries?: () => void;
  showOrderInputs?: boolean;
  disabled?: boolean;
}

export function SeriesMultiSelect({
  seriesList,
  value,
  onChange,
  onRequestCreateSeries,
  showOrderInputs = true,
  disabled = false,
}: SeriesMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const seriesById = useMemo(() => {
    const map = new Map<number, AdminAudiobookSeries>();
    seriesList.forEach((s) => map.set(s.id, s));
    return map;
  }, [seriesList]);

  const selectedIds = useMemo(() => new Set(value.map((item) => item.series_id)), [value]);

  const filteredSeries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return seriesList;
    return seriesList.filter((s) => s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
  }, [seriesList, search]);

  const toggleSeries = (seriesId: number) => {
    if (selectedIds.has(seriesId)) {
      onChange(value.filter((item) => item.series_id !== seriesId));
    } else {
      onChange([...value, { series_id: seriesId, order: null }]);
    }
  };

  const removeSeries = (seriesId: number) => {
    onChange(value.filter((item) => item.series_id !== seriesId));
  };

  const updateOrder = (seriesId: number, raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Math.max(0, Math.floor(Number(trimmed)));
    const nextOrder = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    onChange(value.map((item) => (item.series_id === seriesId ? { ...item, order: nextOrder } : item)));
  };

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select series"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-sm">
              {value.length === 0
                ? "Add to series..."
                : `${value.length} ${value.length === 1 ? "series" : "series"} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-2" align="start">
          <div className="relative mb-2">
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

          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {filteredSeries.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matching series</p>
            ) : (
              filteredSeries.map((s) => {
                const isSelected = selectedIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSeries(s.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate font-medium">{s.title}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>

          {onRequestCreateSeries && (
            <div className="mt-2 border-t pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start text-xs"
                onClick={() => {
                  setOpen(false);
                  onRequestCreateSeries();
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                New series...
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item) => {
            const meta = seriesById.get(item.series_id);
            const label = meta?.title ?? `Series #${item.series_id}`;
            return (
              <div
                key={item.series_id}
                className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{label}</span>
                {showOrderInputs && (
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`series-order-${item.series_id}`} className="text-[11px] text-muted-foreground">
                      Order
                    </label>
                    <Input
                      id={`series-order-${item.series_id}`}
                      type="number"
                      min={0}
                      placeholder="Auto"
                      value={item.order === null ? "" : String(item.order)}
                      onChange={(e) => updateOrder(item.series_id, e.target.value)}
                      disabled={disabled}
                      className="h-7 w-16 px-2 text-xs tabular-nums"
                      aria-label={`Order in ${label}`}
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => removeSeries(item.series_id)}
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
