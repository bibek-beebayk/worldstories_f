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
    <div className="overflow-x-auto">
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
            <tr key={row.id} className="border-b last:border-0">
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

  if (!title) return table;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {viewAllHref && (
          <Button asChild variant="outline" size="sm">
            <Link to={viewAllHref}>View all</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>{table}</CardContent>
    </Card>
  );
}
