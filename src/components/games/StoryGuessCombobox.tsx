import { useEffect, useId, useRef, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchStories, type PuzzleSearchItem } from "@/lib/games/nameThatStory";

interface StoryGuessComboboxProps {
  guessedStoryIds: Set<number>;
  isSubmitting: boolean;
  onSubmitGuess: (story: PuzzleSearchItem) => void;
}

export function StoryGuessCombobox({ guessedStoryIds, isSubmitting, onSubmitGuess }: StoryGuessComboboxProps) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PuzzleSearchItem | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { data, isFetching } = useSearchStories(query);
  const results = data?.results ?? [];
  const showDropdown = open && query.trim().length >= 2 && !selected;

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results.length, query]);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const chooseStory = (story: PuzzleSearchItem) => {
    setSelected(story);
    setQuery(story.title);
    setOpen(false);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setOpen(false);
  };

  const alreadyGuessed = selected ? guessedStoryIds.has(selected.id) : false;
  const canSubmit = Boolean(selected && !alreadyGuessed && !isSubmitting);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!showDropdown) {
      if (event.key === "Enter" && canSubmit && selected) {
        event.preventDefault();
        onSubmitGuess(selected);
        clearSelection();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (results.length === 0 ? -1 : (prev + 1) % results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (results.length === 0 ? -1 : prev <= 0 ? results.length - 1 : prev - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        chooseStory(results[activeIndex]);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !selected) return;
    onSubmitGuess(selected);
    clearSelection();
  };

  const activeOptionId =
    showDropdown && activeIndex >= 0 && activeIndex < results.length
      ? `${listboxId}-opt-${results[activeIndex].id}`
      : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div ref={containerRef} className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            role="combobox"
            aria-label="Search for a story title"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onFocus={() => {
              if (query.trim().length >= 2 && !selected) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search a story title..."
            className="h-11 pl-9 pr-9"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {showDropdown && (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Matching stories"
              className="absolute left-0 right-0 top-12 z-30 max-h-72 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg"
            >
              {isFetching && results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">Searching stories...</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No story matches</p>
              ) : (
                results.map((story, idx) => {
                  const isHighlighted = idx === activeIndex;
                  const isUsed = guessedStoryIds.has(story.id);
                  return (
                    <button
                      key={story.id}
                      id={`${listboxId}-opt-${story.id}`}
                      type="button"
                      role="option"
                      aria-selected={isHighlighted}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => chooseStory(story)}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
                        isHighlighted ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {story.cover_thumb ? (
                        <img src={story.cover_thumb} alt="" className="h-10 w-8 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                          <BookOpen className="h-4 w-4" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{story.title}</p>
                        <p
                          className={`truncate text-xs ${
                            isHighlighted ? "text-accent-foreground/80" : "text-muted-foreground"
                          }`}
                        >
                          {story.author || "Unknown author"}
                          {isUsed ? " · Already guessed" : ""}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <Button type="submit" disabled={!canSubmit} className="h-11 px-6 font-semibold">
          {isSubmitting ? "Checking..." : "Guess"}
        </Button>
      </div>

      {alreadyGuessed && selected && (
        <p role="alert" className="text-xs font-medium text-amber-800 dark:text-amber-300">
          You already guessed {selected.title}. Pick a different story.
        </p>
      )}
    </form>
  );
}
