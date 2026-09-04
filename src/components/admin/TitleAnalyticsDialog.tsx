import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatTile, ChartCard } from "@/components/admin/charts/AnalyticsCards";
import { BreakdownBarChart } from "@/components/admin/charts/BreakdownBarChart";
import { storyApi } from "@/api/story";
import type { AdminAnalyticsRangeDays, AdminTitleAnalyticsTimeSeries } from "@/api/types";

const formatNumber = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatPeriod = (value: string, interval: "hour" | "day") => {
  const date = new Date(value);
  return interval === "hour"
    ? date.toLocaleTimeString([], { hour: "numeric" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const METRIC_CHARTS = [
  { key: "views", title: "Views", label: "Views" },
  { key: "reads", title: "Reads", label: "Reading sessions" },
  { key: "reading_minutes", title: "Reading time", label: "Minutes" },
  { key: "interactions", title: "Interactions", label: "Interactions" },
] as const;

function MetricBarCharts({ timeSeries }: { timeSeries: AdminTitleAnalyticsTimeSeries }) {
  return (
    <div className="grid gap-4">
      {METRIC_CHARTS.map((metric) => (
        <ChartCard
          key={metric.key}
          title={`${metric.title} by ${timeSeries.interval}`}
          subtitle={`Recorded during the selected ${timeSeries.interval === "hour" ? "24-hour" : "date"} range`}
        >
          <BreakdownBarChart
            data={timeSeries.points}
            xKey="period"
            series={[{ key: metric.key, label: metric.label }]}
            formatX={(value) => formatPeriod(value, timeSeries.interval)}
            formatY={metric.key === "reading_minutes" ? (value) => `${value}m` : undefined}
            height={240}
          />
        </ChartCard>
      ))}
    </div>
  );
}

const AUDIO_METRIC_CHARTS = [
  { key: "listens", title: "Listens", label: "Listening sessions" },
  { key: "listening_minutes", title: "Listening time", label: "Minutes" },
  { key: "read_along_listens", title: "Read Along sessions", label: "Sessions" },
  { key: "read_along_minutes", title: "Read Along time", label: "Minutes" },
] as const;

function AudioMetricBarCharts({ timeSeries }: { timeSeries: AdminTitleAnalyticsTimeSeries }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Audiobook performance</h3>
      {AUDIO_METRIC_CHARTS.map((metric) => (
        <ChartCard
          key={metric.key}
          title={`${metric.title} by ${timeSeries.interval}`}
          subtitle="Listening activity during the selected range"
        >
          <BreakdownBarChart
            data={timeSeries.points}
            xKey="period"
            series={[{ key: metric.key, label: metric.label }]}
            formatX={(value) => formatPeriod(value, timeSeries.interval)}
            formatY={metric.key.includes("minutes") ? (value) => `${value}m` : undefined}
            height={240}
          />
        </ChartCard>
      ))}
    </div>
  );
}

const QUICK_READ_METRIC_CHARTS = [
  { key: "opens", title: "Opens", label: "Opens" },
  { key: "completions", title: "Completions", label: "Completions" },
  { key: "full_story_clicks", title: "Full-story clicks", label: "Clicks" },
  { key: "reading_minutes", title: "Reading time", label: "Minutes" },
] as const;

const RANGE_OPTIONS: { value: AdminAnalyticsRangeDays; label: string }[] = [
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
];

interface TitleAnalyticsDialogProps {
  kind: "story" | "blog" | "quick_read";
  slug: string;
  title: string;
  initialDays?: AdminAnalyticsRangeDays;
}

// One dialog handles both stories and blogs since the shell (trigger,
// header, time-range picker) is identical — only the stat tiles and the
// breakdown table underneath differ enough to warrant branching rather
// than two near-duplicate components.
export function TitleAnalyticsDialog({ kind, slug, title, initialDays = 30 }: TitleAnalyticsDialogProps) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<AdminAnalyticsRangeDays>(initialDays);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDays(initialDays);
    setOpen(nextOpen);
  };

  const storyQuery = useQuery({
    queryKey: ["admin-analytics", "story-detail", slug, days],
    queryFn: () => storyApi.getAdminStoryDetailAnalytics(slug, days),
    enabled: open && kind === "story",
  });
  const blogQuery = useQuery({
    queryKey: ["admin-analytics", "blog-detail", slug, days],
    queryFn: () => storyApi.getAdminBlogDetailAnalytics(slug, days),
    enabled: open && kind === "blog",
  });
  const quickReadQuery = useQuery({
    queryKey: ["admin-analytics", "quick-read-detail", slug, days],
    queryFn: () => storyApi.getAdminQuickReadDetailAnalytics(slug, days),
    enabled: open && kind === "quick_read",
  });

  const activeQuery = kind === "story" ? storyQuery : kind === "blog" ? blogQuery : quickReadQuery;
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        aria-label={`View ${kind === "quick_read" ? "Quick Read " : ""}analytics for ${title}`}
        title={kind === "quick_read" ? "View Quick Read analytics" : "View analytics"}
      >
        {kind === "quick_read" ? <Zap className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
      </Button>
      {/* overflow-auto (not overflow-x-hidden) is deliberate: it's a safety
          net, not the actual fix — if anything below ever still ends up
          wider than the dialog, it becomes scrollable instead of silently
          clipped and inaccessible. */}
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
        <DialogHeader className="flex-row items-start justify-between gap-3 space-y-0 pr-6">
          {/* min-w-0 lets this flex item actually shrink below the title's
              own intrinsic width — flex items default to min-width:auto,
              which otherwise uses the untruncated text width as the floor
              and stretches the whole dialog to fit a one-line title. No
              truncate: a long title wraps to multiple lines instead of
              being cut off, while the range filter stays put on the right
              (shrink-0, so it never gets squeezed by the wrapped title). */}
          <DialogTitle className="min-w-0 flex-1 leading-snug">
            {title}{kind === "quick_read" ? " — Quick Read" : ""}
          </DialogTitle>
          <Select value={String(days)} onValueChange={(value) => setDays(Number(value) as AdminAnalyticsRangeDays)}>
            <SelectTrigger className="w-[150px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && <p className="text-sm text-red-600">Failed to load analytics for this title.</p>}

        {kind === "story" && storyQuery.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Page opens" value={formatNumber(storyQuery.data.page_opens)} />
              <StatTile label="Started reading" value={formatNumber(storyQuery.data.started_reading)} />
              <StatTile label="Completed" value={formatNumber(storyQuery.data.completed_reading)} />
              <StatTile label="Avg. progress" value={formatPercent(storyQuery.data.avg_progress)} />
              <StatTile label="Reading time" value={`${formatNumber(Math.round(storyQuery.data.reading_minutes))}m`} />
              <StatTile label="Favorites" value={formatNumber(storyQuery.data.favorites_count)} />
              <StatTile label="Reviews" value={formatNumber(storyQuery.data.reviews_count)} />
              <StatTile
                label="Avg. rating"
                value={storyQuery.data.reviews_count ? `${storyQuery.data.avg_rating_in_range.toFixed(1)}★` : "—"}
              />
              {storyQuery.data.has_audio && storyQuery.data.audio && (
                <>
                  <StatTile label="Listeners" value={formatNumber(storyQuery.data.audio.listeners)} />
                  <StatTile label="Avg. listen-through" value={formatPercent(storyQuery.data.audio.avg_progress)} />
                  <StatTile
                    label="Listening time"
                    value={`${formatNumber(Math.round(storyQuery.data.audio.listening_minutes))}m`}
                  />
                  <StatTile
                    label="Read Along time"
                    value={`${formatNumber(Math.round(storyQuery.data.audio.read_along_listening_minutes))}m`}
                  />
                </>
              )}
              {storyQuery.data.has_video && storyQuery.data.video && (
                <>
                  <StatTile label="Watchers" value={formatNumber(storyQuery.data.video.watchers)} />
                  <StatTile label="Avg. watch-through" value={formatPercent(storyQuery.data.video.avg_progress)} />
                  <StatTile
                    label="Watching time"
                    value={`${formatNumber(Math.round(storyQuery.data.video.watching_minutes))}m`}
                  />
                </>
              )}
            </div>

            <MetricBarCharts timeSeries={storyQuery.data.time_series} />

            {storyQuery.data.has_audio && (
              <AudioMetricBarCharts timeSeries={storyQuery.data.time_series} />
            )}

            <ChartCard
              title="Chapter breakdown"
              subtitle="Readers and average progress per chapter — where the reader count drops off is where readers are stopping"
            >
              {storyQuery.data.chapter_breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chapter activity in this range yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Chapter</th>
                        <th className="py-2 pr-3 text-right">Readers</th>
                        <th className="py-2 pr-3 text-right">Avg. progress</th>
                        <th className="py-2 text-right">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storyQuery.data.chapter_breakdown.map((row) => (
                        <tr key={row.chapter_slug} className="border-b last:border-0">
                          <td className="max-w-52 truncate py-2 pr-3">
                            {row.chapter_order}. {row.chapter_title}
                          </td>
                          <td className="py-2 pr-3 text-right">{formatNumber(row.readers)}</td>
                          <td className="py-2 pr-3 text-right">{formatPercent(row.avg_progress)}</td>
                          <td className="py-2 text-right">{formatNumber(row.completed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {kind === "blog" && blogQuery.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Page opens" value={formatNumber(blogQuery.data.page_opens)} />
              <StatTile label="Started reading" value={formatNumber(blogQuery.data.started_reading)} />
              <StatTile label="Reading time" value={`${formatNumber(Math.round(blogQuery.data.reading_minutes))}m`} />
              <StatTile
                label="Avg. progress (signed-in)"
                value={formatPercent(blogQuery.data.avg_progress_signed_in)}
              />
              <StatTile label="Completed (signed-in)" value={formatNumber(blogQuery.data.completed_signed_in)} />
              <StatTile
                label="Signed-in readers tracked"
                value={formatNumber(blogQuery.data.signed_in_readers_with_depth_tracked)}
              />
            </div>

            <MetricBarCharts timeSeries={blogQuery.data.time_series} />

            <ChartCard
              title="Reading depth (signed-in readers)"
              subtitle="Anonymous readers only contribute to page opens/started reading above — scroll depth can only be tracked for signed-in readers"
            >
              <BreakdownBarChart
                data={blogQuery.data.progress_distribution_signed_in}
                xKey="bucket"
                series={[{ key: "count", label: "Readers" }]}
                emptyLabel="No signed-in reading activity in this range yet."
              />
            </ChartCard>
          </div>
        )}

        {kind === "quick_read" && quickReadQuery.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Opens" value={formatNumber(quickReadQuery.data.opens)} />
              <StatTile label="Unique readers" value={formatNumber(quickReadQuery.data.unique_readers)} />
              <StatTile label="Completed" value={formatNumber(quickReadQuery.data.completions)} />
              <StatTile label="Completion rate" value={formatPercent(quickReadQuery.data.completion_rate)} />
              <StatTile label="Full-story clicks" value={formatNumber(quickReadQuery.data.full_story_clicks)} />
              <StatTile
                label="Completed → full story"
                value={formatPercent(quickReadQuery.data.full_story_conversion_rate)}
              />
              <StatTile
                label="Clicks after completion"
                value={formatNumber(quickReadQuery.data.clicks_after_completion)}
              />
              <StatTile
                label="Reading time"
                value={`${formatNumber(Math.round(quickReadQuery.data.reading_minutes))}m`}
              />
              <StatTile label="Avg. reading depth" value={formatPercent(quickReadQuery.data.avg_progress)} />
            </div>

            <div className="grid gap-4">
              {QUICK_READ_METRIC_CHARTS.map((metric) => (
                <ChartCard
                  key={metric.key}
                  title={`${metric.title} by ${quickReadQuery.data.time_series.interval}`}
                  subtitle="Quick Read activity during the selected range"
                >
                  <BreakdownBarChart
                    data={quickReadQuery.data.time_series.points}
                    xKey="period"
                    series={[{ key: metric.key, label: metric.label }]}
                    formatX={(value) => formatPeriod(value, quickReadQuery.data.time_series.interval)}
                    formatY={metric.key === "reading_minutes" ? (value) => `${value}m` : undefined}
                    height={240}
                  />
                </ChartCard>
              ))}
            </div>

            <ChartCard
              title="Reading depth"
              subtitle={`${formatNumber(quickReadQuery.data.readers_with_depth_tracked)} signed-in readers had scroll depth recorded`}
            >
              <BreakdownBarChart
                data={quickReadQuery.data.progress_distribution}
                xKey="bucket"
                series={[{ key: "count", label: "Readers" }]}
                emptyLabel="No Quick Read depth activity in this range yet."
              />
            </ChartCard>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
