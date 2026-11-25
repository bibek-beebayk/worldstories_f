import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Check, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildMeta } from "@/lib/buildMeta";
import { useArchive } from "@/lib/games/nameThatStory";

export function meta() {
  return buildMeta({
    title: "Name That Story Archive | WorldStories",
    description: "Play past Name That Story daily literary puzzles from the WorldStories archive.",
    path: "/games/name-that-story/archive",
  });
}

export default function NameThatStoryArchive() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useArchive(page);
  const items = data?.results ?? [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <Link
            to="/games/name-that-story"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Today&apos;s puzzle
          </Link>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Name That Story Archive</h1>
          <p className="text-sm text-muted-foreground">Archive plays do not change your streak.</p>
        </div>

        {isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">Could not load past puzzles.</p>
              <Button type="button" variant="outline" onClick={() => void refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No past puzzles in the archive yet.
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y rounded-lg border bg-card">
            {items.map((item) => (
              <div key={item.date} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Puzzle #{item.puzzle_number}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === "solved" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Solved {item.guess_count}/6
                    </span>
                  ) : item.status === "failed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900 dark:bg-rose-950/60 dark:text-rose-200">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Missed
                    </span>
                  ) : null}

                  <Button asChild size="sm" variant={item.status === "none" ? "default" : "outline"}>
                    <Link to={`/games/name-that-story/${item.date}`}>
                      <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      {item.status === "none" ? "Play" : "View"}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="tabular-nums">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
