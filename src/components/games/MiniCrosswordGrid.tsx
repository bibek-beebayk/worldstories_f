import { useEffect, useRef } from "react";
import { Delete, X } from "lucide-react";
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
        className="mx-auto grid w-full md:max-w-[340px] grid-cols-5 border-2 border-[#1B1220] bg-[#1B1220] gap-[1px] select-none"
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
                    className="aspect-square bg-[#1B1220]"
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
                bgClass = "bg-[#FDE6EB]";
              } else if (inWord) {
                bgClass = "bg-[#FDE6EB]/75";
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
                    className={`relative flex h-full w-full items-center justify-center ${bgClass} transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[#D92F4C] ${
                      isActive ? "z-10 ring-[3px] ring-inset ring-[#D92F4C]" : ""
                    }`}
                  >
                    {num !== null && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1 top-0.5 text-[11px] md:text-[10px] font-bold leading-none text-[#1B1220]/75"
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
                        className={`text-[clamp(1.6rem,7.5vw,2.2rem)] md:text-2xl font-bold leading-none ${
                          isWrong
                            ? "text-red-800"
                            : isRevealed
                            ? "text-amber-900"
                            : "text-[#1B1220]"
                        }`}
                      >
                        {penChar}
                      </span>
                    ) : pencilChar ? (
                      <span className="text-lg md:text-base italic font-medium leading-none text-slate-500">
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

      {/* Docked Mobile On-Screen Keyboard */}
      {!disabled && (
        <div
          aria-label="On-screen keyboard"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8DED3] bg-[#EFE7DE] px-1.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
        >
          <div className="mx-auto max-w-md space-y-1.5">
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1">
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => onInputLetter(letter)}
                    className="flex h-[46px] min-w-[30px] flex-1 max-w-[38px] items-center justify-center rounded-md border border-[#E8DED3] bg-white text-[15px] font-bold text-[#1B1220] shadow-xs active:bg-[#FDE6EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]"
                  >
                    {letter}
                  </button>
                ))}
                {rIdx === 2 && (
                  <button
                    type="button"
                    aria-label="Backspace"
                    onClick={onBackspace}
                    className="flex h-[46px] min-w-[52px] items-center justify-center rounded-md border border-[#E8DED3] bg-[#DFD5C9] px-2.5 text-[#1B1220] active:bg-[#CFC3B4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]"
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
