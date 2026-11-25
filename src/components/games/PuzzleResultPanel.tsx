import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BookOpen, Check, Clock, Copy, Headphones, Share2, X } from "lucide-react";
import {
  type PublicPuzzleResponse,
  type PuzzleStatsResponse,
  buildShareText,
  getCountdownToUtcMidnight,
} from "@/lib/games/nameThatStory";

interface PuzzleResultPanelProps {
  puzzle: PublicPuzzleResponse;
  stats?: PuzzleStatsResponse;
}

export default function PuzzleResultPanel({ puzzle, stats }: PuzzleResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [countdown, setCountdown] = useState<string>("--:--:--");

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    const update = () => setCountdown(getCountdownToUtcMidnight().formatted);
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);

  const tokens = puzzle.share_tokens ?? [];
  const solved = puzzle.status === "solved";
  const shareText = buildShareText(
    puzzle.puzzle_number,
    puzzle.status,
    puzzle.guesses_used,
    tokens,
    typeof window !== "undefined"
      ? `${window.location.origin}/games/name-that-story`
      : "https://worldstories.org/games/name-that-story"
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
      // ignore clipboard errors
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `Name That Story #${puzzle.puzzle_number}`,
        text: shareText,
      });
    } catch {
      // user cancelled
    }
  };

  const dist = stats?.guess_distribution ?? { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };
  const maxDist = Math.max(1, ...Object.values(dist));

  return (
    <section
      aria-label="Puzzle result"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6"
    >
      {/* Result headline */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">
            {solved
              ? `You got it in ${puzzle.guesses_used} ${puzzle.guesses_used === 1 ? "guess" : "guesses"}`
              : "Out of guesses for today"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {solved
              ? "Well played. Come back tomorrow for the next puzzle."
              : "Better luck on the next one. Here is today's answer."}
          </p>
        </div>

        {!puzzle.is_archive && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800">
            <Clock className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span className="text-xs text-slate-600">Next puzzle</span>
            <span className="font-mono font-semibold tabular-nums">{countdown}</span>
          </div>
        )}
      </div>

      {/* Answer Card: Story OR Author */}
      {puzzle.answer && puzzle.answer.kind === "story" && (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
          {puzzle.answer.cover ? (
            <img
              src={puzzle.answer.cover}
              alt={puzzle.answer.title}
              className="h-28 w-20 flex-shrink-0 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-28 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-semibold text-slate-700">
              Story
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Today&apos;s story
            </p>
            <h3 className="mt-0.5 font-serif text-xl font-bold text-slate-900">
              {puzzle.answer.title}
            </h3>
            <p className="mt-0.5 text-sm text-slate-700">
              {puzzle.answer.author}
              {puzzle.answer.year ? ` (${puzzle.answer.year})` : ""}
              {puzzle.answer.read_time ? ` · ${puzzle.answer.read_time} min read` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={`/story/${puzzle.answer.slug}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Read it free
              </Link>
              {puzzle.answer.audiobook_slug && (
                <Link
                  to={`/listen/${puzzle.answer.audiobook_slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
                  Listen
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {puzzle.answer && puzzle.answer.kind === "author" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="flex items-center gap-4">
            {puzzle.answer.image ? (
              <img
                src={puzzle.answer.image}
                alt={puzzle.answer.name}
                className="h-16 w-16 flex-shrink-0 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-base font-bold text-white">
                {puzzle.answer.initials || "?"}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Today&apos;s author
              </p>
              <h3 className="mt-0.5 font-serif text-xl font-bold text-slate-900">
                <Link
                  to={`/authors/${puzzle.answer.slug}`}
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
                >
                  {puzzle.answer.name}
                </Link>
              </h3>
              {puzzle.answer.years && (
                <p className="text-sm text-slate-700">{puzzle.answer.years}</p>
              )}
            </div>
          </div>

          {puzzle.answer.works.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Works on WorldStories
              </p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {puzzle.answer.works.map((work) => (
                  <li key={work.id}>
                    <Link
                      to={`/story/${work.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    >
                      <span className="truncate">{work.title}</span>
                      {work.year && (
                        <span className="flex-shrink-0 text-xs text-slate-500">{work.year}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Share Grid & Actions */}
      <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2" aria-label="Guess summary grid">
          {tokens.map((tok, idx) => (
            <span
              key={idx}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold ${
                tok === "right"
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : tok === "wrong"
                  ? "border-red-700 bg-red-700 text-white"
                  : "border-slate-300 bg-slate-100 text-slate-500"
              }`}
              aria-label={`Guess ${idx + 1}: ${tok}`}
            >
              {tok === "right" ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : tok === "wrong" ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : null}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
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
              onClick={handleNativeShare}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </button>
          )}
        </div>
      </div>

      {/* Stats & Guess Distribution */}
      {stats && (
        <div className="border-t border-slate-200 pt-5 space-y-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.played}</p>
              <p className="text-xs text-slate-600">Played</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {stats.win_percentage}%
              </p>
              <p className="text-xs text-slate-600">Win %</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {stats.current_streak}
              </p>
              <p className="text-xs text-slate-600">Streak</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.best_streak}</p>
              <p className="text-xs text-slate-600">Best</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Guess distribution
            </p>
            {[1, 2, 3, 4, 5, 6].map((n) => {
              const count = dist[String(n)] ?? 0;
              const pct = Math.max(8, Math.round((count / maxDist) * 100));
              const highlight = solved && puzzle.guesses_used === n;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-semibold text-slate-700 tabular-nums">{n}</span>
                  <div className="flex-1">
                    <div
                      style={{ width: `${count === 0 ? 8 : pct}%` }}
                      className={`rounded px-2 py-0.5 text-right font-semibold tabular-nums ${
                        highlight ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
