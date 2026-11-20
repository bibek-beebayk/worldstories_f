import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import type { AdminBlogTopic } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BLOG_NEEDS,
  BLOG_SORTS,
  hasActiveBlogFilters,
  type BlogListState,
  type BlogNeed,
  type BlogSort,
  type BlogStatusFilter,
} from "./blogList";

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: { value: BlogStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
];

interface BlogListFiltersProps {
  state: BlogListState;
  total: number;
  topicOptions: AdminBlogTopic[];
  onChange: (patch: Partial<BlogListState>) => void;
  onClear: () => void;
}

export const BlogListFilters = ({ state, total, topicOptions, onChange, onClear }: BlogListFiltersProps) => {
  const [input, setInput] = useState(state.q);

  useEffect(() => {
    setInput(state.q);
  }, [state.q]);

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === state.q) return;
    const timer = window.setTimeout(() => onChange({ q: trimmed }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input, state.q, onChange]);

  const toggleNeed = (need: BlogNeed) => {
    onChange({
      needs: state.needs.includes(need) ? state.needs.filter((value) => value !== need) : [...state.needs, need],
    });
  };

  const hasFilters = hasActiveBlogFilters(state);

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-xs">
          <Label htmlFor="admin-blog-search" className="sr-only">
            Search posts
          </Label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="admin-blog-search"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search posts"
            className="h-11 pl-9"
          />
        </div>

        <div role="group" aria-label="Status" className="grid grid-cols-4 gap-1 rounded-lg border p-0.5 sm:inline-grid">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={state.status === option.value}
              onClick={() => onChange({ status: option.value })}
              className={`min-h-11 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                state.status === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Select
            value={state.topic === null ? "all" : String(state.topic)}
            onValueChange={(value) => onChange({ topic: value === "all" ? null : Number(value) })}
          >
            <SelectTrigger className="h-11 w-full sm:w-[160px]" aria-label="Filter by topic">
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topicOptions.map((topic) => (
                <SelectItem key={topic.id} value={String(topic.id)}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={state.sort} onValueChange={(value) => onChange({ sort: value as BlogSort })}>
            <SelectTrigger className="h-11 w-full sm:w-[168px]" aria-label="Sort posts">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLOG_SORTS.map((sort) => (
                <SelectItem key={sort.value} value={sort.value}>
                  {sort.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Needs" className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Needs:</span>
          {BLOG_NEEDS.map((need) => {
            const active = state.needs.includes(need.key);
            return (
              <button
                key={need.key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleNeed(need.key)}
                className={`min-h-11 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {active ? "✓ " : ""}
                {need.label}
              </button>
            );
          })}
          {state.needs.includes("linked_stories") && (
            <button
              type="button"
              aria-pressed="true"
              onClick={() => toggleNeed("linked_stories")}
              className="min-h-11 rounded-full border border-primary bg-primary/10 px-3 text-xs font-medium text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              ✓ No linked stories
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-1 text-xs" onClick={onClear}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </Button>
          )}
          <p className="text-xs text-muted-foreground" aria-live="polite">
            <span className="font-semibold tabular-nums text-foreground">{total.toLocaleString()}</span>{" "}
            {total === 1 ? "post" : "posts"}
          </p>
        </div>
      </div>
    </div>
  );
};
