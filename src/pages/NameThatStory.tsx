import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Check, Lock, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useAuthModal } from "@/context/AuthModalContext";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { buildMeta } from "@/lib/buildMeta";
import {
  peekGuestKey,
  useGuess,
  useMergeGuest,
  usePuzzle,
  usePuzzleStats,
  useSkip,
  type PuzzleClue,
  type PuzzleSearchItem,
} from "@/lib/games/nameThatStory";
import { PuzzleResultPanel } from "@/components/games/PuzzleResultPanel";
import { PuzzleSidebar } from "@/components/games/PuzzleSidebar";
import { StoryGuessCombobox } from "@/components/games/StoryGuessCombobox";

const CLUE_SLOTS: { key: PuzzleClue["key"]; label: string; unlockAfter: number }[] = [
  { key: "genre", label: "Genre", unlockAfter: 0 },
  { key: "country", label: "Country", unlockAfter: 1 },
  { key: "era", label: "Era", unlockAfter: 2 },
  { key: "length", label: "Length", unlockAfter: 3 },
  { key: "author_initials", label: "Author initials", unlockAfter: 4 },
  { key: "cover", label: "Blurred cover", unlockAfter: 5 },
];

export function meta() {
  return buildMeta({
    title: "Name That Story — Daily Literary Puzzle | WorldStories",
    description:
      "Can you name the story from its opening line? Six guesses, six clues, a new literary puzzle every day on WorldStories.",
    path: "/games/name-that-story",
  });
}

export default function NameThatStory() {
  const { date: archiveDate } = useParams();
  const isArchive = Boolean(archiveDate);
  const isLoggedIn = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  const { data: puzzle, isLoading, isError, refetch } = usePuzzle(archiveDate);
  const { data: stats } = usePuzzleStats();
  const guessMutation = useGuess(archiveDate);
  const skipMutation = useSkip(archiveDate);
  const mergeGuestMutation = useMergeGuest();
  const mergedRef = useRef(false);

  // Merge guest attempts once after login if a guest key exists
  useEffect(() => {
    if (!isLoggedIn || mergedRef.current) return;
    const key = peekGuestKey();
    if (!key) return;
    mergedRef.current = true;
    mergeGuestMutation.mutate(key);
  }, [isLoggedIn, mergeGuestMutation]);

  const guessedKeys = useMemo(() => {
    const keys = new Set<string>();
    (puzzle?.guesses ?? []).forEach((g) => {
      if (g.key) {
        keys.add(g.key);
      } else if (typeof g.story_id === "number") {
        keys.add(`story:${g.story_id}`);
      } else if (typeof g.book_id === "number") {
        keys.add(`book:${g.book_id}`);
      }
    });
    return keys;
  }, [puzzle?.guesses]);

  const cluesByKey = useMemo(() => {
    const map = new Map<string, PuzzleClue>();
    (puzzle?.clues ?? []).forEach((c) => map.set(c.key, c));
    return map;
  }, [puzzle?.clues]);

  const handleGuess = async (story: PuzzleSearchItem) => {
    try {
      await guessMutation.mutateAsync(story.key);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit guess.");
    }
  };

  const handleSkip = async () => {
    try {
      await skipMutation.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not skip guess.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl space-y-4 px-4 py-8">
        <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-44 w-full animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !puzzle) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold text-foreground">No puzzle available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isArchive
            ? "We could not find a puzzle for that date."
            : "Today's puzzle has not been scheduled yet. Please check back soon."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
          <Button asChild>
            <Link to="/games/name-that-story/archive">Browse archive</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isComplete = puzzle.status === "solved" || puzzle.status === "failed";
  const currentGuessNum = Math.min(puzzle.max_guesses, puzzle.guesses_used + 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {/* Header block */}
        <div className="mb-6 space-y-2">
          {isArchive && (
            <Link
              to="/games/name-that-story/archive"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to archive
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A71B36] dark:text-rose-300">
            <span>Puzzle #{puzzle.puzzle_number}</span>
            <span aria-hidden="true">·</span>
            <span>{puzzle.date}</span>
            {isArchive && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground">
                Archive
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Name That Story</h1>
          <p className="text-sm text-muted-foreground">
            Read the opening line and guess the story in 6 tries. Each wrong guess unlocks a new clue.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
          {/* Main game column */}
          <div className="space-y-6">
            {/* Dark opening-line card */}
            <section
              aria-label="Opening line"
              className="relative overflow-hidden rounded-xl bg-neutral-900 px-6 py-8 text-neutral-50 shadow-md sm:px-8 sm:py-10"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-2 select-none font-serif text-7xl leading-none text-white/15"
              >
                &ldquo;
              </span>
              <blockquote
                className="relative z-10 font-serif text-xl leading-relaxed text-neutral-50 sm:text-2xl"
                style={{ fontFamily: "'Literata', Georgia, serif" }}
              >
                {puzzle.opening_line}
              </blockquote>
            </section>

            {/* Clue grid: 3 cols desktop, 2 cols mobile */}
            <section aria-label="Clues" className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {CLUE_SLOTS.map((slot) => {
                const clue = cluesByKey.get(slot.key);
                if (!clue) {
                  return (
                    <div
                      key={slot.key}
                      className="flex min-h-[84px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center"
                    >
                      <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <p className="mt-1 text-xs font-medium text-foreground">{slot.label}</p>
                      <p className="text-[11px] text-muted-foreground">Unlocks after guess {slot.unlockAfter}</p>
                    </div>
                  );
                }

                if (clue.key === "cover") {
                  return (
                    <div
                      key={slot.key}
                      className="flex min-h-[84px] items-center gap-3 rounded-lg border bg-card p-3 shadow-sm"
                    >
                      {clue.value ? (
                        <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-muted">
                          <img
                            src={clue.value}
                            alt="Blurred story cover clue"
                            className="h-full w-full scale-110 object-cover blur-md"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                          No cover
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {clue.label}
                        </p>
                        <p className="text-xs font-semibold text-foreground">Cover unlocked</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={slot.key}
                    className="flex min-h-[84px] flex-col justify-center rounded-lg border bg-card p-3 shadow-sm"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {clue.label}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{clue.value}</p>
                  </div>
                );
              })}
            </section>

            {/* Guess counter & pips */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                {isComplete
                  ? `Finished (${puzzle.guesses_used} of ${puzzle.max_guesses})`
                  : `Guess ${currentGuessNum} of ${puzzle.max_guesses}`}
              </p>
              <div className="flex items-center gap-1.5" aria-label="Guess progress">
                {Array.from({ length: puzzle.max_guesses }).map((_, idx) => {
                  const entry = puzzle.guesses[idx];
                  const isCurrent = !isComplete && idx === puzzle.guesses_used;
                  return (
                    <span
                      key={idx}
                      aria-label={
                        entry
                          ? entry.correct
                            ? `Guess ${idx + 1}: correct`
                            : `Guess ${idx + 1}: wrong`
                          : isCurrent
                            ? `Guess ${idx + 1}: current`
                            : `Guess ${idx + 1}: remaining`
                      }
                      className={`flex h-7 w-7 items-center justify-center rounded border text-xs font-semibold ${
                        entry
                          ? entry.correct
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-rose-600 bg-rose-600 text-white"
                          : isCurrent
                            ? "border-2 border-[#D92F4C] bg-background text-foreground"
                            : "border-border bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {entry ? (
                        entry.correct ? (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Active input OR Result summary */}
            {isComplete ? (
              <PuzzleResultPanel puzzle={puzzle} stats={stats} isArchive={isArchive} />
            ) : (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <StoryGuessCombobox
                    guessedKeys={guessedKeys}
                    isSubmitting={guessMutation.isPending}
                    onSubmitGuess={handleGuess}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={skipMutation.isPending || guessMutation.isPending}
                      onClick={() => void handleSkip()}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <SkipForward className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Skip this guess
                    </Button>
                    <p className="text-xs text-muted-foreground">Skipping reveals the next clue and uses 1 guess.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Guess history rows */}
            {puzzle.guesses.length > 0 && (
              <section aria-label="Guess history" className="space-y-2">
                <h2 className="text-sm font-semibold text-foreground">Your guesses</h2>
                <div className="space-y-2">
                  {puzzle.guesses.map((g, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {g.skipped ? "Skipped guess" : g.title || "Unknown story"}
                        </p>
                        {!g.skipped && (
                          <p className="truncate text-xs text-muted-foreground">{g.author || "Unknown author"}</p>
                        )}
                      </div>

                      {!g.skipped && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              g.matches.genre
                                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {g.matches.genre ? (
                              <Check className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <X className="h-3 w-3" aria-hidden="true" />
                            )}
                            Genre
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              g.matches.country
                                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {g.matches.country ? (
                              <Check className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <X className="h-3 w-3" aria-hidden="true" />
                            )}
                            Country
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              g.matches.era === "same"
                                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                                : g.matches.era === "close"
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {g.matches.era === "same" ? (
                              <Check className="h-3 w-3" aria-hidden="true" />
                            ) : g.matches.era === "different" ? (
                              <X className="h-3 w-3" aria-hidden="true" />
                            ) : null}
                            {g.matches.era === "close" ? "Era: close" : "Era"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right sidebar (stacks below on mobile) */}
          <PuzzleSidebar isLoggedIn={isLoggedIn} onSignIn={openLoginModal} stats={stats} yesterday={puzzle.yesterday} />
        </div>
      </div>
    </div>
  );
}
