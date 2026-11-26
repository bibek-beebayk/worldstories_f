import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  List,
  LogIn,
  MoreVertical,
  Pencil,
  Play,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buildMeta } from "@/lib/buildMeta";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { getStoredGuestKey } from "@/lib/games/nameThatStory";
import {
  type ClueDirection,
  type MiniEntry,
  formatTimer,
  useCheck,
  useMiniMergeGuest,
  useMiniPuzzle,
  useMiniStats,
  useReveal,
  useSave,
  useStart,
  useSubmit,
} from "@/lib/games/miniCrossword";
import MiniCrosswordGrid from "@/components/games/MiniCrosswordGrid";
import MiniResultPanel from "@/components/games/MiniResultPanel";
import MiniDifficultyChip from "@/components/games/MiniDifficultyChip";

export function meta() {
  return buildMeta({
    title: "Mini Crossword — Daily 5x5 Puzzle | WorldStories",
    description:
      "Solve a daily 5x5 mini crossword on WorldStories. Free to play, archive included.",
    path: "/games/mini-crossword",
  });
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function entryCells(entry: MiniEntry): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < entry.length; i++) {
    out.push(
      entry.direction === "across" ? [entry.row, entry.col + i] : [entry.row + i, entry.col]
    );
  }
  return out;
}

function findEntryForCell(
  entries: MiniEntry[],
  r: number,
  c: number,
  dir: ClueDirection
): MiniEntry | null {
  const matchDir = entries.find(
    (e) => e.direction === dir && entryCells(e).some(([er, ec]) => er === r && ec === c)
  );
  if (matchDir) return matchDir;
  return (
    entries.find((e) => entryCells(e).some(([er, ec]) => er === r && ec === c)) ?? entries[0] ?? null
  );
}

function firstWhiteCell(pattern: string[]): [number, number] {
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      if (pattern[r][c] === ".") return [r, c];
    }
  }
  return [0, 0];
}

function isGridFull(pattern: string[], letters: string[]): boolean {
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < pattern[r].length; c++) {
      if (pattern[r][c] === ".") {
        const ch = letters[r]?.[c];
        if (!ch || ch === "." || ch === "#") return false;
      }
    }
  }
  return true;
}

export default function MiniCrossword() {
  const { date } = useParams<{ date?: string }>();
  const isLoggedIn = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const mergedOnceRef = useRef(false);

  const { data: puzzle, isLoading, isError } = useMiniPuzzle(date);
  const { data: stats } = useMiniStats();
  const startMutation = useStart(date);
  const { scheduleSave, flushSave } = useSave(date);
  const checkMutation = useCheck(date);
  const revealMutation = useReveal(date);
  const submitMutation = useSubmit(date);
  const mergeMutation = useMiniMergeGuest();

  const [letters, setLetters] = useState<string[]>([]);
  const [pencilLetters, setPencilLetters] = useState<Record<string, string>>({});
  const [pencilMode, setPencilMode] = useState(false);
  const [activeCell, setActiveCell] = useState<[number, number]>([0, 0]);
  const [direction, setDirection] = useState<ClueDirection>("across");
  const [wrongCells, setWrongCells] = useState<Array<[number, number]>>([]);
  const [notQuiteMsg, setNotQuiteMsg] = useState<string | null>(null);
  const [revealConfirmOpen, setRevealConfirmOpen] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);
  const [clueSheetOpen, setClueSheetOpen] = useState(false);
  const [clueSheetTab, setClueSheetTab] = useState<ClueDirection>("across");

  // Merge guest attempts once after login
  useEffect(() => {
    if (isLoggedIn && !mergedOnceRef.current && getStoredGuestKey()) {
      mergedOnceRef.current = true;
      mergeMutation.mutate();
    }
  }, [isLoggedIn, mergeMutation]);

  // Sync local grid state from server attempt
  useEffect(() => {
    if (!puzzle) return;
    if (puzzle.attempt?.letters && puzzle.attempt.letters.length === 5) {
      setLetters(puzzle.attempt.letters);
    } else {
      setLetters(puzzle.pattern);
    }
    const [r, c] = firstWhiteCell(puzzle.pattern);
    setActiveCell((prev) =>
      puzzle.pattern[prev[0]]?.[prev[1]] === "." ? prev : [r, c]
    );
  }, [puzzle?.date, puzzle?.attempt?.status, puzzle?.attempt?.letters]);

  // Live timer ticking from started_at (client-only)
  useEffect(() => {
    if (!puzzle?.attempt || puzzle.attempt.status === "solved") {
      if (puzzle?.attempt?.elapsed_seconds != null) {
        setElapsedTick(puzzle.attempt.elapsed_seconds);
      }
      return;
    }
    const startMs = Date.parse(puzzle.attempt.started_at);
    const update = () => {
      if (!Number.isNaN(startMs)) {
        setElapsedTick(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      }
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [puzzle?.attempt?.started_at, puzzle?.attempt?.status, puzzle?.attempt?.elapsed_seconds]);

  const revealedSet = useMemo(() => {
    const s = new Set<string>();
    for (const [r, c] of puzzle?.attempt?.revealed ?? []) {
      s.add(`${r},${c}`);
    }
    return s;
  }, [puzzle?.attempt?.revealed]);

  const wrongSet = useMemo(() => {
    const s = new Set<string>();
    for (const [r, c] of wrongCells) {
      s.add(`${r},${c}`);
    }
    return s;
  }, [wrongCells]);

  const entries = puzzle?.entries ?? [];
  const activeEntry = useMemo(
    () => findEntryForCell(entries, activeCell[0], activeCell[1], direction),
    [entries, activeCell, direction]
  );

  const activeClue = useMemo(() => {
    if (!activeEntry || !puzzle) return null;
    return (
      puzzle.clues.find(
        (c) => c.number === activeEntry.number && c.direction === activeEntry.direction
      ) ?? null
    );
  }, [activeEntry, puzzle]);

  const clearWrongAt = (r: number, c: number) => {
    setWrongCells((prev) => prev.filter(([wr, wc]) => !(wr === r && wc === c)));
  };

  const triggerAutoSubmit = useCallback(
    (nextLetters: string[]) => {
      if (!puzzle) return;
      if (isGridFull(puzzle.pattern, nextLetters)) {
        flushSave();
        submitMutation.mutate(nextLetters, {
          onSuccess: (res) => {
            if (!res.solved) {
              setNotQuiteMsg("Not quite yet: some letters are wrong");
            } else {
              setNotQuiteMsg(null);
            }
          },
        });
      }
    },
    [puzzle, flushSave, submitMutation]
  );

  const handleSelectCell = (r: number, c: number) => {
    if (!puzzle || puzzle.pattern[r]?.[c] !== ".") return;
    if (activeCell[0] === r && activeCell[1] === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setActiveCell([r, c]);
    }
  };

  const handleInputLetter = (letter: string) => {
    if (!puzzle || !puzzle.attempt || puzzle.attempt.status === "solved") return;
    const [r, c] = activeCell;
    const cellKey = `${r},${c}`;
    setNotQuiteMsg(null);

    if (pencilMode) {
      if (!revealedSet.has(cellKey)) {
        setPencilLetters((prev) => ({ ...prev, [cellKey]: letter }));
      }
      return;
    }

    let nextLetters = letters;
    if (!revealedSet.has(cellKey)) {
      nextLetters = letters.map((rowStr, ri) => {
        if (ri !== r) return rowStr;
        const chars = rowStr.split("");
        chars[c] = letter;
        return chars.join("");
      });
      setLetters(nextLetters);
      setPencilLetters((prev) => {
        if (!(cellKey in prev)) return prev;
        const copy = { ...prev };
        delete copy[cellKey];
        return copy;
      });
      clearWrongAt(r, c);
      scheduleSave(nextLetters);
    }

    // Advance within current entry
    if (activeEntry) {
      const cells = entryCells(activeEntry);
      const curIdx = cells.findIndex(([er, ec]) => er === r && ec === c);
      if (curIdx >= 0 && curIdx + 1 < cells.length) {
        setActiveCell(cells[curIdx + 1]);
      }
    }

    triggerAutoSubmit(nextLetters);
  };

  const handleBackspace = () => {
    if (!puzzle || !puzzle.attempt || puzzle.attempt.status === "solved") return;
    const [r, c] = activeCell;
    const cellKey = `${r},${c}`;
    setNotQuiteMsg(null);

    const curChar = letters[r]?.[c];
    const hasPen = curChar && curChar !== "." && curChar !== "#";

    if (pencilMode && pencilLetters[cellKey]) {
      setPencilLetters((prev) => {
        const copy = { ...prev };
        delete copy[cellKey];
        return copy;
      });
      return;
    }

    if (hasPen && !revealedSet.has(cellKey)) {
      const nextLetters = letters.map((rowStr, ri) => {
        if (ri !== r) return rowStr;
        const chars = rowStr.split("");
        chars[c] = ".";
        return chars.join("");
      });
      setLetters(nextLetters);
      clearWrongAt(r, c);
      scheduleSave(nextLetters);
      return;
    }

    // Move back in current entry and clear if not revealed
    if (activeEntry) {
      const cells = entryCells(activeEntry);
      const curIdx = cells.findIndex(([er, ec]) => er === r && ec === c);
      if (curIdx > 0) {
        const [pr, pc] = cells[curIdx - 1];
        setActiveCell([pr, pc]);
        const prevKey = `${pr},${pc}`;
        if (!revealedSet.has(prevKey)) {
          const nextLetters = letters.map((rowStr, ri) => {
            if (ri !== pr) return rowStr;
            const chars = rowStr.split("");
            chars[pc] = ".";
            return chars.join("");
          });
          setLetters(nextLetters);
          clearWrongAt(pr, pc);
          scheduleSave(nextLetters);
        }
      }
    }
  };

  const handleArrow = (dr: number, dc: number) => {
    if (!puzzle) return;
    let nr = activeCell[0] + dr;
    let nc = activeCell[1] + dc;
    while (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
      if (puzzle.pattern[nr][nc] === ".") {
        setActiveCell([nr, nc]);
        if (dr !== 0 && direction !== "down") setDirection("down");
        if (dc !== 0 && direction !== "across") setDirection("across");
        return;
      }
      nr += dr;
      nc += dc;
    }
  };

  const orderedEntries = useMemo(() => {
    const across = entries
      .filter((e) => e.direction === "across")
      .sort((a, b) => a.number - b.number);
    const down = entries
      .filter((e) => e.direction === "down")
      .sort((a, b) => a.number - b.number);
    return [...across, ...down];
  }, [entries]);

  const handleTabEntry = (delta: 1 | -1) => {
    if (!orderedEntries.length) return;
    const idx = activeEntry
      ? orderedEntries.findIndex(
          (e) => e.number === activeEntry.number && e.direction === activeEntry.direction
        )
      : 0;
    const nextIdx = (idx + delta + orderedEntries.length) % orderedEntries.length;
    const target = orderedEntries[nextIdx];
    setDirection(target.direction);
    setActiveCell([target.row, target.col]);
  };

  const isEntryFilled = useCallback(
    (entry: MiniEntry | undefined) => {
      if (!entry) return false;
      return entryCells(entry).every(([r, c]) => {
        const ch = letters[r]?.[c];
        return Boolean(ch && ch !== "." && ch !== "#");
      });
    },
    [letters]
  );

  const handleSelectClue = (entry: MiniEntry) => {
    setDirection(entry.direction);
    setActiveCell([entry.row, entry.col]);
  };

  const handleCheck = (scope: "word" | "grid") => {
    checkMutation.mutate(
      {
        scope,
        row: activeCell[0],
        col: activeCell[1],
        direction,
        letters,
      },
      {
        onSuccess: (res) => {
          setWrongCells(res.wrong);
        },
      }
    );
  };

  const handleConfirmReveal = () => {
    setRevealConfirmOpen(false);
    revealMutation.mutate(
      { row: activeCell[0], col: activeCell[1] },
      {
        onSuccess: (res) => {
          setLetters(res.letters);
          clearWrongAt(activeCell[0], activeCell[1]);
          triggerAutoSubmit(res.letters);
        },
      }
    );
  };

  const aboutSection = !date ? (
    <section
      aria-labelledby="mini-about-heading"
      className="mx-auto mt-10 max-w-5xl px-4 pb-8 md:px-0"
    >
      <div className="rounded-2xl border border-[#E8DED3] bg-white p-5 sm:p-6 space-y-3">
        <h2
          id="mini-about-heading"
          className="font-serif text-lg font-bold text-[#1B1220]"
        >
          About the Mini Crossword
        </h2>
        <p className="text-sm leading-relaxed text-[#1B1220]/85">
          Play a free daily 5x5 crossword crafted from classic public-domain literature. A new grid
          arrives every day at midnight UTC, with past puzzles available in the archive.{" "}
          <Link
            to="/library"
            className="font-semibold text-[#D92F4C] underline underline-offset-4 hover:text-[#b8253e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] rounded"
          >
            Find the stories behind the clues in our library.
          </Link>
        </p>
        <div className="space-y-1.5 pt-1">
          <h3 className="text-sm font-semibold text-[#1B1220]">How to play</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#1B1220]/85">
            <li>Tap a square and type to enter letters.</li>
            <li>Tap the selected square again to switch between across and down.</li>
            <li>Use Check, Reveal, and Pencil if you get stuck.</li>
            <li>Finish the grid to keep your daily streak.</li>
          </ul>
        </div>
      </div>
    </section>
  ) : null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-56 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
        <div className="mt-6 h-80 rounded-2xl bg-slate-100 animate-pulse motion-reduce:animate-none" />
        {aboutSection}
      </div>
    );
  }

  if (isError || !puzzle) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
        <h1 className="font-serif text-2xl font-bold text-slate-900">
          No Mini Crossword available for this date
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Check back soon or browse the archive of past grids.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/games"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Games
          </Link>
          <Link
            to="/games/mini-crossword/archive"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Past grids
          </Link>
        </div>
        <div className="text-left">{aboutSection}</div>
      </div>
    );
  }

  const isStarted = Boolean(puzzle.attempt);
  const isSolvedState = puzzle.attempt?.status === "solved";
  const acrossClues = puzzle.clues.filter((c) => c.direction === "across");
  const downClues = puzzle.clues.filter((c) => c.direction === "down");

  return (
    <div
      className={`mx-auto max-w-5xl md:px-6 md:py-8 lg:px-8 ${
        isStarted && !isSolvedState ? "pb-[176px] md:pb-8" : "pb-8"
      }`}
    >
      {puzzle.is_archive && (
        <div className="mx-3 mt-2 md:mx-0 md:mt-0 mb-2 md:mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
          <span>Archive grid — archive plays do not change your streak.</span>
          <Link
            to="/games/mini-crossword/archive"
            className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All past grids
          </Link>
        </div>
      )}

      {/* MOBILE SLIM TOP BAR (48px) */}
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-2 border-b border-[#E8DED3] bg-[#FBF7F2] px-1.5 md:hidden">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            to="/games"
            aria-label="Back to Games"
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-[#1B1220] hover:bg-[#E8DED3]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-base font-bold leading-tight text-[#1B1220]">
              Mini Crossword
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#1B1220]/75">
              <span className="font-mono">#{puzzle.number}</span>
              <span aria-hidden="true">·</span>
              <MiniDifficultyChip difficulty={puzzle.difficulty} />
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {isStarted && (
            <>
              <div className="inline-flex items-center gap-1 rounded-full border border-[#E8DED3] bg-white px-2.5 py-1 font-mono text-xs font-semibold text-[#1B1220] tabular-nums">
                <Clock className="h-3 w-3 text-[#1B1220]/70" aria-hidden="true" />
                <span>{formatTimer(elapsedTick)}</span>
              </div>
              {(puzzle.attempt?.hints_used ?? 0) > 0 && (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                  {puzzle.attempt?.hints_used}h
                </span>
              )}
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More puzzle actions"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#1B1220] hover:bg-[#E8DED3]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]"
              >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {isStarted && !isSolvedState && (
                <DropdownMenuItem
                  onSelect={() => handleCheck("grid")}
                  disabled={checkMutation.isPending}
                >
                  Check grid
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/games/mini-crossword/archive">Past grids</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/games">Games hub</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* DESKTOP HEADER (unchanged) */}
      <header className="hidden md:flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Mini #{puzzle.number}, {formatDisplayDate(puzzle.date)}
            </p>
            <MiniDifficultyChip difficulty={puzzle.difficulty} />
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold text-slate-900">
            {puzzle.title || "Mini Crossword"}
          </h1>
        </div>

        {isStarted && (
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-mono font-semibold text-slate-900 tabular-nums">
              <Clock className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>{formatTimer(elapsedTick)}</span>
            </div>
            {(puzzle.attempt?.hints_used ?? 0) > 0 && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950">
                {puzzle.attempt?.hints_used}{" "}
                {puzzle.attempt?.hints_used === 1 ? "hint" : "hints"}
              </span>
            )}
          </div>
        )}
      </header>

      {/* MOBILE GUEST BANNER (one line, dismissible, before start only) */}
      {!isLoggedIn && !isStarted && !guestBannerDismissed && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-950 md:hidden">
          <span className="truncate">
            Playing as guest ·{" "}
            <button
              type="button"
              onClick={() => openLoginModal()}
              className="font-semibold underline underline-offset-2"
            >
              Sign in
            </button>{" "}
            to save streak
          </span>
          <button
            type="button"
            aria-label="Dismiss guest notice"
            onClick={() => setGuestBannerDismissed(true)}
            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-amber-900 hover:bg-amber-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* DESKTOP GUEST BANNER (unchanged) */}
      {!isLoggedIn && (
        <div className="mt-4 hidden md:flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
          <p className="text-xs sm:text-sm">
            <span className="font-semibold">Playing as a guest.</span> Sign in to keep your streak
            and stats across devices.
          </p>
          <button
            type="button"
            onClick={() => openLoginModal()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            Sign in
          </button>
        </div>
      )}

      {/* START SCREEN (before attempt exists) */}
      {!isStarted && (
        <>
          {/* Mobile Start Screen */}
          <div className="px-3 pt-6 md:hidden">
            <div className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#E8DED3] bg-[#FBF7F2] p-5 text-center">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-45 blur-sm"
              >
                <div className="grid w-64 grid-cols-5 gap-[2px] border-2 border-[#1B1220] bg-[#1B1220]">
                  {puzzle.pattern.map((rowStr, r) =>
                    rowStr.split("").map((ch, c) => (
                      <div
                        key={`${r}-${c}`}
                        className={`aspect-square ${ch === "#" ? "bg-[#1B1220]" : "bg-white"}`}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="relative z-10 w-full max-w-xs rounded-2xl border border-[#E8DED3] bg-white/95 p-5 shadow-md space-y-3">
                <h2 className="font-serif text-xl font-bold text-[#1B1220]">
                  Ready for #{puzzle.number}?
                </h2>
                <p className="text-xs leading-relaxed text-[#1B1220]/80">
                  Tap a square, then type. Tap it again to switch between across and down. The timer
                  starts when you press Start.
                </p>
                <button
                  type="button"
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                  className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#D92F4C] px-5 text-base font-semibold text-white shadow-sm hover:bg-[#b8253e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B1220] disabled:opacity-60"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {startMutation.isPending ? "Starting..." : "Start puzzle"}
                </button>
                {!isLoggedIn && (
                  <p className="text-xs text-[#1B1220]/75">
                    Playing as guest.{" "}
                    <button
                      type="button"
                      onClick={() => openLoginModal()}
                      className="font-semibold text-[#D92F4C] underline underline-offset-2"
                    >
                      Sign in
                    </button>{" "}
                    to keep your streak.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Start Screen (unchanged) */}
          <div className="mt-8 hidden md:flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="relative">
              <div
                aria-hidden="true"
                className="grid w-56 grid-cols-5 gap-[2px] border-2 border-slate-900 bg-slate-900 blur-sm opacity-70"
              >
                {puzzle.pattern.map((rowStr, r) =>
                  rowStr.split("").map((ch, c) => (
                    <div
                      key={`${r}-${c}`}
                      className={`aspect-square ${ch === "#" ? "bg-slate-900" : "bg-white"}`}
                    />
                  ))
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {startMutation.isPending ? "Starting..." : "Start"}
                </button>
              </div>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-700">
              Timer starts when you press Start
            </p>
            <Link
              to="/games/mini-crossword/archive"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-950"
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Browse past grids
            </Link>
          </div>
        </>
      )}

      {/* SOLVED VIEW */}
      {isStarted && isSolvedState && (
        <>
          <div className="px-3 pt-4 md:hidden">
            <MiniResultPanel puzzle={puzzle} stats={stats} mobileSheet />
          </div>
          <div className="mt-6 hidden md:block">
            <MiniResultPanel puzzle={puzzle} stats={stats} />
          </div>
        </>
      )}

      {/* PLAY VIEW */}
      {isStarted && !isSolvedState && (
        <>
          {/* MOBILE STICKY ACTIVE CLUE BAR (directly under 48px top bar) */}
          <div
            aria-live="polite"
            className="sticky top-12 z-10 flex min-h-[56px] items-stretch bg-[#1B1220] text-white md:hidden"
          >
            <button
              type="button"
              aria-label="Previous clue"
              onClick={() => handleTabEntry(-1)}
              className="flex w-12 flex-shrink-0 items-center justify-center text-white/90 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D92F4C]"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setDirection((d) => (d === "across" ? "down" : "across"))}
              className="flex min-w-0 flex-1 flex-col justify-center px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D92F4C]"
            >
              {activeClue ? (
                <>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#F4728A]">
                    {activeClue.number} {activeClue.direction} ({activeClue.length})
                  </span>
                  <span className="font-serif text-[15px] leading-snug text-white">
                    {activeClue.clue}
                  </span>
                </>
              ) : (
                <span className="text-sm text-white/75">Select a cell to begin</span>
              )}
            </button>

            <button
              type="button"
              aria-label="Next clue"
              onClick={() => handleTabEntry(1)}
              className="flex w-12 flex-shrink-0 items-center justify-center text-white/90 active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D92F4C]"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="px-3 pt-2.5 md:px-0 md:pt-0 md:mt-6 grid gap-3 md:gap-6 lg:grid-cols-[380px_1fr]">
            {/* Left: Active Clue Bar (desktop) + Grid + Toolbar */}
            <div className="space-y-2.5 md:space-y-4">
              {/* Desktop Active Clue Bar */}
              <div
                aria-live="polite"
                className="hidden md:block rounded-xl bg-slate-900 px-4 py-3 text-white shadow-sm"
              >
                {activeClue ? (
                  <p className="text-sm leading-snug">
                    <span className="mr-2 font-mono text-xs font-bold uppercase text-slate-300">
                      {activeClue.number} {activeClue.direction} ({activeClue.length})
                    </span>
                    <span className="font-medium">{activeClue.clue}</span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-300">Select a cell to begin</p>
                )}
              </div>

              {/* Wrong-cells or Not-quite-yet notice */}
              {wrongCells.length > 0 && (
                <div
                  role="status"
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-900"
                >
                  {wrongCells.length} {wrongCells.length === 1 ? "letter is" : "letters are"} off
                </div>
              )}
              {notQuiteMsg && (
                <div
                  role="status"
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-950"
                >
                  {notQuiteMsg}
                </div>
              )}

              {/* Grid */}
              <MiniCrosswordGrid
                pattern={puzzle.pattern}
                numbering={puzzle.numbering}
                letters={letters.length === 5 ? letters : puzzle.pattern}
                pencilLetters={pencilLetters}
                revealedSet={revealedSet}
                wrongSet={wrongSet}
                activeCell={activeCell}
                direction={direction}
                activeEntry={activeEntry}
                onSelectCell={handleSelectCell}
                onInputLetter={handleInputLetter}
                onBackspace={handleBackspace}
                onArrow={handleArrow}
                onTabEntry={handleTabEntry}
                onToggleDirection={() =>
                  setDirection((d) => (d === "across" ? "down" : "across"))
                }
              />

              {/* Mobile Toolbar (4 equal buttons, >= 44px high) */}
              <div className="grid grid-cols-4 gap-1.5 md:hidden">
                <button
                  type="button"
                  onClick={() => handleCheck("word")}
                  disabled={checkMutation.isPending}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-[#E8DED3] bg-white px-2 text-[13px] font-semibold text-[#1B1220] active:bg-[#FBF7F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Check
                </button>
                <button
                  type="button"
                  onClick={() => setRevealConfirmOpen(true)}
                  disabled={revealMutation.isPending}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-[#E8DED3] bg-white px-2 text-[13px] font-semibold text-[#1B1220] active:bg-[#FBF7F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Reveal
                </button>
                <button
                  type="button"
                  aria-pressed={pencilMode}
                  onClick={() => setPencilMode((v) => !v)}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border px-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] ${
                    pencilMode
                      ? "border-[#D92F4C] bg-[#FDE6EB] text-[#A71B36]"
                      : "border-[#E8DED3] bg-white text-[#1B1220] active:bg-[#FBF7F2]"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Pencil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClueSheetTab(direction);
                    setClueSheetOpen(true);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-[#E8DED3] bg-white px-2 text-[13px] font-semibold text-[#1B1220] active:bg-[#FBF7F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C]"
                >
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                  Clues
                </button>
              </div>

              {/* Desktop Toolbar (unchanged) */}
              <div className="hidden md:flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCheck("word")}
                  disabled={checkMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Check word
                </button>
                <button
                  type="button"
                  onClick={() => handleCheck("grid")}
                  disabled={checkMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Check grid
                </button>
                <button
                  type="button"
                  onClick={() => setRevealConfirmOpen(true)}
                  disabled={revealMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Reveal letter
                </button>
                <button
                  type="button"
                  aria-pressed={pencilMode}
                  onClick={() => setPencilMode((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                    pencilMode
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Pencil {pencilMode ? "on" : "off"}
                </button>
              </div>
            </div>

            {/* Right: Across & Down Clue Lists + Streak Mini Pill (desktop only) */}
            <div className="hidden md:block space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <section aria-labelledby="across-clues-heading" className="space-y-2">
                  <h2
                    id="across-clues-heading"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Across
                  </h2>
                  <ul className="space-y-1">
                    {acrossClues.map((clue) => {
                      const isActive =
                        activeEntry?.number === clue.number &&
                        activeEntry?.direction === "across";
                      const entry = entries.find(
                        (e) => e.number === clue.number && e.direction === "across"
                      );
                      return (
                        <li key={`a-${clue.number}`}>
                          <button
                            type="button"
                            onClick={() => entry && handleSelectClue(entry)}
                            className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                              isActive
                                ? "bg-sky-100 font-semibold text-slate-950"
                                : "hover:bg-slate-100 text-slate-800"
                            }`}
                          >
                            <span className="w-5 flex-shrink-0 font-mono text-xs font-bold text-slate-600">
                              {clue.number}
                            </span>
                            <span className="flex-1">{clue.clue}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section aria-labelledby="down-clues-heading" className="space-y-2">
                  <h2
                    id="down-clues-heading"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Down
                  </h2>
                  <ul className="space-y-1">
                    {downClues.map((clue) => {
                      const isActive =
                        activeEntry?.number === clue.number && activeEntry?.direction === "down";
                      const entry = entries.find(
                        (e) => e.number === clue.number && e.direction === "down"
                      );
                      return (
                        <li key={`d-${clue.number}`}>
                          <button
                            type="button"
                            onClick={() => entry && handleSelectClue(entry)}
                            className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                              isActive
                                ? "bg-sky-100 font-semibold text-slate-950"
                                : "hover:bg-slate-100 text-slate-800"
                            }`}
                          >
                            <span className="w-5 flex-shrink-0 font-mono text-xs font-bold text-slate-600">
                              {clue.number}
                            </span>
                            <span className="flex-1">{clue.clue}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>

              {stats && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    Streak: {stats.current_streak} (Best: {stats.best_streak})
                  </span>
                  <Link
                    to="/games/mini-crossword/archive"
                    className="font-semibold text-slate-900 underline underline-offset-4"
                  >
                    Past grids
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Clue Bottom Sheet (~70dvh) */}
          <Sheet open={clueSheetOpen} onOpenChange={setClueSheetOpen}>
            <SheetContent
              side="bottom"
              className="flex h-[70dvh] flex-col rounded-t-2xl border-t border-[#E8DED3] bg-[#FBF7F2] p-0 motion-reduce:transition-none"
            >
              <SheetHeader className="border-b border-[#E8DED3] px-4 pt-4 pb-3 text-left">
                <SheetTitle className="font-serif text-lg font-bold text-[#1B1220]">
                  Clues
                </SheetTitle>
                <div className="mt-2 grid grid-cols-2 gap-2" role="tablist" aria-label="Clue direction">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={clueSheetTab === "across"}
                    onClick={() => setClueSheetTab("across")}
                    className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] ${
                      clueSheetTab === "across"
                        ? "bg-[#1B1220] text-white"
                        : "border border-[#E8DED3] bg-white text-[#1B1220]"
                    }`}
                  >
                    Across
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={clueSheetTab === "down"}
                    onClick={() => setClueSheetTab("down")}
                    className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] ${
                      clueSheetTab === "down"
                        ? "bg-[#1B1220] text-white"
                        : "border border-[#E8DED3] bg-white text-[#1B1220]"
                    }`}
                  >
                    Down
                  </button>
                </div>
              </SheetHeader>

              <ul className="flex-1 divide-y divide-[#E8DED3]/70 overflow-y-auto px-2 py-2">
                {(clueSheetTab === "across" ? acrossClues : downClues).map((clue) => {
                  const entry = entries.find(
                    (e) => e.number === clue.number && e.direction === clueSheetTab
                  );
                  const isActive =
                    activeEntry?.number === clue.number &&
                    activeEntry?.direction === clueSheetTab;
                  const filled = isEntryFilled(entry);
                  return (
                    <li key={`${clueSheetTab}-${clue.number}`}>
                      <button
                        type="button"
                        onClick={() => {
                          if (entry) handleSelectClue(entry);
                          setClueSheetOpen(false);
                        }}
                        className={`flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] ${
                          isActive
                            ? "bg-[#FDE6EB] font-semibold text-[#1B1220]"
                            : "text-[#1B1220] active:bg-[#E8DED3]/40"
                        }`}
                      >
                        <span className="w-6 flex-shrink-0 font-mono text-xs font-bold text-[#A71B36]">
                          {clue.number}
                        </span>
                        <span className={`flex-1 ${filled ? "line-through text-slate-500" : ""}`}>
                          {clue.clue}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </>
      )}

      {aboutSection}

      {/* Reveal Letter Confirm Dialog */}
      {revealConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reveal-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <h2 id="reveal-confirm-title" className="text-base font-bold text-slate-900">
              Reveal this letter?
            </h2>
            <p className="text-sm text-slate-700">
              Your result will be marked with a hint. Your streak is not affected.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevealConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReveal}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Reveal letter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
