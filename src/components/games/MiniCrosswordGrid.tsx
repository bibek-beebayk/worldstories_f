import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Delete, X } from "lucide-react";
import type { ClueDirection, MiniEntry } from "@/lib/games/miniCrossword";

interface MiniCrosswordGridProps {
  pattern: string[];
  numbering: Array<Array<number | null>>;
  letters: string[];
  pencilLetters: Record<string, string>;
  revealedSet: Set<string>;
  wrongSet: Set<string>;
  activeCell: [number, number];
  direction: ClueDirection;
  activeEntry: MiniEntry | null;
  disabled?: boolean;
  onSelectCell: (r: number, c: number) => void;
  onInputLetter: (letter: string) => void;
  onBackspace: () => void;
  onArrow: (dr: number, dc: number) => void;
  onTabEntry: (delta: 1 | -1) => void;
  onToggleDirection: () => void;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

function isCellInEntry(r: number, c: number, entry: MiniEntry | null): boolean {
  if (!entry) return false;
  if (entry.direction === "across") {
    return r === entry.row && c >= entry.col && c < entry.col + entry.length;
  }
  return c === entry.col && r >= entry.row && r < entry.row + entry.length;
}

export default function MiniCrosswordGrid({
  pattern,
  numbering,
  letters,
  pencilLetters,
  revealedSet,
  wrongSet,
  activeCell,
  direction,
  activeEntry,
  disabled = false,
  onSelectCell,
  onInputLetter,
  onBackspace,
  onArrow,
  onTabEntry,
  onToggleDirection,
}: MiniCrosswordGridProps) {
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (disabled) return;
    const key = `${activeCell[0]},${activeCell[1]}`;
    const btn = cellRefs.current[key];
    if (btn && document.activeElement !== btn && document.activeElement?.getAttribute("data-mini-cell") === "true") {
      btn.focus();
    }
  }, [activeCell, disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      onInputLetter(e.key.toUpperCase());
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onBackspace();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onArrow(-1, 0);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onArrow(1, 0);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onArrow(0, -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onArrow(0, 1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      onTabEntry(e.shiftKey ? -1 : 1);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onToggleDirection();
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="grid"
        aria-label="5 by 5 mini crossword grid"
        className="mx-auto grid w-full max-w-[340px] grid-cols-5 border-2 border-slate-900 bg-slate-900 gap-[1px] select-none"
      >
        {pattern.map((rowStr, r) => (
          <div key={r} role="row" className="contents">
            {rowStr.split("").map((ch, c) => {
              const cellKey = `${r},${c}`;
              const isBlack = ch === "#";
              if (isBlack) {
                return (
                  <div
                    key={cellKey}
                    role="gridcell"
                    aria-label={`Row ${r + 1}, Column ${c + 1}, black square`}
                    className="aspect-square bg-slate-900"
                  />
                );
              }

              const num = numbering[r]?.[c] ?? null;
              const penChar = letters[r]?.[c];
              const hasPen = penChar && penChar !== "." && penChar !== "#";
              const pencilChar = !hasPen ? pencilLetters[cellKey] || "" : "";
              const isRevealed = revealedSet.has(cellKey);
              const isWrong = wrongSet.has(cellKey);
              const isActive = activeCell[0] === r && activeCell[1] === c;
              const inWord = isCellInEntry(r, c, activeEntry);

              const ariaValue = hasPen
                ? penChar
                : pencilChar
                ? `pencil ${pencilChar}`
                : "empty";
              const ariaLabel = [
                `Row ${r + 1}, Column ${c + 1}`,
                num ? `clue ${num}` : null,
                isRevealed ? `revealed ${ariaValue}` : ariaValue,
                isWrong ? "incorrect" : null,
                isActive ? `selected ${direction}` : null,
              ]
                .filter(Boolean)
                .join(", ");

              let bgClass = "bg-white";
              if (isWrong) {
                bgClass = "bg-red-50";
              } else if (isActive) {
                bgClass = "bg-sky-200";
              } else if (inWord) {
                bgClass = "bg-sky-50";
              }

              return (
                <div key={cellKey} role="gridcell" className="relative aspect-square">
                  <button
                    ref={(el) => {
                      cellRefs.current[cellKey] = el;
                    }}
                    type="button"
                    data-mini-cell="true"
                    disabled={disabled}
                    aria-label={ariaLabel}
                    aria-pressed={isActive}
                    onClick={() => onSelectCell(r, c)}
                    onKeyDown={handleKeyDown}
                    className={`relative flex h-full w-full items-center justify-center ${bgClass} transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900 ${
                      isActive ? "z-10 ring-2 ring-inset ring-slate-900" : ""
                    }`}
                  >
                    {num !== null && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1 top-0.5 text-[10px] font-bold leading-none text-slate-700"
                      >
                        {num}
                      </span>
                    )}

                    {isRevealed && (
                      <span
                        aria-hidden="true"
                        title="Revealed letter"
                        className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-600"
                      />
                    )}

                    {isWrong && (
                      <X
                        aria-hidden="true"
                        className="pointer-events-none absolute right-0.5 top-0.5 h-3 w-3 text-red-700"
                      />
                    )}

                    {hasPen ? (
                      <span
                        className={`text-2xl font-bold leading-none ${
                          isWrong
                            ? "text-red-800"
                            : isRevealed
                            ? "text-amber-900"
                            : "text-slate-900"
                        }`}
                      >
                        {penChar}
                      </span>
                    ) : pencilChar ? (
                      <span className="text-base italic font-medium leading-none text-slate-500">
                        {pencilChar}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile On-Screen Keyboard & Prev/Next Clue Controls */}
      {!disabled && (
        <div className="space-y-2 md:hidden" aria-label="On-screen keyboard">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onTabEntry(-1)}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 active:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Prev clue
            </button>
            <button
              type="button"
              onClick={onToggleDirection}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 active:bg-slate-100"
            >
              {direction === "across" ? "Across" : "Down"}
            </button>
            <button
              type="button"
              onClick={() => onTabEntry(1)}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 active:bg-slate-100"
            >
              Next clue
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-1.5">
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1">
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => onInputLetter(letter)}
                    className="flex min-h-[46px] min-w-[33px] flex-1 max-w-[40px] items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-bold text-slate-900 shadow-xs active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    {letter}
                  </button>
                ))}
                {rIdx === 2 && (
                  <button
                    type="button"
                    aria-label="Backspace"
                    onClick={onBackspace}
                    className="flex min-h-[46px] min-w-[46px] items-center justify-center rounded-md border border-slate-300 bg-slate-200 px-2 text-slate-900 active:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    <Delete className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
