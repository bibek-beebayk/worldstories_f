import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Eye,
  Flame,
  LogIn,
  Pencil,
  Play,
} from "lucide-react";
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

export function meta() {
  return buildMeta({
    title: "Mini Crossword — Daily 5x5 Literary Puzzle | WorldStories",
    description:
      "Solve a daily 5x5 literary mini crossword on WorldStories. Free to play, archive included.",
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

  const handleTabEntry = (delta: 1 | -1) => {
    if (!entries.length) return;
    const idx = activeEntry
      ? entries.findIndex(
          (e) => e.number === activeEntry.number && e.direction === activeEntry.direction
        )
      : 0;
    const nextIdx = (idx + delta + entries.length) % entries.length;
    const target = entries[nextIdx];
    setDirection(target.direction);
    setActiveCell([target.row, target.col]);
  };

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-56 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
        <div className="mt-6 h-80 rounded-2xl bg-slate-100 animate-pulse motion-reduce:animate-none" />
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
      </div>
    );
  }

  const isStarted = Boolean(puzzle.attempt);
  const isSolvedState = puzzle.attempt?.status === "solved";
  const acrossClues = puzzle.clues.filter((c) => c.direction === "across");
  const downClues = puzzle.clues.filter((c) => c.direction === "down");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {puzzle.is_archive && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
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

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Mini #{puzzle.number}, {formatDisplayDate(puzzle.date)}
          </p>
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

      {/* Guest Banner */}
      {!isLoggedIn && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
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
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
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
      )}

      {/* SOLVED VIEW */}
      {isStarted && isSolvedState && (
        <div className="mt-6">
          <MiniResultPanel puzzle={puzzle} stats={stats} />
        </div>
      )}

      {/* PLAY VIEW */}
      {isStarted && !isSolvedState && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left: Active Clue Bar + Grid + Toolbar */}
          <div className="space-y-4">
            {/* Active Clue Bar */}
            <div
              aria-live="polite"
              className="rounded-xl bg-slate-900 px-4 py-3 text-white shadow-sm"
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

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
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

          {/* Right: Across & Down Clue Lists + Streak Mini Pill */}
          <div className="space-y-5">
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
      )}

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
