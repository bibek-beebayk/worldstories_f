import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Check, Play } from "lucide-react";
import { buildMeta } from "@/lib/buildMeta";
import { formatTimer, useMiniArchive } from "@/lib/games/miniCrossword";
import MiniDifficultyChip from "@/components/games/MiniDifficultyChip";

export function meta() {
  return buildMeta({
    title: "Archive — Mini Crossword | WorldStories",
    description: "Play past 5x5 Mini Crossword puzzles from the WorldStories archive.",
    path: "/games/mini-crossword/archive",
  });
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function MiniCrosswordArchive() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMiniArchive(page);
  const items = data?.results ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          to="/games/mini-crossword"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Today&apos;s Mini Crossword
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-bold text-slate-900">Past grids</h1>
        <p className="mt-1 text-sm text-slate-600">
          Archive plays do not change your streak.
        </p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl border border-slate-200 bg-slate-100 animate-pulse motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">No past grids yet. Check back tomorrow.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item.date}>
                <Link
                  to={`/games/mini-crossword/${item.date}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      #{item.number}
                    </span>
                    <span className="text-sm font-medium text-slate-800">
                      {formatShortDate(item.date)}
                    </span>
                    <MiniDifficultyChip difficulty={item.difficulty} />
                    {item.title && (
                      <span className="text-xs text-slate-600">{item.title}</span>
                    )}
                  </div>

                  <div>
                    {item.status === "solved" ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          item.hints_used > 0
                            ? "bg-amber-100 text-amber-950"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.hints_used > 0
                          ? `Solved ${formatTimer(item.elapsed_seconds ?? 0, false)} (${item.hints_used} ${item.hints_used === 1 ? "hint" : "hints"})`
                          : `Solved ${formatTimer(item.elapsed_seconds ?? 0, false)}`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        <Play className="h-3 w-3" aria-hidden="true" />
                        {item.status === "in_progress" ? "Resume" : "Play"}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {(page > 1 || data?.has_next) && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-600">Page {page}</span>
            <button
              type="button"
              disabled={!data?.has_next}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
