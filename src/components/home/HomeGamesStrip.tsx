import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Clock, Flame } from "lucide-react";
import MiniDifficultyChip from "@/components/games/MiniDifficultyChip";
import {
  formatTimer,
  useMiniTodaySummary,
} from "@/lib/games/miniCrossword";
import { getCountdownToUtcMidnight } from "@/lib/games/nameThatStory";

export function MiniPatternThumbnail({
  pattern,
  size = "md",
  status = "not_started",
  filledCells = 0,
}: {
  pattern: string[];
  size?: "compact" | "sm" | "md";
  status?: "not_started" | "in_progress" | "solved";
  filledCells?: number;
}) {
  const safePattern =
    pattern.length === 5 ? pattern : ["....#", ".....", ".....", ".....", "#...."];

  if (size === "compact") {
    let whiteSeen = 0;
    return (
      <div
        aria-hidden="true"
        className="grid flex-shrink-0 grid-cols-5 gap-[1px] rounded-[4px] border border-[#1B1220] bg-[#1B1220] p-[1px]"
      >
        {safePattern.map((row, r) =>
          row.split("").map((cell, c) => {
            if (cell === "#") {
              return (
                <div
                  key={`${r}-${c}`}
                  className="h-[9px] w-[9px] md:h-[11px] md:w-[11px] bg-[#1B1220]"
                />
              );
            }
            const idx = whiteSeen++;
            const fillClass =
              status === "solved"
                ? "bg-emerald-200"
                : status === "in_progress" && idx < filledCells
                ? "bg-[#FDE6EB]"
                : "bg-white";
            return (
              <div
                key={`${r}-${c}`}
                className={`h-[9px] w-[9px] md:h-[11px] md:w-[11px] ${fillClass}`}
              />
            );
          })
        )}
      </div>
    );
  }

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
        className="container px-3 pt-4 sm:px-4"
      >
        <div className="flex min-h-[84px] items-center gap-3 md:gap-4 rounded-[14px] border border-[#E8DED3] bg-white px-3.5 py-3 md:px-[18px] animate-pulse motion-reduce:animate-none">
          <div className="h-[52px] w-[52px] md:h-[62px] md:w-[62px] flex-shrink-0 rounded bg-[#E8DED3]/80" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-28 rounded bg-[#E8DED3]" />
            <div className="h-4 w-48 rounded bg-[#E8DED3]" />
          </div>
          <div className="h-10 w-20 flex-shrink-0 rounded-lg bg-[#E8DED3]" />
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
      aria-label="Today's puzzle"
      data-testid="home-games-strip"
      className="container px-3 pt-4 sm:px-4"
    >
      <Link
        to="/games/mini-crossword"
        className="group flex min-h-[76px] md:min-h-[84px] items-center gap-3 md:gap-4 rounded-[14px] border border-[#E8DED3] bg-white px-3.5 py-3 md:px-[18px] transition-colors hover:border-[#D92F4C]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] focus-visible:ring-offset-2"
      >
        <MiniPatternThumbnail
          pattern={summary.pattern}
          size="compact"
          status={summary.status}
          filledCells={summary.filled_cells}
        />

        <div className="min-w-0 flex-1">
          {summary.status === "solved" ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Mini Crossword · Solved
            </p>
          ) : (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A71B36]">
              Mini Crossword · #{summary.number}
            </p>
          )}

          {summary.status === "not_started" && (
            <>
              <p className="truncate font-serif text-[15px] md:text-[17px] font-bold leading-snug text-[#1B1220]">
                Today&apos;s five-by-five is ready
              </p>
              <div className="mt-1 hidden md:flex items-center gap-2 text-xs text-[#1B1220]/75">
                <MiniDifficultyChip difficulty={summary.difficulty} />
                <span>About 3 min</span>
              </div>
            </>
          )}

          {summary.status === "in_progress" && (
            <>
              <p className="truncate font-serif text-[15px] md:text-[17px] font-bold leading-snug text-[#1B1220]">
                {summary.filled_cells} of {summary.white_cells} squares in
              </p>
              <div className="mt-1 hidden md:flex items-center gap-2 text-xs text-[#1B1220]/75">
                <MiniDifficultyChip difficulty={summary.difficulty} />
                {summary.elapsed_seconds !== null && (
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatTimer(summary.elapsed_seconds, false)}
                  </span>
                )}
              </div>
              <div
                role="progressbar"
                aria-label="Mini Crossword progress"
                aria-valuenow={summary.filled_cells}
                aria-valuemin={0}
                aria-valuemax={summary.white_cells}
                className="mt-1.5 h-1 w-full max-w-[260px] overflow-hidden rounded-full bg-[#E8DED3]"
              >
                <div
                  style={{ width: `${pct}%` }}
                  className="h-full rounded-full bg-[#D92F4C] transition-[width] motion-reduce:transition-none"
                />
              </div>
            </>
          )}

          {summary.status === "solved" && (
            <>
              <p className="truncate font-serif text-[15px] md:text-[17px] font-bold leading-snug text-[#1B1220]">
                Solved in {formatTimer(summary.elapsed_seconds ?? 0, false)}
              </p>
              {streak > 0 && (
                <div className="mt-1 hidden md:flex items-center gap-1.5 text-xs font-medium text-[#1B1220]/80">
                  <Flame className="h-3.5 w-3.5 text-[#D92F4C]" aria-hidden="true" />
                  <span>{streak}-day streak</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          {summary.status === "solved" && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-[#1B1220]/75">
              <span>Next in</span>
              <span
                aria-hidden="true"
                data-testid="home-games-countdown"
                className="font-mono font-semibold tabular-nums text-[#1B1220]"
              >
                {countdown}
              </span>
            </span>
          )}

          {summary.status === "solved" ? (
            <span className="inline-flex h-10 items-center justify-center rounded-lg border border-[#1B1220] bg-white px-3.5 md:px-4 text-sm font-semibold text-[#1B1220] transition-colors group-hover:bg-[#1B1220] group-hover:text-white">
              <span className="md:hidden">Result</span>
              <span className="hidden md:inline">View result</span>
            </span>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-lg bg-[#D92F4C] px-4 text-sm font-semibold text-white shadow-xs transition-colors group-hover:bg-[#b8253e]">
              {summary.status === "in_progress" ? "Continue" : "Play"}
            </span>
          )}
        </div>
      </Link>
    </section>
  );
}
