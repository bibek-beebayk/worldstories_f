import { useEffect, useState, type RefObject } from "react";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  STATUS_LABEL,
  STORY_NEEDS,
  STORY_SORTS,
  hasActiveListFilters,
  missingParts,
  storyStatus,
  type StatusFilter,
  type StoryListState,
  type StoryNeed,
  type StorySort,
} from "./storyList";

export interface StoryListItem {
  id: number;
  title: string;
  slug: string;
  is_published: boolean;
  publish_at: string | null;
  source: "admin" | "submission";
  chapter_count: number;
  audio_count: number;
  video_count: number;
  summary: string | null;
  retrospective: string | null;
  cover_image_url?: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
];

const STATUS_DOT: Record<"published" | "draft" | "scheduled", string> = {
  published: "bg-emerald-500",
  draft: "bg-amber-500",
  scheduled: "bg-violet-500",
};

// A coloured tile with the title's first letter, for stories that have no cover.
const TILE_COLORS = [
  "bg-rose-200 text-rose-900",
  "bg-sky-200 text-sky-900",
  "bg-amber-200 text-amber-900",
  "bg-emerald-200 text-emerald-900",
  "bg-violet-200 text-violet-900",
];

export const CoverThumb = ({ url, title, className }: { url?: string | null; title: string; className: string }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (url && !failed) {
    return (
      <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className={`${className} object-cover`} />
    );
  }
  const letter = (title.trim()[0] || "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`${className} flex items-center justify-center font-bold ${TILE_COLORS[letter.charCodeAt(0) % TILE_COLORS.length]}`}
    >
      {letter}
    </span>
  );
};

export const StatusLabel = ({ status }: { status: "published" | "draft" | "scheduled" }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-medium">
    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
    {STATUS_LABEL[status]}
  </span>
);

const AdminStoryRow = ({
  item,
  selected,
  onSelect,
}: {
  item: StoryListItem;
  selected: boolean;
  onSelect: () => void;
}) => {
  const status = storyStatus(item);
  const missing = missingParts(item);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full min-h-[76px] gap-3 rounded-md border p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected ? "border-primary bg-primary/5" : ""
      }`}
    >
      <CoverThumb url={item.cover_image_url} title={item.title} className="h-[60px] w-[44px] shrink-0 rounded-sm" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-medium leading-5 break-words">{item.title}</span>
        <span className="block truncate text-xs text-muted-foreground">/{item.slug}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusLabel status={status} />
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.source === "submission" ? "Submission" : "Admin"}
          </span>
        </span>
        {missing.length > 0 && (
          <span className="mt-1 inline-block rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            Missing: {missing.join(", ")}
          </span>
        )}
      </span>
    </button>
  );
};

/**
 * The left column of the admin Stories page: search, the New / bulk-update
 * buttons, the status and "Needs" filters, the count and sort, and the rows.
 * Filter state lives in the URL (the parent owns it); this only edits it.
 */
const StoryListPanel = ({
  state,
  onChange,
  onClear,
  total,
  items,
  loading,
  loadingMore,
  hasMore,
  selectedId,
  onSelect,
  onNew,
  onBulkUpdate,
  loadMoreRef,
}: {
  state: StoryListState;
  onChange: (patch: Partial<StoryListState>) => void;
  onClear: () => void;
  total: number;
  items: StoryListItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onBulkUpdate: () => void;
  loadMoreRef: RefObject<HTMLDivElement>;
}) => {
  // Typed locally, written to the URL after a pause.
  const [input, setInput] = useState(state.q);
  useEffect(() => setInput(state.q), [state.q]);
  useEffect(() => {
    const next = input.trim();
    if (next === state.q) return;
    const timer = window.setTimeout(() => onChange({ q: next }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input, state.q, onChange]);

  const toggleNeed = (need: StoryNeed) =>
    onChange({
      needs: state.needs.includes(need) ? state.needs.filter((value) => value !== need) : [...state.needs, need],
    });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Label htmlFor="admin-story-search" className="sr-only">
            Search title or slug
          </Label>
          <Input
            id="admin-story-search"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search title or slug"
            className="h-11"
          />
        </div>
        <Button type="button" className="h-11 px-4" onClick={onNew}>
          New
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-11 px-0"
          onClick={onBulkUpdate}
          aria-label="Bulk update tags, themes, genres and categories"
          title="Bulk update tags, themes, genres and categories"
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div role="group" aria-label="Status" className="grid grid-cols-4 gap-1 rounded-lg border p-0.5">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={state.status === option.value}
            onClick={() => onChange({ status: option.value })}
            className={`min-h-11 rounded-md px-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              state.status === option.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Needs" className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Needs:</span>
        {STORY_NEEDS.map((need) => (
          <button
            key={need.key}
            type="button"
            aria-pressed={state.needs.includes(need.key)}
            onClick={() => toggleNeed(need.key)}
            className={`min-h-11 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              state.needs.includes(need.key)
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {state.needs.includes(need.key) ? "✓ " : ""}
            {need.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          <span className="font-semibold text-foreground">{total.toLocaleString()}</span>{" "}
          {total === 1 ? "story" : "stories"}
        </p>
        <Select value={state.sort} onValueChange={(value) => onChange({ sort: value as StorySort })}>
          <SelectTrigger className="h-11 w-[140px]" aria-label="Sort stories">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STORY_SORTS.map((sort) => (
              <SelectItem key={sort.value} value={sort.value}>
                {sort.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin rounded-md border p-2">
        {loading && <p className="text-sm text-muted-foreground">Loading stories...</p>}
        {items.map((item) => (
          <AdminStoryRow
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={() => onSelect(item.id)}
          />
        ))}
        {items.length === 0 && !loading && (
          <div className="py-8 text-center">
            <p className="text-sm font-medium">
              {hasActiveListFilters(state) ? "No stories match these filters" : "No stories yet"}
            </p>
            {hasActiveListFilters(state) && (
              <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={onClear}>
                Clear filters
              </Button>
            )}
          </div>
        )}
        <div ref={loadMoreRef} className="h-1" />
        {loadingMore && <p className="text-center text-xs text-muted-foreground">Loading more...</p>}
        {!hasMore && items.length > 0 && <p className="text-center text-xs text-muted-foreground">End of list</p>}
      </div>
    </div>
  );
};

export default StoryListPanel;
