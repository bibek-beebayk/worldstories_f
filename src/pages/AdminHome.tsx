import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BookOpen, Headphones, Video } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { storyApi } from "@/api/story";
import type { AdminAnalyticsRangeDays, AdminOverviewKpiKey } from "@/api/types";
import { RANGE_OPTIONS } from "@/components/admin/analyticsRange";
import {
  Funnel,
  FormatCard,
  KpiSkeleton,
  KpiTile,
  MoverList,
  MoversSkeleton,
  NeedsAttention,
  RankedList,
  Section,
  Skeleton,
  TrafficChart,
  countryLabel,
  formatMinutes,
  formatNumber,
} from "@/components/admin/OverviewWidgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// The Overview offers the shorter ranges only; longer ones live in Analytics.
const OVERVIEW_RANGES = RANGE_OPTIONS.filter((option) => [1, 7, 30, 90].includes(Number(option.value)));

const KPI_TILES: { key: AdminOverviewKpiKey; label: string; color: string; format?: (value: number) => string }[] = [
  { key: "unique_visitors", label: "Unique visitors", color: "hsl(var(--primary))" },
  { key: "stories_started", label: "Stories started", color: "#0ea5e9" },
  { key: "stories_completed", label: "Stories completed", color: "#10b981" },
  { key: "engagement_minutes", label: "Time spent", color: "#8b5cf6", format: formatMinutes },
  { key: "new_signups", label: "New signups", color: "#f59e0b" },
  { key: "ad_impressions", label: "Ad impressions", color: "#f43f5e" },
];

const AdminHome = () => {
  const [days, setDays] = useState<AdminAnalyticsRangeDays>(7);

  const { data, isLoading, isError, isPlaceholderData } = useQuery({
    queryKey: ["admin-overview", days],
    queryFn: () => storyApi.getAdminOverview(days),
    // Keep the old numbers on screen (dimmed) while a new range loads.
    placeholderData: keepPreviousData,
  });

  const header = (
    <div className="flex flex-col gap-3 rounded-lg border bg-gradient-to-r from-muted/60 via-muted/20 to-transparent px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold">Overview</h2>
        <p className="text-xs text-muted-foreground">How the site is doing, compared with the period before.</p>
      </div>
      <Select value={String(days)} onValueChange={(value) => setDays(Number(value) as AdminAnalyticsRangeDays)}>
        <SelectTrigger className="w-full sm:w-[170px]" aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OVERVIEW_RANGES.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (isError && !data) {
    return (
      <div className="h-full space-y-4 overflow-y-auto pr-1">
        {header}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">Failed to load the overview. Superuser access is required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data && !data.kpis) {
    return (
      <div className="h-full space-y-4 overflow-y-auto pr-1">
        {header}
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          The API returned an older Overview format. Deploy or restart the backend so it matches this version of the
          admin panel.
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="h-full space-y-4 overflow-y-auto pr-1" aria-busy="true" aria-label="Loading overview">
        {header}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {KPI_TILES.map((tile) => (
            <KpiSkeleton key={tile.key} />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Card key={key}>
              <CardContent className="pt-6">
                <MoversSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { catalog } = data;

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      {header}

      <div className={`space-y-4 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
        <NeedsAttention items={data.needs_attention} />

        <section aria-label="Key numbers" className="space-y-2">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {KPI_TILES.map((tile) => (
              <KpiTile
                key={tile.key}
                label={tile.label}
                kpi={data.kpis[tile.key]}
                days={days}
                color={tile.color}
                format={tile.format}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {formatNumber(catalog.stories)} stories · {formatNumber(catalog.chapters)} chapters ·{" "}
              {formatNumber(catalog.audios)} audiobooks · {formatNumber(catalog.videos)} videos ·{" "}
              {formatNumber(catalog.users)} users
            </p>
            <Link
              to={`/admin/analytics?tab=audience&days=${days}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              View in Analytics →
            </Link>
          </div>
        </section>

        <Section
          title="Traffic"
          subtitle="Unique visitors over time. Signed-in readers count once across devices."
          analyticsTab="audience"
          days={days}
        >
          <TrafficChart
            series={data.traffic.series}
            markers={data.traffic.publish_markers}
            interval={data.time_interval}
          />
        </Section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section
            title="Reader funnel"
            subtitle="Each step's rate is its share of the step above."
            analyticsTab="metrics"
            days={days}
            accent="border-t-sky-500"
          >
            <Funnel steps={data.funnel} />
          </Section>

          <Section
            title="Read / Listen / Watch"
            subtitle="Time spent and how far people get, per format."
            analyticsTab="engagement"
            days={days}
            accent="border-t-violet-500"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <FormatCard
                label="Read"
                icon={<BookOpen className="h-4 w-4" />}
                format={data.formats.read}
                tone="text-primary"
              />
              <FormatCard
                label="Listen"
                icon={<Headphones className="h-4 w-4" />}
                format={data.formats.listen}
                tone="text-sky-600"
              />
              <FormatCard
                label="Watch"
                icon={<Video className="h-4 w-4" />}
                format={data.formats.watch}
                tone="text-violet-600"
              />
            </div>
          </Section>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Section
            title="Trending"
            subtitle="Top stories by performance score; arrows show movement vs the previous period."
            analyticsTab="content"
            days={days}
            accent="border-t-emerald-500"
          >
            <MoverList rows={data.movers.trending} kind="trending" empty="No activity in this range" />
          </Section>
          <Section
            title="Hidden gems"
            subtitle="People who start these finish them, but few find them (3+ starts)."
            analyticsTab="content"
            days={days}
            accent="border-t-amber-500"
          >
            <MoverList rows={data.movers.hidden_gems} kind="gems" empty="No hidden gems in this range" />
          </Section>
          <Section
            title="Leaky stories"
            subtitle="Lots of starts, few finishes (5+ starts)."
            analyticsTab="content"
            days={days}
            accent="border-t-rose-500"
          >
            <MoverList rows={data.movers.leaky} kind="leaky" empty="No leaky stories in this range" />
          </Section>
        </div>

        <Section title="Sources" subtitle="Where visitors come from." analyticsTab="audience" days={days} accent="border-t-slate-400">
          <div className="grid gap-6 sm:grid-cols-2">
            <RankedList
              title="Top referrers"
              rows={data.sources.referrers.map((row) => ({
                label: row.referral_source,
                value: row.count,
                unit: "visits",
              }))}
            />
            <RankedList
              title="Top countries"
              rows={data.sources.countries.map((row) => ({
                label: countryLabel(row.country_code),
                value: row.visitors,
                unit: "visitors",
              }))}
            />
          </div>
        </Section>
      </div>
    </div>
  );
};

export default AdminHome;
