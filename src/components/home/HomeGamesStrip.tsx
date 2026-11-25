import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Clock, Flame, Sparkles } from "lucide-react";
import MiniDifficultyChip from "@/components/games/MiniDifficultyChip";
import {
  formatTimer,
  useMiniTodaySummary,
} from "@/lib/games/miniCrossword";
import { getCountdownToUtcMidnight } from "@/lib/games/nameThatStory";

export function MiniPatternThumbnail({
  pattern,
  size = "md",
}: {
  pattern: string[];
  size?: "sm" | "md";
}) {
  const safePattern =
    pattern.length === 5 ? pattern : ["....#", ".....", ".....", ".....", "#...."];
  const dim = size === "sm" ? "h-16 w-16" : "h-20 w-20 sm:h-24 sm:w-24";

  return (
    <div
      aria-hidden="true"
      className={`grid ${dim} flex-shrink-0 grid-cols-5 gap-[2px] rounded-md border-2 border-[#1B1220] bg-[#1B1220] p-[2px]`}
    >
      {safePattern.map((row, r) =>
        row.split("").map((cell, c) => (
          <div
            key={`${r}-${c}`}
            className={cell === "#" ? "rounded-[1px] bg-[#1B1220]" : "rounded-[1px] bg-white"}
          />
        ))
      )}
    </div>
  );
}

export default function HomeGamesStrip() {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState("--:--:--");

  useEffect(() => {
    setMounted(true);
    const tick = () => setCountdown(getCountdownToUtcMidnight().formatted);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const { data: summary, isLoading, isError } = useMiniTodaySummary(mounted);

  // Client-side only: never render in server-rendered HTML
  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <section
        aria-label="Today's puzzle"
        data-testid="home-games-strip-skeleton"
        className="container px-3 pt-6 sm:px-4"
      >
        <div className="min-h-[136px] rounded-2xl border border-[#1B1220]/10 bg-[#F6EBDD]/60 p-5 animate-pulse motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 w-36 rounded bg-[#1B1220]/15" />
            <div className="h-4 w-24 rounded bg-[#1B1220]/15" />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-20 w-20 rounded-md bg-[#1B1220]/15" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-[#1B1220]/15" />
              <div className="h-5 w-56 rounded bg-[#1B1220]/15" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isError || !summary) {
    return null;
  }

  const streak = summary.current_streak ?? 0;
  const pct =
    summary.white_cells > 0
      ? Math.min(100, Math.round((summary.filled_cells / summary.white_cells) * 100))
      : 0;

  return (
    <section
      aria-labelledby="home-games-strip-heading"
      data-testid="home-games-strip"
      className="container px-3 pt-6 sm:px-4"
    >
      {/* Heading row */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2
            id="home-games-strip-heading"
            className="font-serif text-lg font-bold tracking-tight text-[#1B1220] sm:text-xl"
          >
            Today&apos;s puzzle
          </h2>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#D92F4C]/30 bg-[#F6EBDD] px-2.5 py-0.5 text-xs font-semibold text-[#1B1220]">
              <Flame className="h-3.5 w-3.5 text-[#D92F4C]" aria-hidden="true" />
              {streak}-day streak
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#1B1220]/80">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#1B1220]/70" aria-hidden="true" />
            <span>New puzzles in</span>
            <span
              aria-hidden="true"
              data-testid="home-games-countdown"
              className="font-mono font-semibold tabular-nums text-[#1B1220]"
            >
              {countdown}
            </span>
          </span>
          <Link
            to="/games"
            className="font-semibold text-[#D92F4C] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] focus-visible:ring-offset-2 rounded"
          >
            Games hub
          </Link>
        </div>
      </div>

      {/* Wide puzzle card */}
      <div
        role="region"
        aria-label="Today's Mini Crossword"
        className="rounded-2xl border border-[#1B1220]/15 bg-[#F6EBDD]/70 p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center min-w-0 flex-1">
            <MiniPatternThumbnail pattern={summary.pattern} />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1B1220]/75">
                  Mini Crossword
                </span>
                <span className="font-mono text-xs font-semibold text-[#1B1220]/80">
                  #{summary.number}
                </span>
                <MiniDifficultyChip difficulty={summary.difficulty} />
              </div>

              {summary.status === "not_started" && (
                <>
                  <p className="font-serif text-lg font-bold text-[#1B1220] sm:text-xl">
                    Fill the 5x5 with literary clues
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#1B1220]/80">
                    <span className="rounded-full border border-[#1B1220]/15 bg-white px-2.5 py-0.5">
                      5x5
                    </span>
                    <span className="rounded-full border border-[#1B1220]/15 bg-white px-2.5 py-0.5">
                      About 3 min
                    </span>
                  </div>
                </>
              )}

              {summary.status === "in_progress" && (
                <>
                  <p className="font-serif text-lg font-bold text-[#1B1220] sm:text-xl">
                    You are {summary.filled_cells} squares in
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
                      <div
                        role="progressbar"
                        aria-label="Mini Crossword progress"
                        aria-valuenow={summary.filled_cells}
                        aria-valuemin={0}
                        aria-valuemax={summary.white_cells}
                        className="h-2 flex-1 overflow-hidden rounded-full bg-[#1B1220]/15"
                      >
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-[#D92F4C] transition-[width] motion-reduce:transition-none"
                        />
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums text-[#1B1220]/80">
                        {summary.filled_cells}/{summary.white_cells}
                      </span>
                    </div>
                    {summary.elapsed_seconds !== null && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#1B1220]/15 bg-white px-2.5 py-0.5 font-mono text-xs font-medium text-[#1B1220]">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {formatTimer(summary.elapsed_seconds, false)}
                      </span>
                    )}
                  </div>
                </>
              )}

              {summary.status === "solved" && (
                <>
                  <p className="font-serif text-lg font-bold text-[#1B1220] sm:text-xl">
                    Solved in {formatTimer(summary.elapsed_seconds ?? 0, false)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#1B1220]/85">
                    {streak > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#1B1220]/15 bg-white px-2.5 py-0.5">
                        <Flame className="h-3 w-3 text-[#D92F4C]" aria-hidden="true" />
                        {streak}-day streak
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#1B1220]/15 bg-white px-2.5 py-0.5">
                      <Sparkles className="h-3 w-3 text-[#1B1220]/70" aria-hidden="true" />
                      {summary.hints_used === 0
                        ? "No hints"
                        : `${summary.hints_used} ${summary.hints_used === 1 ? "hint" : "hints"}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#1B1220]/80">
                      <span>Next mini in</span>
                      <span aria-hidden="true" className="font-mono font-semibold tabular-nums">
                        {countdown}
                      </span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            {summary.status === "solved" ? (
              <Link
                to="/games/mini-crossword"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border-2 border-[#1B1220] bg-white px-5 py-2.5 text-sm font-semibold text-[#1B1220] transition-colors hover:bg-[#1B1220] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] focus-visible:ring-offset-2"
              >
                View result
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/games/mini-crossword"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#D92F4C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b8253e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B1220] focus-visible:ring-offset-2"
              >
                {summary.status === "in_progress" ? "Continue" : "Play"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
