import NepalikathaAnalytics from "@/components/admin/NepalikathaAnalytics";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import { RANGE_OPTIONS, parseRangeDays } from "@/components/admin/analyticsRange";
import { ContentTab, ContentTabSkeleton } from "@/components/admin/ContentTab";
import { EngagementTab, EngagementTabSkeleton } from "@/components/admin/EngagementTab";
import { AudienceTab, AudienceTabSkeleton } from "@/components/admin/AudienceTab";
import { MonetizationTab, MonetizationTabSkeleton } from "@/components/admin/MonetizationTab";
import { UsersTab, UsersTabSkeleton } from "@/components/admin/UsersTab";
import type { AdminAnalyticsRangeDays, AdminAnalyticsTimeInterval } from "@/api/types";

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

const TAB_OPTIONS: Array<{ value: TabKey; label: string }> = [
  { value: "content", label: "Content" },
  { value: "engagement", label: "Engagement" },
  { value: "audience", label: "Audience" },
  { value: "monetization", label: "Monetization" },
  { value: "users", label: "Users" },
  { value: "geography", label: "Geography" },
  { value: "submissions", label: "Submissions" },
  { value: "nepalikatha", label: "Nepalikatha" },
];

type TabKey =
  | "content"
  | "engagement"
  | "audience"
  | "monetization"
  | "users"
  | "geography"
  | "submissions"
  | "nepalikatha";

const AdminAnalytics = () => {
  const isAuthenticated = Boolean(getAccessToken());
  // The Overview links here with ?tab= and ?days= so "View in Analytics" lands
  // on the matching tab and range.
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    // The Metrics tab was merged into Engagement; keep old links working.
    const requested = searchParams.get("tab") === "metrics" ? "engagement" : searchParams.get("tab");
    return TAB_OPTIONS.find((option) => option.value === requested)?.value ?? "content";
  });
  const [days, setDays] = useState<AdminAnalyticsRangeDays>(() => parseRangeDays(searchParams.get("days")) ?? 30);
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
    // Keep the previous range on screen (dimmed) while the next one loads.
    placeholderData: keepPreviousData,
  });
  const engagementQuery = useQuery({
    queryKey: ["admin-analytics", "engagement", days],
    queryFn: () => storyApi.getAdminAnalyticsEngagement(days),
    enabled: canFetch && activeTab === "engagement",
    placeholderData: keepPreviousData,
  });
  const usersQuery = useQuery({
    queryKey: ["admin-analytics", "users", days],
    queryFn: () => storyApi.getAdminAnalyticsUsers(days),
    enabled: canFetch && activeTab === "users",
    placeholderData: keepPreviousData,
  });
  const audienceQuery = useQuery({
    queryKey: ["admin-analytics", "audience", days],
    queryFn: () => storyApi.getAdminAnalyticsAudience(days),
    enabled: canFetch && activeTab === "audience",
    placeholderData: keepPreviousData,
  });  const monetizationQuery = useQuery({
    queryKey: ["admin-analytics", "monetization", days],
    queryFn: () => storyApi.getAdminAnalyticsMonetization(days),
    enabled: canFetch && activeTab === "monetization",
    placeholderData: keepPreviousData,
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
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="monetization">Monetization</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="nepalikatha">Nepalikatha</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="nepalikatha"><NepalikathaAnalytics days={days} /></TabsContent>

        <TabsContent value="content" className="space-y-4">
          {contentQuery.isLoading && <ContentTabSkeleton />}
          {contentQuery.isError && !contentQuery.data && (
            <p className="text-sm text-red-600">Failed to load content analytics.</p>
          )}
          {/* An API that predates the rewritten Content tab answers with the old
              shape (no top_content); say so rather than crash the page. */}
          {contentQuery.data && !contentQuery.data.top_content && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              The API returned an older Content analytics format. Deploy or restart the backend so it matches this
              version of the admin panel.
            </p>
          )}
          {contentQuery.data?.top_content && (
            <ContentTab data={contentQuery.data} days={days} isRefreshing={contentQuery.isPlaceholderData} />
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {engagementQuery.isLoading && <EngagementTabSkeleton />}
          {engagementQuery.isError && !engagementQuery.data && (
            <p className="text-sm text-red-600">Failed to load engagement analytics.</p>
          )}
          {/* An API that predates the rewritten Engagement tab answers with the old
              shape (no kpis); say so rather than crash the page. */}
          {engagementQuery.data && !engagementQuery.data.kpis && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              The API returned an older Engagement analytics format. Deploy or restart the backend so it matches this
              version of the admin panel.
            </p>
          )}
          {engagementQuery.data?.kpis && (
            <EngagementTab data={engagementQuery.data} days={days} isRefreshing={engagementQuery.isPlaceholderData} />
          )}
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          {audienceQuery.isLoading && <AudienceTabSkeleton />}
          {audienceQuery.isError && !audienceQuery.data && (
            <p className="text-sm text-red-600">Failed to load audience analytics.</p>
          )}
          {/* An API that predates the rewritten Audience tab answers with the old
              shape (no kpis); say so rather than crash the page. */}
          {audienceQuery.data && !audienceQuery.data.kpis && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              The API returned an older Audience analytics format. Deploy or restart the backend so it matches this
              version of the admin panel.
            </p>
          )}
          {audienceQuery.data?.kpis && (
            <AudienceTab data={audienceQuery.data} days={days} isRefreshing={audienceQuery.isPlaceholderData} />
          )}
        </TabsContent>

        <TabsContent value="monetization" className="space-y-4">
          {monetizationQuery.isLoading && <MonetizationTabSkeleton />}
          {monetizationQuery.isError && !monetizationQuery.data && (
            <p className="text-sm text-red-600">Failed to load monetization analytics.</p>
          )}
          {monetizationQuery.data?.kpis && (
            <MonetizationTab data={monetizationQuery.data} days={days} isRefreshing={monetizationQuery.isPlaceholderData} />
          )}
          {monetizationQuery.data && !monetizationQuery.data.kpis && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              The API doesn't have the Monetization endpoint yet. Deploy or restart the backend.
            </p>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {usersQuery.isLoading && <UsersTabSkeleton />}
          {usersQuery.isError && !usersQuery.data && (
            <p className="text-sm text-red-600">Failed to load users analytics.</p>
          )}
          {/* An API that predates the rewritten Users tab answers with the old
              shape (no kpis); say so rather than crash the page. */}
          {usersQuery.data && !usersQuery.data.kpis && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              The API returned an older Users analytics format. Deploy or restart the backend so it matches this
              version of the admin panel.
            </p>
          )}
          {usersQuery.data?.kpis && (
            <UsersTab data={usersQuery.data} days={days} isRefreshing={usersQuery.isPlaceholderData} />
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
