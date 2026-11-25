import { useEffect, useMemo, useRef, useState } from "react";
import { Link, redirect, useParams } from "react-router";
import { ArrowLeft, Check, Info, Lock, X } from "lucide-react";
import { buildMeta } from "@/lib/buildMeta";
import { NAME_THAT_STORY_ENABLED } from "@/lib/games/gamesConfig";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import StoryGuessCombobox from "@/components/games/StoryGuessCombobox";
import PuzzleResultPanel from "@/components/games/PuzzleResultPanel";
import PuzzleSidebar from "@/components/games/PuzzleSidebar";
import {
  PUZZLE_TYPE_META,
  type GuessHistoryItem,
  type PublicClue,
  type PublicPuzzleResponse,
  getStoredGuestKey,
  useGuess,
  useMergeGuest,
  usePuzzle,
  usePuzzleStats,
  useSkip,
  useWeek,
} from "@/lib/games/nameThatStory";

export function loader() {
  if (!NAME_THAT_STORY_ENABLED) {
    return redirect("/games", 302);
  }
  return null;
}

export function meta() {
  return buildMeta({
    title: "Name That Story — Daily Literary Puzzle | WorldStories",
    description:
      "Guess the classic story or author in 6 tries using a ladder of daily literary clues.",
    path: "/games/name-that-story",
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

export function MatchChips({ item }: { item: GuessHistoryItem }) {
  if (item.skipped) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
        Skipped
      </span>
    );
  }
  const genreMatch = Boolean(item.matches?.genre);
  const countryMatch = Boolean(item.matches?.country);
  const eraMatch = item.matches?.era ?? "different";

  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          genreMatch
            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
            : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}
      >
        {genreMatch ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : (
          <X className="h-3 w-3" aria-hidden="true" />
        )}
        Genre
      </span>

      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          countryMatch
            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
            : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}
      >
        {countryMatch ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : (
          <X className="h-3 w-3" aria-hidden="true" />
        )}
        Country
      </span>

      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          eraMatch === "same"
            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
            : eraMatch === "close"
            ? "bg-amber-100 text-amber-950 border border-amber-300"
            : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}
      >
        {eraMatch === "same" ? (
          <Check className="h-3 w-3" aria-hidden="true" />
        ) : eraMatch === "close" ? (
          <Info className="h-3 w-3" aria-hidden="true" />
        ) : (
          <X className="h-3 w-3" aria-hidden="true" />
        )}
        {eraMatch === "close" ? "Era: close" : "Era"}
      </span>
    </div>
  );
}

export function ClueLadder({ puzzle }: { puzzle: PublicPuzzleResponse }) {
  const isQuoteStyle = puzzle.puzzle_type === "opening_line" || puzzle.puzzle_type === "quote";
  const isComplete = puzzle.status === "solved" || puzzle.status === "failed";

  // Newest revealed clue position (only highlighted when >= 1 guess has been made & still in progress)
  const revealedClues = puzzle.clues.filter((c) => !c.locked);
  const newestPos =
    !isComplete && puzzle.guesses_used > 0 && revealedClues.length > 0
      ? revealedClues[revealedClues.length - 1].position
      : -1;

  const renderClueValue = (clue: Extract<PublicClue, { locked: false }>) => {
    if (clue.kind === "cover" && clue.value) {
      return (
        <div className="mt-2 inline-block overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          <img
            src={clue.value}
            alt="Blurred cover clue"
            className="h-32 w-24 object-cover blur-md scale-110 transition-none"
          />
        </div>
      );
    }
    return <p className="mt-0.5 text-sm font-medium text-slate-900">{clue.value || "—"}</p>;
  };

  if (isQuoteStyle) {
    const firstClue = puzzle.clues[0];
    const restClues = puzzle.clues.slice(1);

    return (
      <div className="space-y-4">
        {firstClue && !firstClue.locked && (
          <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {firstClue.label}
            </p>
            <blockquote className="mt-3 font-serif text-xl leading-relaxed sm:text-2xl">
              &ldquo;{firstClue.value}&rdquo;
            </blockquote>
          </div>
        )}

        <div
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Clue ladder"
        >
          {restClues.map((clue) => {
            if (clue.locked) {
              return (
                <div
                  key={clue.position}
                  className="flex flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3 text-slate-600"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Lock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>Clue {clue.position}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Unlocks after guess {clue.position - 1}
                  </p>
                </div>
              );
            }
            const isNewest = clue.position === newestPos;
            return (
              <div
                key={clue.position}
                className={`rounded-xl bg-white px-3.5 py-3 ${
                  isNewest
                    ? "border-2 border-slate-900 shadow-sm"
                    : "border border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {clue.label}
                  </span>
                  {isNewest && (
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                </div>
                {renderClueValue(clue)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Trivia and Author Bio: numbered ladder rows
  return (
    <ol className="space-y-2.5" aria-label="Clue ladder">
      {puzzle.clues.map((clue) => {
        if (clue.locked) {
          return (
            <li
              key={clue.position}
              className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-slate-600"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-500">
                {clue.position}
              </span>
              <Lock className="h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden="true" />
              <span className="text-sm text-slate-600">
                Unlocks after guess {clue.position - 1}
              </span>
            </li>
          );
        }

        const isNewest = clue.position === newestPos;
        return (
          <li
            key={clue.position}
            className={`flex items-start gap-3 rounded-xl bg-white px-4 py-3.5 ${
              isNewest ? "border-2 border-slate-900 shadow-sm" : "border border-slate-200"
            }`}
          >
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {clue.position}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {clue.label}
                </span>
                {isNewest && (
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    New
                  </span>
                )}
              </div>
              {renderClueValue(clue)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function NameThatStory() {
  const { date } = useParams<{ date?: string }>();
  const isLoggedIn = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mergedOnceRef = useRef(false);

  const { data: puzzle, isLoading, isError } = usePuzzle(date);
  const { data: stats } = usePuzzleStats();
  const { data: weekData } = useWeek();
  const guessMutation = useGuess(date);
  const skipMutation = useSkip(date);
  const mergeMutation = useMergeGuest();

  useEffect(() => {
    if (isLoggedIn && !mergedOnceRef.current && getStoredGuestKey()) {
      mergedOnceRef.current = true;
      mergeMutation.mutate();
    }
  }, [isLoggedIn, mergeMutation]);

  const guessedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const g of puzzle?.guesses ?? []) {
      if (!g.skipped && g.target_id !== null) ids.add(g.target_id);
    }
    return ids;
  }, [puzzle?.guesses]);

  const tomorrow = useMemo(() => {
    const days = weekData?.days ?? [];
    return days.length > 1 ? days[1] : null;
  }, [weekData]);

  const handleGuess = (targetId: number) => {
    setSubmitError(null);
    guessMutation.mutate(targetId, {
      onError: (err: unknown) => {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : "Could not submit your guess. Please try again.";
        setSubmitError(msg);
      },
    });
  };

  const handleSkip = () => {
    setSubmitError(null);
    skipMutation.mutate(undefined, {
      onError: () => setSubmitError("Could not skip this guess. Please try again."),
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-56 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
        <div className="mt-6 h-48 rounded-2xl bg-slate-100 animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  if (isError || !puzzle) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
        <h1 className="font-serif text-2xl font-bold text-slate-900">
          No puzzle available for this date
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Check back soon or browse the archive of past daily puzzles.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/games"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Games
          </Link>
          <Link
            to="/games/name-that-story/archive"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Browse archive
          </Link>
        </div>
      </div>
    );
  }

  const typeMeta = PUZZLE_TYPE_META[puzzle.puzzle_type];
  const isComplete = puzzle.status === "solved" || puzzle.status === "failed";
  const currentGuessNum = Math.min(puzzle.guesses_used + 1, puzzle.max_guesses);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {puzzle.is_archive && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700">
          <span>Archive puzzle — archive plays do not change your streak.</span>
          <Link
            to="/games/name-that-story/archive"
            className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All archive puzzles
          </Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main Column */}
        <main className="space-y-6">
          {/* Header */}
          <header>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              <span>
                Daily puzzle #{puzzle.puzzle_number}, {formatDisplayDate(puzzle.date)}
              </span>
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                {typeMeta.label}
              </span>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-slate-900">
              Name That Story
            </h1>
            <p className="mt-1 text-sm text-slate-600">{typeMeta.instructions}</p>
          </header>

          {/* Guess Counter & 6 Pips */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">
              {isComplete
                ? puzzle.status === "solved"
                  ? `Solved in ${puzzle.guesses_used} of ${puzzle.max_guesses}`
                  : `Used ${puzzle.guesses_used} of ${puzzle.max_guesses} guesses`
                : `Guess ${currentGuessNum} of ${puzzle.max_guesses}`}
            </span>

            <div className="flex items-center gap-1.5" aria-label="Guess progress">
              {Array.from({ length: puzzle.max_guesses }).map((_, idx) => {
                const g = puzzle.guesses[idx];
                const isCurrent = !isComplete && idx === puzzle.guesses_used;
                if (g?.correct) {
                  return (
                    <span
                      key={idx}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-700 text-white"
                      aria-label={`Guess ${idx + 1}: correct`}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                  );
                }
                if (g) {
                  return (
                    <span
                      key={idx}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-red-700 text-white"
                      aria-label={`Guess ${idx + 1}: wrong`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </span>
                  );
                }
                return (
                  <span
                    key={idx}
                    className={`flex h-7 w-7 items-center justify-center rounded-md ${
                      isCurrent
                        ? "border-2 border-slate-900 bg-white"
                        : "border border-slate-300 bg-slate-50"
                    }`}
                    aria-label={`Guess ${idx + 1}: ${isCurrent ? "current" : "empty"}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Clue Ladder */}
          <ClueLadder puzzle={puzzle} />

          {/* Result OR Input */}
          {isComplete ? (
            <PuzzleResultPanel puzzle={puzzle} stats={stats} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <StoryGuessCombobox
                puzzleDate={puzzle.date}
                answerKind={puzzle.answer_kind}
                guessedIds={guessedIds}
                isSubmitting={guessMutation.isPending || skipMutation.isPending}
                errorMessage={submitError}
                onSubmitGuess={handleGuess}
                onSkip={handleSkip}
              />
            </div>
          )}

          {/* Guess History */}
          {puzzle.guesses.length > 0 && (
            <section aria-labelledby="guess-history-heading" className="space-y-2.5">
              <h2
                id="guess-history-heading"
                className="text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Your guesses
              </h2>
              <ul className="space-y-2">
                {puzzle.guesses.map((g, idx) => (
                  <li
                    key={idx}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {puzzle.answer_kind === "author" && !g.skipped ? (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-800">
                          {g.initials || "?"}
                        </div>
                      ) : (
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                          {idx + 1}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{g.title}</p>
                        {g.subtitle && (
                          <p className="truncate text-xs text-slate-600">{g.subtitle}</p>
                        )}
                      </div>
                    </div>

                    {g.correct ? (
                      <span className="inline-flex items-center gap-1 self-start rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 sm:self-center">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Correct
                      </span>
                    ) : (
                      <MatchChips item={g} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        {/* Sidebar */}
        <PuzzleSidebar
          stats={stats}
          yesterday={puzzle.yesterday}
          tomorrow={tomorrow}
          isLoggedIn={isLoggedIn}
          onSignIn={() => openLoginModal()}
        />
      </div>
    </div>
  );
}
