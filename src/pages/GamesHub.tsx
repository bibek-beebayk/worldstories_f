import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Flame,
  Grid3x3,
  HelpCircle,
  Quote,
  User,
} from "lucide-react";
import { buildMeta } from "@/lib/buildMeta";
import {
  NAME_THAT_STORY_ENABLED,
  markGamesVisited,
} from "@/lib/games/gamesConfig";
import {
  PUZZLE_TYPE_META,
  type PuzzleType,
  getCountdownToUtcMidnight,
  useWeek,
} from "@/lib/games/nameThatStory";
import {
  formatTimer,
  useMiniStats,
  useMiniToday,
  useMiniTodaySummary,
} from "@/lib/games/miniCrossword";
import MiniDifficultyChip from "@/components/games/MiniDifficultyChip";
import { MiniPatternThumbnail } from "@/components/home/HomeGamesStrip";

export function meta() {
  if (!NAME_THAT_STORY_ENABLED) {
    return buildMeta({
      title: "Games — Mini Crossword | WorldStories",
      description:
        "Play the daily 5x5 literary Mini Crossword on WorldStories. Solve clues, build your streak, and discover classic stories.",
      path: "/games",
    });
  }
  return buildMeta({
    title: "Games — Name That Story | WorldStories",
    description:
      "Play Name That Story, a daily literary puzzle with opening lines, in-book quotes, trivia ladders, and author mysteries.",
    path: "/games",
  });
}

function formatDayShort(iso: string): { weekday: string; monthDay: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return {
    weekday: dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    monthDay: dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  };
}

const TYPE_CARDS: Array<{
  type: PuzzleType;
  icon: typeof BookOpen;
}> = [
  { type: "opening_line", icon: BookOpen },
  { type: "quote", icon: Quote },
  { type: "trivia", icon: HelpCircle },
  { type: "author_bio", icon: User },
];

function MiniCrosswordGamesHub() {
  const [countdown, setCountdown] = useState("--:--:--");
  const { data: summary, isError: summaryError } = useMiniTodaySummary(true);
  const { data: stats } = useMiniStats();

  useEffect(() => {
    markGamesVisited();
    const tick = () => setCountdown(getCountdownToUtcMidnight().formatted);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const hasSummary = Boolean(summary) && !summaryError;
  const ctaLabel =
    hasSummary && summary?.status === "in_progress"
      ? "Continue"
      : hasSummary && summary?.status === "solved"
      ? "View result"
      : "Play today's mini";

  const weekHistory = stats?.week_history ?? [];
  const todayIso =
    summary?.date ||
    (weekHistory.length > 0 ? weekHistory[weekHistory.length - 1]?.date : "");
  const currentStreak = stats?.current_streak ?? summary?.current_streak ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Mini Crossword Hero */}
      <section
        aria-labelledby="games-hub-heading"
        className="rounded-2xl border border-[#1B1220]/15 bg-[#1B1220] p-6 text-white shadow-sm sm:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#F6EBDD]/85">
              Daily literary puzzle
            </p>
            <h1
              id="games-hub-heading"
              className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Mini Crossword
            </h1>
            <p className="text-sm leading-relaxed text-[#F6EBDD]/90 sm:text-base">
              A bite-sized 5x5 literary crossword every day at UTC midnight. Race the clock, check
              your letters, and discover classic stories hiding inside the grid.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link
                to="/games/mini-crossword"
                className="inline-flex items-center gap-2 rounded-lg bg-[#D92F4C] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#b8253e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1220]"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F6EBDD]/85">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>New puzzle in</span>
                <span aria-hidden="true" className="font-mono font-semibold tabular-nums text-white">
                  {countdown}
                </span>
              </span>
            </div>
          </div>

          {hasSummary && summary && (
            <div
              data-testid="hub-today-card"
              className="flex items-center gap-4 rounded-xl border border-white/15 bg-[#F6EBDD] p-4 text-[#1B1220] lg:min-w-[290px]"
            >
              <MiniPatternThumbnail pattern={summary.pattern} size="sm" />
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#1B1220]">
                    #{summary.number}
                  </span>
                  <MiniDifficultyChip difficulty={summary.difficulty} />
                </div>
                <p className="font-serif text-sm font-bold text-[#1B1220]">
                  {summary.status === "solved"
                    ? `Solved in ${formatTimer(summary.elapsed_seconds ?? 0, false)}`
                    : summary.status === "in_progress"
                    ? `${summary.filled_cells} of ${summary.white_cells} squares filled`
                    : "Ready to play"}
                </p>
                <p className="text-xs text-[#1B1220]/75">
                  {summary.white_cells} squares · 5x5 grid
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* This week 7-day markers */}
      {weekHistory.length > 0 && (
        <section
          aria-labelledby="mini-week-heading"
          data-testid="hub-this-week"
          className="rounded-2xl border border-[#1B1220]/10 bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="mini-week-heading" className="font-serif text-lg font-bold text-[#1B1220]">
              This week
            </h2>
            <span className="text-xs text-[#1B1220]/70">Resets daily at 00:00 UTC</span>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 sm:gap-3">
            {weekHistory.map((day) => {
              const { weekday, monthDay } = formatDayShort(day.date);
              const isToday = day.date === todayIso;
              const isSolved = day.status === "solved";
              const markerLabel = isSolved ? "Solved" : isToday ? "Today" : "Missed";

              return (
                <Link
                  key={day.date}
                  to={isToday ? "/games/mini-crossword" : `/games/mini-crossword/${day.date}`}
                  aria-label={`${weekday} ${monthDay}: ${markerLabel}`}
                  className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] ${
                    isToday
                      ? "border-2 border-[#D92F4C] bg-[#F6EBDD]/60"
                      : "border-[#1B1220]/10 bg-slate-50 hover:bg-[#F6EBDD]/40"
                  }`}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1B1220]/80">
                    {weekday}
                  </span>
                  <div
                    className={`mt-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isSolved
                        ? "bg-emerald-700 text-white"
                        : isToday
                        ? "border-2 border-[#D92F4C] bg-white text-[#D92F4C]"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isSolved ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : isToday ? (
                      "•"
                    ) : (
                      "—"
                    )}
                  </div>
                  <span className="mt-1.5 text-[10px] font-medium text-[#1B1220]/75">
                    {markerLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Streak card + Missed a day archive card */}
      <div className="grid gap-6 md:grid-cols-2">
        {hasSummary || stats ? (
          <section
            aria-labelledby="hub-streak-heading"
            className="rounded-2xl border border-[#1B1220]/10 bg-white p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="hub-streak-heading" className="font-serif text-lg font-bold text-[#1B1220]">
                Your streak
              </h2>
              <Flame className="h-5 w-5 text-[#D92F4C]" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#F6EBDD]/60 p-3 text-center">
                <p className="text-2xl font-bold text-[#1B1220] tabular-nums">{currentStreak}</p>
                <p className="text-xs font-medium text-[#1B1220]/75">Current</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-[#1B1220] tabular-nums">
                  {stats?.best_streak ?? currentStreak}
                </p>
                <p className="text-xs font-medium text-[#1B1220]/75">Best</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-[#1B1220] tabular-nums">
                  {stats?.best_time !== null && stats?.best_time !== undefined
                    ? formatTimer(stats.best_time, false)
                    : "—"}
                </p>
                <p className="text-xs font-medium text-[#1B1220]/75">Best time</p>
              </div>
            </div>
          </section>
        ) : null}

        <section
          aria-labelledby="hub-archive-heading"
          className="flex flex-col justify-between rounded-2xl border border-[#1B1220]/10 bg-[#F6EBDD]/55 p-6 space-y-4"
        >
          <div className="space-y-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B1220] text-white">
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 id="hub-archive-heading" className="font-serif text-lg font-bold text-[#1B1220]">
              Missed a day?
            </h2>
            <p className="text-sm text-[#1B1220]/80">
              Catch up on past 5x5 Mini Crosswords from the archive anytime. Archive solves never
              affect your daily streak.
            </p>
          </div>
          <div>
            <Link
              to="/games/mini-crossword/archive"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1B1220] bg-white px-4 py-2 text-sm font-semibold text-[#1B1220] transition-colors hover:bg-[#1B1220] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] focus-visible:ring-offset-2"
            >
              Browse past grids
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* How it works */}
      <section
        aria-labelledby="hub-how-it-works-heading"
        className="rounded-2xl border border-[#1B1220]/10 bg-white p-6"
      >
        <h2
          id="hub-how-it-works-heading"
          className="font-serif text-lg font-bold text-[#1B1220]"
        >
          How it works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          <li className="rounded-xl border border-[#1B1220]/10 bg-slate-50 p-4 space-y-1.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1B1220] text-xs font-bold text-white">
              1
            </span>
            <p className="text-sm font-semibold text-[#1B1220]">One 5x5 grid every day</p>
            <p className="text-xs leading-relaxed text-[#1B1220]/75">
              A fresh literary crossword drops daily at 00:00 UTC with Easy, Medium, or Hard clues.
            </p>
          </li>
          <li className="rounded-xl border border-[#1B1220]/10 bg-slate-50 p-4 space-y-1.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1B1220] text-xs font-bold text-white">
              2
            </span>
            <p className="text-sm font-semibold text-[#1B1220]">Helpful tools, intact streak</p>
            <p className="text-xs leading-relaxed text-[#1B1220]/75">
              Use Check, Reveal, or Pencil mode whenever you get stuck. Hints never break your
              streak.
            </p>
          </li>
          <li className="rounded-xl border border-[#1B1220]/10 bg-slate-50 p-4 space-y-1.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1B1220] text-xs font-bold text-white">
              3
            </span>
            <p className="text-sm font-semibold text-[#1B1220]">Play free or sync across devices</p>
            <p className="text-xs leading-relaxed text-[#1B1220]/75">
              Jump right in as a guest, or sign in to keep your streak and solve history everywhere.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}

function LegacyGamesHub() {
  const { data: weekData, isLoading } = useWeek();
  const { data: miniToday } = useMiniToday();
  const days = weekData?.days ?? [];

  useEffect(() => {
    markGamesVisited();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Daily Literary Puzzle
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Name That Story
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
              One puzzle every day at UTC midnight. You get 6 guesses to climb the clue ladder from
              hardest to easiest. Play free as a guest or sign in to keep your streak.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-3">
            <Link
              to="/games/name-that-story"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Play today
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/games/name-that-story/archive"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Archive
            </Link>
          </div>
        </div>
      </section>

      {/* Mini Crossword Card */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Grid3x3 className="h-4 w-4 text-slate-900" aria-hidden="true" />
                Daily 5x5 Grid
              </span>
              <MiniDifficultyChip difficulty={miniToday?.difficulty} />
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              Mini Crossword
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              A bite-sized 5x5 literary crossword every day. Race the clock, check your letters,
              and discover classic stories hiding inside the grid.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-3">
            <Link
              to="/games/mini-crossword"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Play Mini
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/games/mini-crossword/archive"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Past grids
            </Link>
          </div>
        </div>
      </section>

      {/* This Week 7-day strip */}
      <section className="mt-10" aria-labelledby="this-week-heading">
        <div className="flex items-center justify-between">
          <h2 id="this-week-heading" className="text-lg font-semibold text-slate-900">
            This week
          </h2>
          <span className="text-xs text-slate-600">Resets daily at 00:00 UTC</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {isLoading
            ? Array.from({ length: 7 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-28 rounded-xl border border-slate-200 bg-slate-100 animate-pulse motion-reduce:animate-none"
                />
              ))
            : days.map((day) => {
                const { weekday, monthDay } = formatDayShort(day.date);
                const metaInfo = PUZZLE_TYPE_META[day.puzzle_type];
                const answerLabel = day.answer_kind === "author" ? "Author" : "Story";
                const cardClass = day.is_today
                  ? "border-2 border-slate-900 bg-white shadow-sm"
                  : "border border-slate-200 bg-white";

                const inner = (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {weekday}
                      </span>
                      {day.is_today && (
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{monthDay}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 leading-snug">
                      {metaInfo.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Answer: {answerLabel}</p>
                  </>
                );

                return day.is_today ? (
                  <Link
                    key={day.date}
                    to="/games/name-that-story"
                    className={`block rounded-xl p-3.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${cardClass}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={day.date} className={`rounded-xl p-3.5 ${cardClass}`}>
                    {inner}
                  </div>
                );
              })}
        </div>
      </section>

      {/* Four Puzzle Type Explainer Cards */}
      <section className="mt-10" aria-labelledby="puzzle-types-heading">
        <h2 id="puzzle-types-heading" className="text-lg font-semibold text-slate-900">
          Four ways to play
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {TYPE_CARDS.map(({ type, icon: Icon }) => {
            const metaInfo = PUZZLE_TYPE_META[type];
            return (
              <div
                key={type}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      Answer: {metaInfo.answerKind === "author" ? "Author" : "Story"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">{metaInfo.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {metaInfo.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function GamesHub() {
  return NAME_THAT_STORY_ENABLED ? <LegacyGamesHub /> : <MiniCrosswordGamesHub />;
}
