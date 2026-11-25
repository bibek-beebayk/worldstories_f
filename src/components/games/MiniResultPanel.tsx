import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BookOpen, Calendar, Check, Clock, Copy, Flame, Share2 } from "lucide-react";
import { getCountdownToUtcMidnight } from "@/lib/games/nameThatStory";
import {
  type MiniPublicResponse,
  type MiniStatsResponse,
  buildMiniShareText,
  formatTimer,
} from "@/lib/games/miniCrossword";

interface MiniResultPanelProps {
  puzzle: MiniPublicResponse;
  stats?: MiniStatsResponse;
}

export default function MiniResultPanel({ puzzle, stats }: MiniResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [countdown, setCountdown] = useState("--:--:--");

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    const update = () => setCountdown(getCountdownToUtcMidnight().formatted);
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = puzzle.attempt?.elapsed_seconds ?? 0;
  const hintsUsed = puzzle.attempt?.hints_used ?? 0;
  const tokens = puzzle.share_tokens ?? [];
  const solution = puzzle.solution ?? [];
  const linkedStories = puzzle.linked_stories ?? [];

  const shareText = buildMiniShareText(
    puzzle.number,
    elapsed,
    tokens,
    hintsUsed,
    typeof window !== "undefined"
      ? `${window.location.origin}/games/mini-crossword`
      : "https://worldstories.org/games/mini-crossword"
  );

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = shareText;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `Mini Crossword #${puzzle.number}`,
        text: shareText,
      });
    } catch {
      // cancelled
    }
  };

  const last7 = stats?.last_7_times ?? [];
  const maxTime = Math.max(1, ...last7.map((t) => t.elapsed_seconds));

  return (
    <section
      aria-label="Solved Mini Crossword summary"
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      {/* Headline & Countdown */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">
            Solved in {formatTimer(elapsed, false)}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {hintsUsed > 0
              ? `Completed with ${hintsUsed} ${hintsUsed === 1 ? "hint" : "hints"}. Your streak stays intact.`
              : "Clean solve with zero hints."}
          </p>
        </div>

        {!puzzle.is_archive && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800">
            <Clock className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span className="text-xs text-slate-600">Next mini</span>
            <span className="font-mono font-semibold tabular-nums">{countdown}</span>
          </div>
        )}
      </div>

      {/* Solved Green Grid + Share Card */}
      <div className="flex flex-col items-center gap-6 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-start">
        <div
          aria-label="Solved grid"
          className="grid w-40 grid-cols-5 gap-[2px] border-2 border-slate-900 bg-slate-900 flex-shrink-0"
        >
          {tokens.map((rowStr, r) =>
            rowStr.split("").map((tok, c) => {
              const letter = solution[r]?.[c] || "";
              const bg =
                tok === "K"
                  ? "bg-slate-900"
                  : tok === "Y"
                  ? "bg-amber-200 text-amber-950"
                  : "bg-emerald-200 text-emerald-950";
              return (
                <div
                  key={`${r}-${c}`}
                  className={`flex aspect-square items-center justify-center text-sm font-bold ${bg}`}
                >
                  {tok !== "K" ? letter : ""}
                </div>
              );
            })
          )}
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Share your grid
          </p>
          <p className="text-sm text-slate-700">
            Shares your solve time and colored square pattern only — no letters or clues.
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy result"}
            </button>
            {canNativeShare && (
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stories Hiding in This Grid */}
      {linkedStories.length > 0 && (
        <div className="space-y-3 border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Stories hiding in this grid
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {linkedStories.map((st) => (
              <div
                key={`${st.story_id}-${st.answer}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                {st.cover ? (
                  <img
                    src={st.cover}
                    alt={st.title}
                    className="h-16 w-12 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded bg-slate-200 text-xs font-bold text-slate-700">
                    {st.answer}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-semibold uppercase text-slate-600">
                    {st.number}-{st.direction} · {st.answer}
                  </p>
                  <p className="truncate font-serif text-sm font-bold text-slate-900">{st.title}</p>
                  {st.author && <p className="truncate text-xs text-slate-600">{st.author}</p>}
                  <Link
                    to={`/story/${st.slug}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                  >
                    <BookOpen className="h-3 w-3" aria-hidden="true" />
                    Read it free
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats + Last 7 Times Chart + Streak */}
      {stats && (
        <div className="space-y-4 border-t border-slate-200 pt-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.played}</p>
              <p className="text-xs text-slate-600">Played</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {stats.solved_percentage}%
              </p>
              <p className="text-xs text-slate-600">Solved</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {stats.average_time !== null ? formatTimer(stats.average_time, false) : "—"}
              </p>
              <p className="text-xs text-slate-600">Avg time</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {stats.best_time !== null ? formatTimer(stats.best_time, false) : "—"}
              </p>
              <p className="text-xs text-slate-600">Best time</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center col-span-2 sm:col-span-1">
              <p className="inline-flex items-center justify-center gap-1 text-xl font-bold text-slate-900 tabular-nums">
                <Flame className="h-4 w-4 text-slate-900" aria-hidden="true" />
                {stats.current_streak}
              </p>
              <p className="text-xs text-slate-600">Streak (Best {stats.best_streak})</p>
            </div>
          </div>

          {last7.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Last 7 solve times
              </p>
              <div className="flex items-end gap-2 h-24 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {last7.map((item) => {
                  const pct = Math.max(18, Math.round((item.elapsed_seconds / maxTime) * 100));
                  return (
                    <div
                      key={item.date}
                      className="flex flex-1 flex-col items-center justify-end gap-1 h-full"
                    >
                      <span className="text-[10px] font-mono text-slate-600 tabular-nums">
                        {formatTimer(item.elapsed_seconds, false)}
                      </span>
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full max-w-[32px] rounded-t bg-slate-900"
                        title={`${item.date}: ${formatTimer(item.elapsed_seconds, false)}`}
                      />
                      <span className="text-[10px] text-slate-500">{item.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <Link
          to="/games/mini-crossword/archive"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 underline decoration-slate-400 underline-offset-4 hover:decoration-slate-900"
        >
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Browse past grids
        </Link>
      </div>
    </section>
  );
}
