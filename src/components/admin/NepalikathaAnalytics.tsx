import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { AdminAnalyticsRangeDays } from "@/api/types";
import { StatTile, ChartCard } from "./charts/AnalyticsCards";
import { TrendLineChart } from "./charts/TrendLineChart";

function duration(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${(seconds / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} min`;
}

export default function NepalikathaAnalytics({ days }: { days: AdminAnalyticsRangeDays }) {
  const query = useQuery({
    queryKey: ["admin-analytics", "nepalikatha", days],
    queryFn: () => storyApi.getAdminNepalikathaAnalytics(days),
  });
  const data = query.data;
  const formatPeriod = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    if (data?.time_interval === "hour") return date.toLocaleTimeString([], { hour: "numeric" });
    if (data?.time_interval === "month") return date.toLocaleDateString([], { month: "short", year: "numeric" });
    const label = date.toLocaleDateString([], { month: "short", day: "numeric" });
    return data?.time_interval === "week" ? `Week of ${label}` : label;
  };
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading Nepalikatha analytics…</p>;
  if (query.isError) return <div role="alert"><p>Failed to load Nepalikatha analytics.</p><button className="text-primary underline" onClick={() => query.refetch()}>Retry</button></div>;
  if (!data) return null;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Nepalikatha only. Unique visitors are anonymous browser identities, not accounts. A reading session is one story read in a browser tab session, across its chapters. Active reading pauses after 60 seconds without interaction, or while the chapter is off-screen, hidden or unfocused. These events do not affect main-site statistics.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Unique visitors" value={data.visitors.toLocaleString()} />
        <StatTile label="Page views" value={data.page_views.toLocaleString()} />
        <StatTile label="Readers" value={data.readers.toLocaleString()} />
        <StatTile label="Distinct stories read" value={data.stories_read.toLocaleString()} />
        <StatTile label="Story reading sessions" value={data.reading_sessions.toLocaleString()} />
        <StatTile label="Active reading time" value={duration(data.reading_seconds)} />
        <StatTile label="Time per reading session" value={duration(data.average_reading_seconds)} />
      </div>
      {data.visitors === 0 && <p className="text-sm text-muted-foreground">No Nepalikatha activity recorded in this range. Collection starts when the new tracker is deployed.</p>}
      <ChartCard title="Nepalikatha visitors and page views">
        <TrendLineChart data={data.over_time} xKey="day" formatX={formatPeriod} series={[{ key: "visitors", label: "Visitors" }, { key: "page_views", label: "Page views" }]} />
      </ChartCard>
      <ChartCard title="Active reading time">
        <TrendLineChart data={data.over_time} xKey="day" formatX={formatPeriod} series={[{ key: "reading_seconds", label: "Active time" }]} formatY={duration} />
      </ChartCard>
      <ChartCard title="Most read Nepalikatha stories">
        {data.top_stories.length === 0 ? <p className="text-sm text-muted-foreground">No reading activity in this range.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="py-3">Story</th><th>Readers</th><th>Reading sessions</th><th>Active time</th></tr></thead>
            <tbody>{data.top_stories.map((story) => <tr key={story.slug} className="border-b"><td className="py-3 pr-4">{story.title}</td><td>{story.readers.toLocaleString()}</td><td>{story.reads.toLocaleString()}</td><td>{duration(story.reading_seconds)}</td></tr>)}</tbody>
          </table></div>
        )}
      </ChartCard>
    </div>
  );
}
