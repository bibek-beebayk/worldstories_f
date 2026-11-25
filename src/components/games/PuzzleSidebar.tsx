import { Link } from "react-router";
import { Archive, BookOpen, Check, Flame, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CoverImage from "@/components/CoverImage";
import type { PuzzleStats, YesterdayAnswerCard } from "@/lib/games/nameThatStory";

interface PuzzleSidebarProps {
  isLoggedIn: boolean;
  onSignIn: () => void;
  stats?: PuzzleStats;
  yesterday?: YesterdayAnswerCard | null;
}

export function PuzzleSidebar({ isLoggedIn, onSignIn, stats, yesterday }: PuzzleSidebarProps) {
  return (
    <aside className="space-y-4">
      {!isLoggedIn && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Playing as a guest</p>
            <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              Sign in to save your streak across devices and keep your puzzle history.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSignIn}
              className="w-full bg-white text-neutral-900 hover:bg-amber-100"
            >
              <LogIn className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Sign in
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Streak card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Flame className="h-4 w-4 text-[#D92F4C]" aria-hidden="true" />
            Daily streak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold tabular-nums text-foreground">{stats?.current_streak ?? 0}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Best: <strong className="text-foreground">{stats?.best_streak ?? 0}</strong>
            </p>
          </div>

          {stats?.week_days && (
            <div className="grid grid-cols-7 gap-1 pt-1">
              {stats.week_days.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">{day.label}</span>
                  <span
                    aria-label={`${day.date}: ${day.solved ? "solved" : "not solved"}`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                      day.solved
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {day.solved ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yesterday's answer card */}
      {yesterday && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Yesterday&apos;s answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                <CoverImage
                  src={yesterday.cover}
                  alt={yesterday.title}
                  title={yesterday.title}
                  author={yesterday.author}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{yesterday.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[yesterday.author || "Unknown author", yesterday.year ? String(yesterday.year) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-[11px] text-muted-foreground">Puzzle #{yesterday.puzzle_number}</p>
              </div>
            </div>
            {yesterday.slug && (
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to={`/story/${yesterday.slug}`}>
                  <BookOpen className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Read it free
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Archive link */}
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Past puzzles</p>
            <p className="text-xs text-muted-foreground">Play previous days from the archive.</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to="/games/name-that-story/archive">
              <Archive className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Archive
            </Link>
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
