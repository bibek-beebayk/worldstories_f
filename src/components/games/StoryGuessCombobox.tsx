import { useEffect, useId, useRef, useState } from "react";
import { Search, SkipForward } from "lucide-react";
import {
  type AnswerKind,
  type AuthorSearchResult,
  type SearchResultItem,
  type StorySearchResult,
  useSearch,
} from "@/lib/games/nameThatStory";

interface StoryGuessComboboxProps {
  puzzleDate: string;
  answerKind: AnswerKind;
  guessedIds: Set<number>;
  disabled?: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmitGuess: (targetId: number) => void;
  onSkip: () => void;
}

function isAuthorResult(
  item: SearchResultItem,
  kind: AnswerKind
): item is AuthorSearchResult {
  return kind === "author" || "name" in item;
}

function getItemLabel(item: SearchResultItem, kind: AnswerKind): string {
  return isAuthorResult(item, kind) ? item.name : (item as StorySearchResult).title;
}

function getItemSubtitle(item: SearchResultItem, kind: AnswerKind): string {
  return isAuthorResult(item, kind) ? item.subtitle : (item as StorySearchResult).author;
}

export default function StoryGuessCombobox({
  puzzleDate,
  answerKind,
  guessedIds,
  disabled = false,
  isSubmitting = false,
  errorMessage = null,
  onSubmitGuess,
  onSkip,
}: StoryGuessComboboxProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchResultItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data, isFetching } = useSearch(query, puzzleDate, answerKind);
  const results = data?.results ?? [];
  const effectiveKind = data?.kind ?? answerKind;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (results.length > 0 && activeIndex >= results.length) {
      setActiveIndex(0);
    }
  }, [results.length, activeIndex]);

  const selectItem = (item: SearchResultItem) => {
    const label = getItemLabel(item, effectiveKind);
    if (guessedIds.has(item.id)) {
      setDuplicateNotice(`You already guessed ${label}.`);
      setSelected(null);
      setIsOpen(false);
      return;
    }
    setDuplicateNotice(null);
    setSelected(item);
    setQuery(label);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    setSelected(null);
    setDuplicateNotice(null);
    setIsOpen(val.trim().length >= 2);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && query.trim().length >= 2) {
        setIsOpen(true);
      }
      if (results.length > 0) {
        setActiveIndex((prev) => (prev + 1) % results.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      }
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        selectItem(results[activeIndex]);
      } else if (selected && !disabled && !isSubmitting) {
        e.preventDefault();
        handleSubmit();
      } else {
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleSubmit = () => {
    if (!selected || disabled || isSubmitting) return;
    if (guessedIds.has(selected.id)) {
      setDuplicateNotice(`You already guessed ${getItemLabel(selected, effectiveKind)}.`);
      return;
    }
    onSubmitGuess(selected.id);
    setQuery("");
    setSelected(null);
    setDuplicateNotice(null);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const placeholder = answerKind === "author" ? "Search authors" : "Search stories";
  const showDropdown = isOpen && query.trim().length >= 2;
  const activeOptionId =
    showDropdown && activeIndex >= 0 && results[activeIndex]
      ? `${listboxId}-opt-${results[activeIndex].id}`
      : undefined;

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            aria-label={placeholder}
            value={query}
            disabled={disabled || isSubmitting}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2 && !selected) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
          />

          {showDropdown && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label={answerKind === "author" ? "Author suggestions" : "Story suggestions"}
              className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            >
              {isFetching && results.length === 0 ? (
                <li className="px-3 py-3 text-sm text-slate-600">Searching...</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-3 text-sm text-slate-600">No match</li>
              ) : (
                results.map((item, idx) => {
                  const label = getItemLabel(item, effectiveKind);
                  const subtitle = getItemSubtitle(item, effectiveKind);
                  const already = guessedIds.has(item.id);
                  const isActive = idx === activeIndex;

                  return (
                    <li
                      key={item.id}
                      id={`${listboxId}-opt-${item.id}`}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectItem(item);
                      }}
                      className={`flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-2 text-left text-sm ${
                        isActive ? "bg-slate-100" : "bg-white hover:bg-slate-50"
                      } ${already ? "opacity-60" : ""}`}
                    >
                      {isAuthorResult(item, effectiveKind) ? (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-800">
                          {item.initials || "?"}
                        </div>
                      ) : item.cover_thumb ? (
                        <img
                          src={item.cover_thumb}
                          alt=""
                          className="h-10 w-7 flex-shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-7 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-[10px] font-semibold text-slate-700">
                          WS
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{label}</p>
                        {subtitle && (
                          <p className="truncate text-xs text-slate-600">{subtitle}</p>
                        )}
                      </div>

                      {already && (
                        <span className="flex-shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          Guessed
                        </span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected || disabled || isSubmitting}
          className="h-11 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          {isSubmitting ? "Checking..." : "Guess"}
        </button>
      </div>

      {(duplicateNotice || errorMessage) && (
        <p role="alert" className="text-sm font-medium text-amber-800">
          {duplicateNotice || errorMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled || isSubmitting}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 underline decoration-slate-400 underline-offset-4 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded disabled:opacity-50"
        >
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          Skip this guess
        </button>
        <span className="text-xs text-slate-600">
          Uses 1 guess and unlocks the next clue immediately.
        </span>
      </div>
    </div>
  );
}
