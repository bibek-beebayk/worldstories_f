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
import type { AdminAnalyticsRangeDays } from "@/api/types";
import { formatBytes } from "@/lib/utils";

const formatNumber = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const formatPercentPoints = (value: number) => `${Math.round(value)}%`;

const RANGE_OPTIONS: { value: AdminAnalyticsRangeDays; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
];

type TabKey = "content" | "engagement" | "audience" | "users" | "submissions";

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-card px-3 py-2 shadow-sm">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
  </div>
);

const ChartCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <Card className="overflow-hidden">
    <CardHeader className="border-b bg-muted/20 py-3">
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </CardHeader>
    <CardContent className="pt-4">{children}</CardContent>
  </Card>
);

const AdminAnalytics = () => {
  const isAuthenticated = Boolean(getAccessToken());
  const [activeTab, setActiveTab] = useState<TabKey>("content");
  const [days, setDays] = useState<AdminAnalyticsRangeDays>(30);

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
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gradient-to-r from-muted/60 via-muted/20 to-transparent px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Analytics</h2>
          <p className="text-xs text-muted-foreground">
            Content performance, reading engagement, growth, and submissions in detail.
          </p>
        </div>
        <Select value={String(days)} onValueChange={(value) => setDays(Number(value) as AdminAnalyticsRangeDays)}>
          <SelectTrigger className="w-[160px]">
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
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="content" className="space-y-4">
          {contentQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {contentQuery.isError && (
            <p className="text-sm text-red-600">Failed to load content analytics.</p>
          )}
          {contentQuery.data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Blog posts" value={formatNumber(contentQuery.data.blog_posts_count)} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Views over time" subtitle="Real, de-duplicated story views">
                  <TrendLineChart
                    data={contentQuery.data.views_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Views" }]}
                  />
                </ChartCard>
                <ChartCard title="Publishing velocity" subtitle="Stories added to the site per day">
                  <TrendLineChart
                    data={contentQuery.data.publishing_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Stories published" }]}
                  />
                </ChartCard>
                <ChartCard title="Blog publishing velocity" subtitle="Blog posts published per day">
                  <TrendLineChart
                    data={contentQuery.data.blog_publishing_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Posts published" }]}
                  />
                </ChartCard>
              </div>

              <ChartCard title="Genre performance" subtitle="Across the whole published catalogue">
                <div className="overflow-x-auto">
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile
                  label="View → read conversion"
                  value={formatPercent(engagementQuery.data.view_to_read_conversion.conversion_rate)}
                />
                <StatTile
                  label="Story views"
                  value={formatNumber(engagementQuery.data.view_to_read_conversion.views)}
                />
                <StatTile
                  label="Readers who started"
                  value={formatNumber(engagementQuery.data.view_to_read_conversion.readers)}
                />
                <StatTile
                  label="Audio listen-through"
                  value={formatPercent(engagementQuery.data.audio_listen_through.avg_progress)}
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
                    data={engagementQuery.data.chapter_dropoff.map((row) => ({
                      ...row,
                      chapter_order: `Ch. ${row.chapter_order}`,
                    }))}
                    xKey="chapter_order"
                    series={[{ key: "avg_progress", label: "Avg progress" }]}
                    formatX={(v) => v}
                    formatY={(v) => `${Math.round(v * 100)}%`}
                    yDomain={[0, 1]}
                    yAxisWidth={44}
                  />
                </ChartCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Favorites over time">
                  <TrendLineChart
                    data={engagementQuery.data.favorites_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Favorites" }]}
                  />
                </ChartCard>
                <ChartCard title="Rating trend" subtitle="Average rating of reviews submitted per day">
                  <TrendLineChart
                    data={engagementQuery.data.rating_trend}
                    xKey="day"
                    series={[{ key: "avg_rating", label: "Avg rating" }]}
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatTile label="Visitors" value={formatNumber(audienceQuery.data.summary.visitors)} />
                <StatTile label="Returning visitors" value={formatNumber(audienceQuery.data.summary.returning_visitors)} />
                <StatTile label="Return rate" value={formatPercent(audienceQuery.data.summary.returning_rate)} />
                <StatTile label="Readers" value={formatNumber(audienceQuery.data.summary.readers)} />
                <StatTile label="Returning readers" value={formatNumber(audienceQuery.data.summary.returning_readers)} />
                <StatTile label="Reader retention" value={formatPercent(audienceQuery.data.summary.reader_retention_rate)} />
                <StatTile label="Ad impressions" value={formatNumber(audienceQuery.data.summary.ad_impressions)} />
                <StatTile label="Downloads" value={formatNumber(audienceQuery.data.summary.downloads)} />
                <StatTile label="Unique downloaders" value={formatNumber(audienceQuery.data.summary.unique_downloaders)} />
                <StatTile label="Completions" value={formatNumber(audienceQuery.data.summary.completions)} />
                <StatTile label="Completion rate" value={formatPercent(audienceQuery.data.summary.completion_rate)} />
                <StatTile label="Reading time" value={`${formatNumber(Math.round(audienceQuery.data.summary.reading_minutes))}m`} />
                <StatTile label="Listening time" value={`${formatNumber(Math.round(audienceQuery.data.summary.listening_minutes))}m`} />
                <StatTile label="Blog reading time" value={`${formatNumber(Math.round(audienceQuery.data.summary.blog_reading_minutes))}m`} />
                <StatTile label="Quick Read time" value={`${formatNumber(Math.round(audienceQuery.data.summary.quick_read_reading_minutes))}m`} />
                <StatTile label="Avg session" value={`${audienceQuery.data.summary.avg_session_minutes}m`} />
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
                  />
                </ChartCard>
                <ChartCard title="Reading and listening time" subtitle="Measured active session minutes">
                  <TrendLineChart
                    data={audienceQuery.data.daily_activity}
                    xKey="day"
                    series={[
                      { key: "reading_minutes", label: "Reading minutes" },
                      { key: "listening_minutes", label: "Listening minutes" },
                    ]}
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
            </>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {usersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {usersQuery.isError && <p className="text-sm text-red-600">Failed to load user analytics.</p>}
          {usersQuery.data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Total users" value={formatNumber(usersQuery.data.total_users)} />
                <StatTile
                  label={`Active in range`}
                  value={formatNumber(usersQuery.data.active_users)}
                />
                <StatTile
                  label="OTP verification rate"
                  value={formatPercent(usersQuery.data.otp_conversion.rate)}
                />
                <StatTile
                  label="New signups in range"
                  value={formatNumber(usersQuery.data.otp_conversion.joined)}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="New signups" subtitle="Daily new accounts">
                  <TrendLineChart
                    data={usersQuery.data.signups_over_time}
                    xKey="day"
                    series={[{ key: "count", label: "Signups" }]}
                  />
                </ChartCard>
                <ChartCard title="Cumulative user growth">
                  <TrendLineChart
                    data={cumulativeSignups}
                    xKey="day"
                    series={[{ key: "cumulative", label: "Total users" }]}
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

        <TabsContent value="submissions" className="space-y-4">
          {submissionsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {submissionsQuery.isError && (
            <p className="text-sm text-red-600">Failed to load submission analytics.</p>
          )}
          {submissionsQuery.data && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
