import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TitleAnalyticsDialog } from "@/components/admin/TitleAnalyticsDialog";
import type { AdminAnalyticsRangeDays, AdminContentPerformanceRow } from "@/api/types";

const number = (value: number) => value.toLocaleString();
const minutes = (value: number) => `${number(Math.round(value))}m`;

interface ContentPerformanceTableProps {
  title?: string;
  rows: AdminContentPerformanceRow[];
  kind: "story" | "audiobook" | "quick_read" | "blog";
  days: AdminAnalyticsRangeDays;
  viewAllHref?: string;
  emptyMessage?: string;
}

export function ContentPerformanceTable({
  title,
  rows,
  kind,
  days,
  viewAllHref,
  emptyMessage = "No activity was recorded in this interval.",
}: ContentPerformanceTableProps) {
  const isAudiobook = kind === "audiobook";
  const isQuickRead = kind === "quick_read";
  const table = (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[940px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4">Content</th>
            <th className="py-2 pr-4 text-right">Score</th>
            <th className="py-2 pr-4 text-right">{isQuickRead ? "Opens" : "Views"}</th>
            <th className="py-2 pr-4 text-right">{isAudiobook ? "Listens" : "Reads"}</th>
            <th className="py-2 pr-4 text-right">{isAudiobook ? "Listeners" : "Readers"}</th>
            <th className="py-2 pr-4 text-right">{isAudiobook ? "Listening" : "Reading"}</th>
            {kind === "story" && <th className="py-2 pr-4 text-right">All engagement</th>}
            <th className="py-2 pr-4 text-right">Interactions</th>
            <th className="py-2 text-right">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-primary/[0.04]">
              <td className="max-w-[300px] py-3 pr-4 font-medium">
                <span className="line-clamp-2">{row.title}</span>
              </td>
              <td className="py-3 pr-4 text-right font-semibold">{number(row.performance_score)}</td>
              <td className="py-3 pr-4 text-right">{number(row.views)}</td>
              <td className="py-3 pr-4 text-right">{number(isAudiobook ? row.listens : row.reads)}</td>
              <td className="py-3 pr-4 text-right">{number(isAudiobook ? row.unique_listeners : row.unique_readers)}</td>
              <td className="py-3 pr-4 text-right">{minutes(isAudiobook ? row.listening_minutes : row.reading_minutes)}</td>
              {kind === "story" && (
                <td className="py-3 pr-4 text-right">{minutes(row.engagement_minutes)}</td>
              )}
              <td className="py-3 pr-4 text-right">{number(row.interactions)}</td>
              <td className="py-3 text-right">
                <TitleAnalyticsDialog
                  kind={kind === "blog" ? "blog" : isQuickRead ? "quick_read" : "story"}
                  slug={row.slug}
                  title={row.title}
                  initialDays={days}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={kind === "story" ? 9 : 8} className="py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
  const mobileCards = (
    <div className="space-y-2 sm:hidden">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{row.title}</p>
            <TitleAnalyticsDialog
              kind={kind === "blog" ? "blog" : isQuickRead ? "quick_read" : "story"}
              slug={row.slug}
              title={row.title}
              initialDays={days}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/40 px-1.5 py-2">
              <p className="text-sm font-semibold">{number(row.performance_score)}</p>
              <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">Score</p>
            </div>
            <div className="rounded-md bg-muted/40 px-1.5 py-2">
              <p className="text-sm font-semibold">{number(row.views)}</p>
              <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">{isQuickRead ? "Opens" : "Views"}</p>
            </div>
            <div className="rounded-md bg-muted/40 px-1.5 py-2">
              <p className="text-sm font-semibold">{number(isAudiobook ? row.listens : row.reads)}</p>
              <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">{isAudiobook ? "Listens" : "Reads"}</p>
            </div>
          </div>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );

  if (!title) return <>{mobileCards}{table}</>;
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b bg-gradient-to-r from-primary/[0.07] via-muted/20 to-transparent px-3 py-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
        {viewAllHref && (
          <Button asChild variant="outline" size="sm">
            <Link to={viewAllHref}>View all</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-6">{mobileCards}{table}</CardContent>
    </Card>
  );
}
