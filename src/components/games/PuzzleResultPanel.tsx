import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BookOpen, Check, Clock, Copy, Headphones, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import CoverImage from "@/components/CoverImage";
import { audiobookUrl } from "@/lib/urls";
import {
  buildShareText,
  getUtcMidnightCountdown,
  type PuzzlePayload,
  type PuzzleStats,
} from "@/lib/games/nameThatStory";

interface PuzzleResultPanelProps {
  puzzle: PuzzlePayload;
  stats?: PuzzleStats;
  isArchive: boolean;
}

export function PuzzleResultPanel({ puzzle, stats, isArchive }: PuzzleResultPanelProps) {
  const [countdown, setCountdown] = useState<string>("--:--:--");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    const update = () => setCountdown(getUtcMidnightCountdown(new Date()).formatted);
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const answer = puzzle.answer;
  const tokens = puzzle.share?.tokens ?? [];
  const solved = puzzle.status === "solved";
  const shareText = buildShareText(
    puzzle.puzzle_number,
    solved ? "solved" : "failed",
    puzzle.guesses_used,
    tokens,
    typeof window !== "undefined" ? window.location.origin : "https://worldstories.net",
  );

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(shareText);
      } else {
        const ta = document.createElement("textarea");
        ta.value = shareText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Result copied to clipboard.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy result.");
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({ title: `Name That Story #${puzzle.puzzle_number}`, text: shareText });
    } catch {
      // User dismissed share sheet
    }
  };

  const maxDist = Math.max(1, ...Object.values(stats?.guess_distribution ?? { "1": 1 }));

  return (
    <div className="space-y-5">
      {/* Outcome Banner */}
      <Card
        className={
          solved
            ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-border bg-muted/40"
        }
      >
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {solved
                  ? `You got it in ${puzzle.guesses_used} ${puzzle.guesses_used === 1 ? "guess" : "guesses"}`
                  : "Out of guesses — better luck next time"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isArchive
                  ? "Archive puzzle complete. Archive plays do not change your streak."
                  : "Come back tomorrow for a new opening line."}
              </p>
            </div>
            {!isArchive && (
              <div className="rounded-md border bg-background px-3 py-1.5 text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next puzzle in</p>
                <p className="flex items-center justify-end gap-1 font-mono text-sm font-bold tabular-nums text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {countdown}
                </p>
              </div>
            )}
          </div>

          {/* Answer Story Card */}
          {answer && (
            <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
              <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md bg-muted shadow-sm">
                <CoverImage
                  src={answer.cover}
                  alt={answer.title}
                  title={answer.title}
                  author={answer.author}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">The story was</p>
                <h3 className="font-serif text-lg font-bold text-foreground">{answer.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {[
                    answer.author || null,
                    answer.year ? String(answer.year) : null,
                    answer.read_time ? `${answer.read_time} min read` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild size="sm">
                    <Link to={`/story/${answer.slug}`}>
                      <BookOpen className="mr-1.5 h-4 w-4" aria-hidden="true" />
                      Read it free
                    </Link>
                  </Button>
                  {answer.has_audiobook && answer.audiobook_slug && (
                    <Button asChild size="sm" variant="outline">
                      <Link to={audiobookUrl(answer.audiobook_slug)}>
                        <Headphones className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Listen
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Share Grid Preview + Copy / Share buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Name That Story #{puzzle.puzzle_number} · {solved ? puzzle.guesses_used : "X"}/6
              </p>
              <div className="flex items-center gap-1.5" aria-label="Result grid">
                {tokens.map((tok, i) => (
                  <span
                    key={i}
                    className={`flex h-7 w-7 items-center justify-center rounded text-white ${
                      tok === "right"
                        ? "bg-emerald-600"
                        : tok === "wrong"
                          ? "bg-rose-600"
                          : "border border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {tok === "right" ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : tok === "wrong" ? (
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : null}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
                <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {copied ? "Copied" : "Copy result"}
              </Button>
              {canNativeShare && (
                <Button type="button" size="sm" onClick={() => void handleNativeShare()}>
                  <Share2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats + Guess Distribution */}
      {stats && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-foreground">Your stats</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-xl font-bold tabular-nums text-foreground">{stats.played}</p>
                <p className="text-[11px] text-muted-foreground">Played</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-xl font-bold tabular-nums text-foreground">{stats.win_percentage}%</p>
                <p className="text-[11px] text-muted-foreground">Win rate</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-xl font-bold tabular-nums text-foreground">{stats.current_streak}</p>
                <p className="text-[11px] text-muted-foreground">Streak</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2.5">
                <p className="text-xl font-bold tabular-nums text-foreground">{stats.best_streak}</p>
                <p className="text-[11px] text-muted-foreground">Best</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Guess distribution</p>
              {["1", "2", "3", "4", "5", "6"].map((slot) => {
                const count = stats.guess_distribution[slot] ?? 0;
                const pct = Math.max(count > 0 ? 12 : 4, Math.round((count / maxDist) * 100));
                const isCurrentSlot = solved && String(puzzle.guesses_used) === slot;
                return (
                  <div key={slot} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right font-medium tabular-nums text-muted-foreground">{slot}</span>
                    <div className="flex-1">
                      <div
                        className={`flex h-5 items-center justify-end rounded px-1.5 font-semibold tabular-nums ${
                          isCurrentSlot ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                        }`}
                        style={{ width: `${pct}%` }}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
