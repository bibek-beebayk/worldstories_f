import { useEffect, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminStorySearch } from "@/hooks/useAdminAudiobooks";
import type { AdminStorySearchItem } from "@/api/types";

interface StoryPickerProps {
  value: AdminStorySearchItem | null;
  onSelect: (story: AdminStorySearchItem) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StoryPicker({
  value,
  onSelect,
  onClear,
  placeholder = "Search stories by title or author...",
  disabled = false,
}: StoryPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: results = [], isFetching } = useAdminStorySearch(debouncedQuery, open && !disabled);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {value.cover ? (
            <img src={value.cover} alt="" className="h-10 w-8 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{value.title}</p>
            {value.author && <p className="truncate text-xs text-muted-foreground">{value.author}</p>}
          </div>
        </div>
        {onClear && !disabled && (
          <Button type="button" variant="ghost" size="icon" aria-label="Clear selected story" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 180);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="pl-8"
          aria-label="Search stories"
        />
      </div>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {isFetching && results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching stories...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matching stories found.</p>
          ) : (
            results.map((story) => (
              <button
                key={story.id}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(story);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {story.cover ? (
                    <img src={story.cover} alt="" className="h-9 w-7 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex h-9 w-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{story.title}</p>
                    {story.author && <p className="truncate text-xs text-muted-foreground">{story.author}</p>}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {story.audiobook_count} {story.audiobook_count === 1 ? "audiobook" : "audiobooks"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
