import { Link } from "react-router";
import { ArrowRight, BookOpen, Calendar, Flame, LogIn } from "lucide-react";
import {
  PUZZLE_TYPE_META,
  type PuzzleStatsResponse,
  type WeekDaySchedule,
  type YesterdaySummary,
} from "@/lib/games/nameThatStory";

interface PuzzleSidebarProps {
  stats?: PuzzleStatsResponse;
  yesterday?: YesterdaySummary | null;
  tomorrow?: WeekDaySchedule | null;
  isLoggedIn: boolean;
  onSignIn: () => void;
}

export default function PuzzleSidebar({
  stats,
  yesterday,
  tomorrow,
  isLoggedIn,
  onSignIn,
}: PuzzleSidebarProps) {
  const weekHistory = stats?.week_history ?? [];

  return (
    <aside className="space-y-4" aria-label="Game stats and schedule">
      {/* Guest Banner */}
      {!isLoggedIn && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <p className="text-sm font-semibold">Playing as a guest</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900">
            Sign in to save your streak and stats across devices. Your guest progress will merge
            automatically.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            Sign in
          </button>
        </div>
      )}

      {/* Streak Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-slate-900" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Your streak</h2>
          </div>
          <span className="text-xs text-slate-600">Best: {stats?.best_streak ?? 0}</span>
        </div>

        <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
          {stats?.current_streak ?? 0}
          <span className="ml-1.5 text-sm font-normal text-slate-600">
            {(stats?.current_streak ?? 0) === 1 ? "day" : "days"}
          </span>
        </p>

        {weekHistory.length > 0 && (
          <div className="mt-3 grid grid-cols-7 gap-1.5" aria-label="Last 7 days">
            {weekHistory.map((item) => {
              const dayNum = item.date.slice(-2);
              const color =
                item.status === "solved"
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : item.status === "failed"
                  ? "bg-red-700 text-white border-red-700"
                  : "bg-slate-100 text-slate-600 border-slate-200";
              return (
                <div
                  key={item.date}
                  title={`${item.date}: ${item.status}`}
                  className={`flex h-7 items-center justify-center rounded border text-[11px] font-semibold tabular-nums ${color}`}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tomorrow Card */}
      {tomorrow && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Tomorrow: {PUZZLE_TYPE_META[tomorrow.puzzle_type].label}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Answer: {tomorrow.answer_kind === "author" ? "Author" : "Story"}
          </p>
          <Link
            to="/games"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 underline decoration-slate-400 underline-offset-4 hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
          >
            See this week&apos;s schedule
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Yesterday's Answer */}
      {yesterday && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Yesterday&apos;s answer
          </p>
          {yesterday.card.kind === "story" ? (
            <div className="mt-2 space-y-2">
              <p className="font-serif text-base font-bold text-slate-900">
                {yesterday.card.title}
              </p>
              {yesterday.card.author && (
                <p className="text-xs text-slate-600">{yesterday.card.author}</p>
              )}
              <Link
                to={`/story/${yesterday.card.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 underline decoration-slate-400 underline-offset-4 hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Read it free
              </Link>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="font-serif text-base font-bold text-slate-900">
                <Link
                  to={`/authors/${yesterday.card.slug}`}
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
                >
                  {yesterday.card.name}
                </Link>
              </p>
              {yesterday.card.years && (
                <p className="text-xs text-slate-600">{yesterday.card.years}</p>
              )}
              {yesterday.card.works.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {yesterday.card.works.slice(0, 3).map((w) => (
                    <li key={w.id}>
                      <Link
                        to={`/story/${w.slug}`}
                        className="text-xs font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:text-slate-950"
                      >
                        {w.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Archive Link */}
      <Link
        to="/games/name-that-story/archive"
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
      >
        <span className="inline-flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-700" aria-hidden="true" />
          Browse past puzzles
        </span>
        <ArrowRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
      </Link>
    </aside>
  );
}
