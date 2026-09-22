import NepalikathaAnalytics from "@/components/admin/NepalikathaAnalytics";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FullScreenLoader from "@/components/FullScreenLoader";
import { getAccessToken } from "@/api/client";
import { authApi } from "@/api/auth";
import { storyApi } from "@/api/story";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendLineChart } from "@/components/admin/charts/TrendLineChart";
import { BreakdownBarChart } from "@/components/admin/charts/BreakdownBarChart";
import { CountryHeatmapMap } from "@/components/admin/charts/CountryHeatmapMap";
import { StatTile, ChartCard } from "@/components/admin/charts/AnalyticsCards";
import { AnalyticsExportDialog } from "@/components/admin/AnalyticsExportDialog";
import { ContentPerformanceTable } from "@/components/admin/ContentPerformanceTable";
import type { AdminAnalyticsRangeDays, AdminAnalyticsTimeInterval } from "@/api/types";
import { formatBytes } from "@/lib/utils";
import { BookOpen, Eye, Heart, Star } from "lucide-react";

const formatNumber = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const formatPercentPoints = (value: number) => `${Math.round(value)}%`;
const formatAnalyticsPeriod = (interval: AdminAnalyticsTimeInterval) => (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (interval === "hour") return date.toLocaleTimeString([], { hour: "numeric" });
  if (interval === "month") return date.toLocaleDateString([], { month: "short", year: "numeric" });
  const label = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return interval === "week" ? `Week of ${label}` : label;
};

const RANGE_OPTIONS: { value: AdminAnalyticsRangeDays; label: string }[] = [
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
  { value: "all", label: "All time" },
];

const TAB_OPTIONS: Array<{ value: TabKey; label: string }> = [
  { value: "content", label: "Content" },
  { value: "engagement", label: "Engagement" },
  { value: "metrics", label: "Metrics" },
  { value: "audience", label: "Audience" },
  { value: "users", label: "Users" },
  { value: "geography", label: "Geography" },
  { value: "submissions", label: "Submissions" },
  { value: "nepalikatha", label: "Nepalikatha" },
];

type TabKey =
  | "content"
  | "engagement"
  | "metrics"
  | "audience"
  | "users"
  | "geography"
  | "submissions"
  | "nepalikatha";

const AdminAnalytics = () => {
  const isAuthenticated = Boolean(getAccessToken());
  const [activeTab, setActiveTab] = useState<TabKey>("content");
  const [days, setDays] = useState<AdminAnalyticsRangeDays>(30);
  const averagePerDay = (value: number) => days === "all" ? undefined : `${(value / days).toFixed(1)}/day`;

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);
  const canFetch = isAuthenticated && isSuperuser;

  const contentQuery = useQuery({
    queryKey: ["admin-analytics", "content", days],
    queryFn: () => storyApi.getAdminAnalyticsContent(days),
    enabled: canFetch && activeTab === "content",
  });
  const engagementQuery = useQuery({
    queryKey: ["admin-analytics", "engagement", days],
    queryFn: () => storyApi.getAdminAnalyticsEngagement(days),
    enabled: canFetch && activeTab === "engagement",
  });
  const usersQuery = useQuery({
    queryKey: ["admin-analytics", "users", days],
    queryFn: () => storyApi.getAdminAnalyticsUsers(days),
    enabled: canFetch && activeTab === "users",
  });
  const audienceQuery = useQuery({
    queryKey: ["admin-analytics", "audience", days],
    queryFn: () => storyApi.getAdminAnalyticsAudience(days),
    enabled: canFetch && activeTab === "audience",
  });
  const submissionsQuery = useQuery({
    queryKey: ["admin-analytics", "submissions", days],
    queryFn: () => storyApi.getAdminAnalyticsSubmissions(days),
    enabled: canFetch && activeTab === "submissions",
  });
  const geographyQuery = useQuery({
    queryKey: ["admin-analytics", "geography", days],
    queryFn: () => storyApi.getAdminAnalyticsGeography(days),
    enabled: canFetch && activeTab === "geography",
  });

  const metricsQuery = useQuery({
    queryKey: ["admin-analytics-engagement-metrics", days],
    queryFn: () => storyApi.getAdminAnalyticsEngagementMetrics(days),
    enabled: canFetch && activeTab === "metrics",
  });

  const cumulativeSignups = useMemo(() => {
    const data = usersQuery.data;
    if (!data) return [];
    const rangeTotal = data.signups_over_time.reduce((sum, row) => sum + row.count, 0);
    let running = data.total_users - rangeTotal;
    return data.signups_over_time.map((row) => {
      running += row.count;
      return { day: row.day, cumulative: running };
    });
  }, [usersQuery.data]);

  const submissionsByDay = useMemo(() => {
    const data = submissionsQuery.data;
    if (!data) return { rows: [], statuses: [] as string[] };
    const statuses = Array.from(new Set(data.submissions_over_time.map((row) => row.status)));
    const byDay = new Map<string, Record<string, number> & { day: string }>();
    for (const row of data.submissions_over_time) {
      const entry = byDay.get(row.day) ?? { day: row.day };
      entry[row.status] = row.count;
      byDay.set(row.day, entry);
    }
    return {
      rows: Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)),
      statuses,
    };
  }, [submissionsQuery.data]);

  if (meLoading) {
    return <FullScreenLoader />;
  }

  if (!isSuperuser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto sm:space-y-4 sm:pr-1">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-gradient-to-r from-muted/60 via-muted/20 to-transparent p-2 sm:flex sm:justify-end sm:px-4 sm:py-3">
        <Select value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <SelectTrigger aria-label="Analytics section" className="min-w-0 bg-card sm:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAB_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
          <Select
            value={String(days)}
            onValueChange={(value) => setDays(value === "all" ? "all" : Number(value) as AdminAnalyticsRangeDays)}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
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
          {activeTab !== "nepalikatha" && <AnalyticsExportDialog days={days} />}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
        <div className="hidden -mx-1 overflow-x-auto px-1 pb-1 sm:block">
          <TabsList className="w-max">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="nepalikatha">Nepalikatha</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="nepalikatha"><NepalikathaAnalytics days={days} /></TabsContent>

        <TabsContent value="content" className="space-y-4">
          {contentQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {contentQuery.isError && (
            <p className="text-sm text-red-600">Failed to load content analytics.</p>
          )}
          {contentQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-5">
                <StatTile label="Stories" value={formatNumber(contentQuery.data.stories_count)} />
                <StatTile label="Audiobooks" value={formatNumber(contentQuery.data.audiobooks_count)} />
                <StatTile label="Watchable Stories" value={formatNumber(contentQuery.data.watchable_count)} />
                <StatTile label="Quick Reads" value={formatNumber(contentQuery.data.quick_read_count)} />
                <StatTile label="Blog posts" value={formatNumber(contentQuery.data.blog_posts_count)} />
              </div>

              <ContentPerformanceTable
                title="Top performing content"
                rows={contentQuery.data.top_stories}
                kind="story"
                days={days}
                viewAllHref={`/admin/analytics/content-performance?kind=story&days=${days}`}
              />

              <ContentPerformanceTable
                title="Top performing audiobooks"
                rows={contentQuery.data.top_audiobooks}
                kind="audiobook"
                days={days}
                viewAllHref={`/admin/analytics/content-performance?kind=audiobook&days=${days}`}
              />

              <ContentPerformanceTable
                title="Top performing Quick Reads"
                rows={contentQuery.data.top_quick_reads}
                kind="quick_read"
                days={days}
                viewAllHref={`/admin/analytics/content-performance?kind=quick_read&days=${days}`}
              />

              <ContentPerformanceTable
                title="Top performing blogs"
                rows={contentQuery.data.top_blogs}
                kind="blog"
                days={days}
                viewAllHref={`/admin/analytics/content-performance?kind=blog&days=${days}`}
              />

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Views over time" subtitle="Real, de-duplicated story views">
                  <TrendLineChart
                    data={contentQuery.data.views_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Views" }]}
                    formatX={formatAnalyticsPeriod(contentQuery.data.time_interval)}
                    previousData={contentQuery.data.comparison?.views_over_time}
                  />
                </ChartCard>
                <ChartCard title="Publishing velocity" subtitle={`Stories added per ${contentQuery.data.publishing_interval}`}>
                  <TrendLineChart
                    data={contentQuery.data.publishing_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Stories published" }]}
                    formatX={formatAnalyticsPeriod(contentQuery.data.publishing_interval)}
                    previousData={contentQuery.data.comparison?.publishing_over_time}
                  />
                </ChartCard>
                <ChartCard title="Blog publishing velocity" subtitle={`Blog posts published per ${contentQuery.data.time_interval}`}>
                  <TrendLineChart
                    data={contentQuery.data.blog_publishing_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Posts published" }]}
                    formatX={formatAnalyticsPeriod(contentQuery.data.time_interval)}
                    previousData={contentQuery.data.comparison?.blog_publishing_over_time}
                  />
                </ChartCard>
              </div>

              <ChartCard title="Genre performance" subtitle="Across the whole published catalogue">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {contentQuery.data.genre_performance.map((genre) => (
                    <div
                      key={genre.id}
                      className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-card p-3 shadow-sm"
                    >
                      <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
                      <div className="flex items-center justify-between gap-3 pl-1">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-1 ring-primary/15">
                            {genre.name.slice(0, 1).toUpperCase()}
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{genre.name}</p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          <Star className="h-3 w-3 fill-current" />
                          {genre.avg_rating.toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-1.5 pl-1">
                        <div className="rounded-lg border bg-background/70 px-2 py-2 text-center">
                          <BookOpen className="mx-auto mb-1 h-3.5 w-3.5 text-primary" />
                          <p className="text-sm font-bold">{formatNumber(genre.stories_count)}</p>
                          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Stories</p>
                        </div>
                        <div className="rounded-lg border bg-background/70 px-2 py-2 text-center">
                          <Eye className="mx-auto mb-1 h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                          <p className="text-sm font-bold">{formatNumber(genre.total_views)}</p>
                          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Views</p>
                        </div>
                        <div className="rounded-lg border bg-background/70 px-2 py-2 text-center">
                          <Heart className="mx-auto mb-1 h-3.5 w-3.5 text-rose-500" />
                          <p className="text-sm font-bold">{formatNumber(genre.total_favorites)}</p>
                          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Favorites</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {contentQuery.data.genre_performance.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No published stories with genres yet.
                    </p>
                  )}
                </div>
                <div className="hidden">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-4">Genre</th>
                        <th className="py-2 pr-4">Stories</th>
                        <th className="py-2 pr-4">Avg rating</th>
                        <th className="py-2 pr-4">Total views</th>
                        <th className="py-2 pr-4">Favorites</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentQuery.data.genre_performance.map((genre) => (
                        <tr key={genre.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{genre.name}</td>
                          <td className="py-2 pr-4">{formatNumber(genre.stories_count)}</td>
                          <td className="py-2 pr-4">{genre.avg_rating.toFixed(1)}★</td>
                          <td className="py-2 pr-4">{formatNumber(genre.total_views)}</td>
                          <td className="py-2 pr-4">{formatNumber(genre.total_favorites)}</td>
                        </tr>
                      ))}
                      {contentQuery.data.genre_performance.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-muted-foreground">
                            No published stories with genres yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ChartCard>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Story type breakdown">
                  <BreakdownBarChart
                    data={contentQuery.data.story_type_breakdown}
                    xKey="story_type"
                    series={[{ key: "count", label: "Stories" }]}
                  />
                </ChartCard>
                <ChartCard title="Completion status" subtitle="Completed vs. ongoing stories">
                  <BreakdownBarChart
                    data={contentQuery.data.completion_split.map((row) => ({
                      ...row,
                      label: row.is_completed ? "Completed" : "Ongoing",
                    }))}
                    xKey="label"
                    series={[{ key: "count", label: "Stories" }]}
                  />
                </ChartCard>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {engagementQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {engagementQuery.isError && (
            <p className="text-sm text-red-600">Failed to load engagement analytics.</p>
          )}
          {engagementQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <StatTile
                  label="View → read conversion"
                  value={formatPercent(engagementQuery.data.view_to_read_conversion.conversion_rate)}
                />
                <StatTile
                  label="Story views"
                  value={formatNumber(engagementQuery.data.view_to_read_conversion.views)}
                  current={engagementQuery.data.view_to_read_conversion.views}
                  previous={engagementQuery.data.comparison?.view_to_read_conversion.views}
                  average={averagePerDay(engagementQuery.data.view_to_read_conversion.views)}
                />
                <StatTile
                  label="Readers who started"
                  value={formatNumber(engagementQuery.data.view_to_read_conversion.readers)}
                  current={engagementQuery.data.view_to_read_conversion.readers}
                  previous={engagementQuery.data.comparison?.view_to_read_conversion.readers}
                  average={averagePerDay(engagementQuery.data.view_to_read_conversion.readers)}
                />
                <StatTile
                  label="Audio listen-through"
                  value={formatPercent(engagementQuery.data.audio_listen_through.avg_progress)}
                />
                <StatTile
                  label="Video watch-through"
                  value={formatPercent(engagementQuery.data.video_watch_through.avg_progress)}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Reading progress distribution" subtitle="How far readers get into a story">
                  <BreakdownBarChart
                    data={engagementQuery.data.reading_progress_buckets}
                    xKey="bucket"
                    series={[{ key: "count", label: "Readers" }]}
                  />
                </ChartCard>
                <ChartCard title="Chapter drop-off" subtitle="Avg. progress by chapter position, across all stories">
                  <TrendLineChart
                    data={engagementQuery.data.chapter_dropoff}
                    xKey="position_bucket"
                    series={[{ key: "avg_progress", label: "Avg progress" }]}
                    formatX={(v) => v}
                    formatY={(v) => `${Math.round(v * 100)}%`}
                    yDomain={[0, 1]}
                    yAxisWidth={44}
                    previousData={engagementQuery.data.comparison?.chapter_dropoff}
                  />
                </ChartCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Favorites over time">
                  <TrendLineChart
                    data={engagementQuery.data.favorites_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Favorites" }]}
                    formatX={formatAnalyticsPeriod(engagementQuery.data.time_interval)}
                    previousData={engagementQuery.data.comparison?.favorites_over_time}
                  />
                </ChartCard>
                <ChartCard title="Rating trend" subtitle={`Average rating of reviews submitted per ${engagementQuery.data.time_interval}`}>
                  <TrendLineChart
                    data={engagementQuery.data.rating_trend}
                    xKey="day"
                    series={[{ key: "avg_rating", label: "Avg rating" }]}
                    formatX={formatAnalyticsPeriod(engagementQuery.data.time_interval)}
                    previousData={engagementQuery.data.comparison?.rating_trend}
                  />
                </ChartCard>
              </div>

              <ChartCard title="Rating distribution">
                <BreakdownBarChart
                  data={engagementQuery.data.rating_distribution.map((row) => ({
                    ...row,
                    rating: `${row.rating}★`,
                  }))}
                  xKey="rating"
                  series={[{ key: "count", label: "Reviews" }]}
                />
              </ChartCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          {audienceQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {audienceQuery.isError && (
            <p className="text-sm text-red-600">Failed to load audience analytics.</p>
          )}
          {audienceQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
                <StatTile label="Visitors" value={formatNumber(audienceQuery.data.summary.visitors)} current={audienceQuery.data.summary.visitors} previous={audienceQuery.data.comparison?.summary.visitors} average={averagePerDay(audienceQuery.data.summary.visitors)} />
                <StatTile label="Returning visitors" value={formatNumber(audienceQuery.data.summary.returning_visitors)} current={audienceQuery.data.summary.returning_visitors} previous={audienceQuery.data.comparison?.summary.returning_visitors} average={averagePerDay(audienceQuery.data.summary.returning_visitors)} />
                <StatTile label="Return rate" value={formatPercent(audienceQuery.data.summary.returning_rate)} />
                <StatTile label="Readers" value={formatNumber(audienceQuery.data.summary.readers)} current={audienceQuery.data.summary.readers} previous={audienceQuery.data.comparison?.summary.readers} average={averagePerDay(audienceQuery.data.summary.readers)} />
                <StatTile label="Returning readers" value={formatNumber(audienceQuery.data.summary.returning_readers)} />
                <StatTile label="Reader retention" value={formatPercent(audienceQuery.data.summary.reader_retention_rate)} />
                <StatTile label="Ad impressions" value={formatNumber(audienceQuery.data.summary.ad_impressions)} current={audienceQuery.data.summary.ad_impressions} previous={audienceQuery.data.comparison?.summary.ad_impressions} average={averagePerDay(audienceQuery.data.summary.ad_impressions)} />
                <StatTile label="Downloads" value={formatNumber(audienceQuery.data.summary.downloads)} current={audienceQuery.data.summary.downloads} previous={audienceQuery.data.comparison?.summary.downloads} average={averagePerDay(audienceQuery.data.summary.downloads)} />
                <StatTile label="Unique downloaders" value={formatNumber(audienceQuery.data.summary.unique_downloaders)} />
                <StatTile label="Completions" value={formatNumber(audienceQuery.data.summary.completions)} current={audienceQuery.data.summary.completions} previous={audienceQuery.data.comparison?.summary.completions} average={averagePerDay(audienceQuery.data.summary.completions)} />
                <StatTile label="Completion rate" value={formatPercent(audienceQuery.data.summary.completion_rate)} />
                <StatTile label="Reading time" value={`${formatNumber(Math.round(audienceQuery.data.summary.reading_minutes))}m`} />
                <StatTile label="Listening time" value={`${formatNumber(Math.round(audienceQuery.data.summary.listening_minutes))}m`} />
                <StatTile label="Read Along time" value={`${formatNumber(Math.round(audienceQuery.data.summary.read_along_listening_minutes))}m`} />
                <StatTile label="Watching time" value={`${formatNumber(Math.round(audienceQuery.data.summary.watching_minutes))}m`} />
                <StatTile label="Blog reading time" value={`${formatNumber(Math.round(audienceQuery.data.summary.blog_reading_minutes))}m`} />
                <StatTile label="Quick Read time" value={`${formatNumber(Math.round(audienceQuery.data.summary.quick_read_reading_minutes))}m`} />
                <StatTile label="Avg session" value={`${audienceQuery.data.summary.avg_session_minutes}m`} />
                <StatTile label="Page views" value={formatNumber(audienceQuery.data.summary.total_page_views)} />
                <StatTile
                  label="Median browsing session"
                  value={`${audienceQuery.data.summary.median_browsing_session_minutes}m`}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="New vs. returning visitors" subtitle="Anonymous browsers and signed-in users, de-duplicated by day">
                  <TrendLineChart
                    data={audienceQuery.data.visitor_retention}
                    xKey="day"
                    series={[
                      { key: "new_visitors", label: "New" },
                      { key: "returning_visitors", label: "Returning" },
                    ]}
                    formatX={formatAnalyticsPeriod(audienceQuery.data.time_interval)}
                    previousData={audienceQuery.data.comparison?.visitor_retention}
                  />
                </ChartCard>
                <ChartCard title="Reading, listening & watching time" subtitle="Measured active session minutes">
                  <TrendLineChart
                    data={audienceQuery.data.daily_activity}
                    xKey="day"
                    series={[
                      { key: "reading_minutes", label: "Reading minutes" },
                      { key: "listening_minutes", label: "Listening minutes" },
                      { key: "watching_minutes", label: "Watching minutes" },
                    ]}
                    formatX={formatAnalyticsPeriod(audienceQuery.data.time_interval)}
                    previousData={audienceQuery.data.comparison?.daily_activity}
                  />
                </ChartCard>
              </div>

              <ChartCard title="Monetization and engagement signals" subtitle="Viewable ads, successful offline saves, and completion milestones">
                <TrendLineChart
                  data={audienceQuery.data.daily_activity}
                  xKey="day"
                  series={[
                    { key: "ad_impressions", label: "Ad impressions" },
                    { key: "downloads", label: "Downloads" },
                    { key: "completions", label: "Completions" },
                  ]}
                  formatX={formatAnalyticsPeriod(audienceQuery.data.time_interval)}
                  previousData={audienceQuery.data.comparison?.daily_activity}
                />
              </ChartCard>

              <div className="grid gap-4 xl:grid-cols-3">
                <ChartCard title="Downloads by format">
                  <BreakdownBarChart
                    data={audienceQuery.data.download_types}
                    xKey="content_type"
                    series={[{ key: "count", label: "Downloads" }]}
                  />
                </ChartCard>
                <ChartCard title="Completions by format">
                  <BreakdownBarChart
                    data={audienceQuery.data.completion_types}
                    xKey="content_type"
                    series={[{ key: "count", label: "Completions" }]}
                  />
                </ChartCard>
                <ChartCard title="Ad impressions by content type">
                  <BreakdownBarChart
                    data={audienceQuery.data.ad_impressions_by_content_type}
                    xKey="content_type"
                    series={[{ key: "count", label: "Impressions" }]}
                  />
                </ChartCard>
                <ChartCard title="Referral sources">
                  <BreakdownBarChart
                    data={audienceQuery.data.referral_sources}
                    xKey="referral_source"
                    series={[{ key: "count", label: "Visits" }]}
                  />
                </ChartCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <ChartCard title="Ad placements" subtitle="Impressions require 50% visibility for one second">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Path</th><th className="py-2 pr-3">Size</th><th className="py-2 text-right">Views</th></tr></thead>
                      <tbody>
                        {audienceQuery.data.ad_placements.map((row) => (
                          <tr key={`${row.path}-${row.size}`} className="border-b last:border-0"><td className="max-w-44 truncate py-2 pr-3">{row.path}</td><td className="py-2 pr-3 capitalize">{row.size}</td><td className="py-2 text-right">{formatNumber(row.count)}</td></tr>
                        ))}
                        {audienceQuery.data.ad_placements.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No ad impressions yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                <ChartCard title="Top downloaded titles">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Title</th><th className="py-2 pr-3 text-right">Items</th><th className="py-2 text-right">Data</th></tr></thead>
                      <tbody>
                        {audienceQuery.data.top_downloads.map((row) => (
                          <tr key={row.story_id} className="border-b last:border-0"><td className="max-w-44 truncate py-2 pr-3">{row.title}</td><td className="py-2 pr-3 text-right">{formatNumber(row.count)}</td><td className="py-2 text-right">{formatBytes(row.bytes)}</td></tr>
                        ))}
                        {audienceQuery.data.top_downloads.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No downloads yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                <ChartCard title="Top listening titles">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Title</th><th className="py-2 pr-3 text-right">Sessions</th><th className="py-2 text-right">Minutes</th></tr></thead>
                      <tbody>
                        {audienceQuery.data.top_listened.map((row) => (
                          <tr key={row.story_id} className="border-b last:border-0"><td className="max-w-44 truncate py-2 pr-3">{row.title}</td><td className="py-2 pr-3 text-right">{formatNumber(row.sessions)}</td><td className="py-2 text-right">{row.minutes}</td></tr>
                        ))}
                        {audienceQuery.data.top_listened.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No listening sessions yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                <ChartCard title="Top Read Along titles">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Title</th><th className="py-2 pr-3 text-right">Sessions</th><th className="py-2 text-right">Minutes</th></tr></thead>
                      <tbody>
                        {audienceQuery.data.top_read_along.map((row) => (
                          <tr key={row.story_id} className="border-b last:border-0"><td className="max-w-44 truncate py-2 pr-3">{row.title}</td><td className="py-2 pr-3 text-right">{formatNumber(row.sessions)}</td><td className="py-2 text-right">{row.minutes}</td></tr>
                        ))}
                        {audienceQuery.data.top_read_along.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No Read Along sessions yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                <ChartCard title="Top watching titles">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Title</th><th className="py-2 pr-3 text-right">Sessions</th><th className="py-2 text-right">Minutes</th></tr></thead>
                      <tbody>
                        {audienceQuery.data.top_watched.map((row) => (
                          <tr key={row.story_id} className="border-b last:border-0"><td className="max-w-44 truncate py-2 pr-3">{row.title}</td><td className="py-2 pr-3 text-right">{formatNumber(row.sessions)}</td><td className="py-2 text-right">{row.minutes}</td></tr>
                        ))}
                        {audienceQuery.data.top_watched.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No watching sessions yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                <ChartCard title="Top read blog posts">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">Title</th><th className="py-2 pr-3 text-right">Sessions</th><th className="py-2 text-right">Minutes</th></tr></thead>
                      <tbody>
                        {audienceQuery.data.top_blogs_read.map((row) => (
                          <tr key={row.blog_id} className="border-b last:border-0"><td className="max-w-44 truncate py-2 pr-3">{row.title}</td><td className="py-2 pr-3 text-right">{formatNumber(row.sessions)}</td><td className="py-2 text-right">{row.minutes}</td></tr>
                        ))}
                        {audienceQuery.data.top_blogs_read.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No blog reading sessions yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              </div>

              <ChartCard title="Top pages visited" subtitle="By page views, this range">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Path</th>
                        <th className="py-2 pr-3 text-right">Views</th>
                        <th className="py-2 text-right">Unique visitors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audienceQuery.data.top_pages.map((row) => (
                        <tr key={row.path} className="border-b last:border-0">
                          <td className="max-w-xs truncate py-2 pr-3 font-mono text-xs">{row.path}</td>
                          <td className="py-2 pr-3 text-right">{formatNumber(row.views)}</td>
                          <td className="py-2 text-right">{formatNumber(row.unique_visitors)}</td>
                        </tr>
                      ))}
                      {audienceQuery.data.top_pages.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-muted-foreground">
                            No page views yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {usersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {usersQuery.isError && <p className="text-sm text-red-600">Failed to load user analytics.</p>}
          {usersQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <StatTile label="Total users" value={formatNumber(usersQuery.data.total_users)} />
                <StatTile
                  label={`Active in range`}
                  value={formatNumber(usersQuery.data.active_users)}
                  current={usersQuery.data.active_users}
                  previous={usersQuery.data.comparison?.active_users}
                  average={averagePerDay(usersQuery.data.active_users)}
                />
                <StatTile
                  label="OTP verification rate"
                  value={formatPercent(usersQuery.data.otp_conversion.rate)}
                />
                <StatTile
                  label="New signups in range"
                  value={formatNumber(usersQuery.data.otp_conversion.joined)}
                  current={usersQuery.data.otp_conversion.joined}
                  previous={usersQuery.data.comparison?.otp_conversion.joined}
                  average={averagePerDay(usersQuery.data.otp_conversion.joined)}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="New signups" subtitle={`New accounts per ${usersQuery.data.time_interval}`}>
                  <TrendLineChart
                    data={usersQuery.data.signups_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Signups" }]}
                    formatX={formatAnalyticsPeriod(usersQuery.data.time_interval)}
                    previousData={usersQuery.data.comparison?.signups_over_time}
                  />
                </ChartCard>
                <ChartCard title="Cumulative user growth">
                  <TrendLineChart
                    data={cumulativeSignups}
                    xKey="day"
                    series={[{ key: "cumulative", label: "Total users" }]}
                    formatX={formatAnalyticsPeriod(usersQuery.data.time_interval)}
                  />
                </ChartCard>
              </div>

              <ChartCard title="Login frequency" subtitle="All-time login count per user">
                <BreakdownBarChart
                  data={usersQuery.data.login_frequency_buckets}
                  xKey="bucket"
                  series={[{ key: "count", label: "Users" }]}
                />
              </ChartCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          {geographyQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {geographyQuery.isError && (
            <p className="text-sm text-red-600">Failed to load geography analytics.</p>
          )}
          {geographyQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <StatTile label="Sign-ins" value={formatNumber(geographyQuery.data.total_logins)} current={geographyQuery.data.total_logins} previous={geographyQuery.data.comparison?.total_logins} average={averagePerDay(geographyQuery.data.total_logins)} />
                <StatTile label="Countries reached" value={formatNumber(geographyQuery.data.countries_reached)} />
                <StatTile
                  label="Top country"
                  value={geographyQuery.data.by_country[0]?.country ?? "—"}
                />
                <StatTile
                  label="Unresolved locations"
                  value={formatNumber(geographyQuery.data.unresolved_logins)}
                />
              </div>

              <ChartCard
                title="Sign-ins by country"
                subtitle="Unique signed-in users per country, this range — hover a country for details"
              >
                <CountryHeatmapMap data={geographyQuery.data.by_country} />
              </ChartCard>

              <ChartCard title="Sign-ins over time">
                <TrendLineChart
                  data={geographyQuery.data.logins_over_time}
                  xKey="day"
                  series={[
                    { key: "count", label: "Sign-ins" },
                    { key: "users", label: "Unique users" },
                  ]}
                  formatX={formatAnalyticsPeriod(geographyQuery.data.time_interval)}
                  previousData={geographyQuery.data.comparison?.logins_over_time}
                />
              </ChartCard>

              <ChartCard title="Top cities" subtitle="Where sign-ins are concentrated within each country">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">City</th>
                        <th className="py-2 pr-3">Country</th>
                        <th className="py-2 pr-3 text-right">Users</th>
                        <th className="py-2 text-right">Sign-ins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geographyQuery.data.by_city.map((row) => (
                        <tr key={`${row.city}-${row.country}`} className="border-b last:border-0">
                          <td className="py-2 pr-3">{row.city}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{row.country}</td>
                          <td className="py-2 pr-3 text-right">{formatNumber(row.users)}</td>
                          <td className="py-2 text-right">{formatNumber(row.logins)}</td>
                        </tr>
                      ))}
                      {geographyQuery.data.by_city.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-muted-foreground">
                            No resolved sign-in cities for this range yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metricsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {metricsQuery.isError && (
            <p className="text-sm text-muted-foreground">Could not load these metrics.</p>
          )}
          {metricsQuery.data && (
            <>
              <ChartCard
                title="Engagement funnel"
                subtitle="Rates over the events the reading lifecycle emits."
              >
                <div className="space-y-3">
                  {metricsQuery.data.funnel.map((row) => (
                    <div key={row.key} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{row.label}</p>
                        {/* A dash, not 0% — an empty denominator means "no data
                            yet", which is not the same as a bad rate. */}
                        <p className="text-lg font-semibold">
                          {row.rate === null ? "—" : `${Math.round(row.rate * 100)}%`}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.help}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.numerator} of {row.denominator}
                      </p>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Per reader" subtitle="Averages across the selected range.">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      ["Stories / session", metricsQuery.data.averages.stories_per_session],
                      ["Avg session (min)", metricsQuery.data.averages.average_session_minutes],
                      ["Countries / reader", metricsQuery.data.averages.countries_per_reader],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-lg font-semibold">{value ?? "—"}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </ChartCard>

                <ChartCard
                  title="Retention"
                  subtitle="Readers who came back, of those old enough to have had the chance."
                >
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {(["d1", "d7", "d30"] as const).map((key) => {
                      const bucket = metricsQuery.data!.retention[key];
                      return (
                        <div key={key} className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-lg font-semibold">
                            {bucket.rate === null ? "—" : `${Math.round(bucket.rate * 100)}%`}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {key.toUpperCase()} · {bucket.returned}/{bucket.eligible}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </ChartCard>
              </div>

              <ChartCard title="Discovery and progression" subtitle="Raw counts in this range.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(metricsQuery.data.discovery).map(([key, value]) => (
                    <div key={key} className="rounded-lg border bg-muted/30 p-3 text-center">
                      <p className="text-lg font-semibold">{value}</p>
                      <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                        {key.replace(/_/g, " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          {submissionsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {submissionsQuery.isError && (
            <p className="text-sm text-red-600">Failed to load submission analytics.</p>
          )}
          {submissionsQuery.data && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                {submissionsQuery.data.funnel.map((row) => (
                  <StatTile
                    key={row.status}
                    label={row.status}
                    value={`${formatNumber(row.count)} (${formatPercentPoints(row.percent)})`}
                  />
                ))}
                <StatTile
                  label="Avg. time to review"
                  value={`${submissionsQuery.data.avg_time_to_review_hours}h`}
                />
              </div>

              <ChartCard title="Submissions over time" subtitle="By status">
                <TrendLineChart
                  data={submissionsByDay.rows}
                  xKey="day"
                  series={submissionsByDay.statuses.map((status) => ({ key: status, label: status }))}
                  formatX={formatAnalyticsPeriod(submissionsQuery.data.time_interval)}
                />
              </ChartCard>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="By story type">
                  <BreakdownBarChart
                    data={submissionsQuery.data.by_story_type}
                    xKey="story_type"
                    series={[{ key: "count", label: "Submissions" }]}
                  />
                </ChartCard>
                <ChartCard title="By genre">
                  <BreakdownBarChart
                    data={submissionsQuery.data.by_genre}
                    xKey="name"
                    series={[{ key: "count", label: "Submissions" }]}
                    layout="vertical"
                  />
                </ChartCard>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;
