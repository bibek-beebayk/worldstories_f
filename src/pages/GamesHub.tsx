import { Link } from "react-router";
import { ArrowRight, BookOpen, Calendar, Grid3x3, HelpCircle, Quote, User } from "lucide-react";
import { buildMeta } from "@/lib/buildMeta";
import {
  PUZZLE_TYPE_META,
  type PuzzleType,
  useWeek,
} from "@/lib/games/nameThatStory";
import { useMiniToday } from "@/lib/games/miniCrossword";
import MiniDifficultyChip from "@/components/games/MiniDifficultyChip";

export function meta() {
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

export default function GamesHub() {
  const { data: weekData, isLoading } = useWeek();
  const { data: miniToday } = useMiniToday();
  const days = weekData?.days ?? [];

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
                const meta = PUZZLE_TYPE_META[day.puzzle_type];
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
                      {meta.label}
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
            const meta = PUZZLE_TYPE_META[type];
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
                      Answer: {meta.answerKind === "author" ? "Author" : "Story"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">{meta.label}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {meta.description}
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
