import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowUp } from "lucide-react";
import type {
  AdminAnalyticsContentResponse,
  AdminAnalyticsRangeDays,
  AdminContentGapKey,
  AdminContentGapRow,
  AdminContentGroupPerformance,
  AdminContentKind,
  AdminContentKpiKey,
} from "@/api/types";
import { ContentPerformanceTable } from "@/components/admin/ContentPerformanceTable";
import { MarkedTrendChart, formatPeriod } from "@/components/admin/charts/MarkedTrendChart";
import { TrendLineChart } from "@/components/admin/charts/TrendLineChart";
import { CHART_PALETTE } from "@/components/admin/charts/palette";
import {
  ChangeBadge,
  EmptyNote,
  Section,
  Skeleton,
  formatMinutes,
  formatNumber,
  formatPercent,
  rangeLabel,
} from "@/components/admin/OverviewWidgets";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const KPI_TILES: { key: AdminContentKpiKey; label: string; format?: (value: number) => string }[] = [
  { key: "views", label: "Views" },
  { key: "unique_readers", label: "Unique readers" },
  { key: "engagement_minutes", label: "Time spent", format: formatMinutes },
  { key: "completions", label: "Completions" },
  { key: "titles_published", label: "Titles published" },
];

const KPI_HINTS: Record<AdminContentKpiKey, string> = {
  views: "Story detail views, never fewer than the people who read, listened or watched, plus blog views.",
  unique_readers: "Distinct people who read a story, Quick Read or blog post.",
  engagement_minutes: "Reading, listening and watching time. Each session counts only up to a cap.",
  completions: "Stories finished by signed-in readers.",
  titles_published: "Stories and blog posts published in the range.",
};

const KIND_TABS: { value: AdminContentKind; label: string }[] = [
  { value: "story", label: "Stories" },
  { value: "audiobook", label: "Audiobooks" },
  { value: "quick_read", label: "Quick Reads" },
  { value: "blog", label: "Blogs" },
];

const GAP_TABS: { value: AdminContentGapKey; label: string }[] = [
  { value: "no_audio", label: "No audio" },
  { value: "no_quick_read", label: "No Quick Read" },
  { value: "no_cover", label: "No cover" },
  { value: "no_video", label: "No video" },
];

const MISSING_LABEL = { audio: "Audio", quick_read: "Quick Read", cover: "Cover", video: "Video" } as const;

const KpiCard = ({
  label,
  hint,
  value,
  kpi,
  days,
}: {
  label: string;
  hint: string;
  value: string;
  kpi: { value: number; change_pct: number | null; previous_value: number | null };
  days: AdminAnalyticsRangeDays;
}) => (
  <div className="min-w-0 rounded-xl border bg-card px-3 py-3 shadow-sm" title={hint}>
    <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1.5 truncate text-2xl font-bold leading-none tracking-tight">{value}</p>
    <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className="whitespace-nowrap">
        <ChangeBadge kpi={kpi} days={days} />
      </span>
      {days !== "all" && <span className="text-[11px] leading-tight text-muted-foreground">vs {rangeLabel(days)}</span>}
    </div>
  </div>
);

type GroupSortKey = keyof Pick<
  AdminContentGroupPerformance,
  | "name"
  | "stories_in_catalogue"
  | "stories_with_activity"
  | "views"
  | "unique_readers"
  | "engagement_minutes"
  | "completion_rate"
  | "views_per_story"
>;

const GROUP_COLUMNS: { key: GroupSortKey; label: string; hint?: string }[] = [
  { key: "name", label: "" },
  { key: "stories_in_catalogue", label: "Stories", hint: "Published stories in this group" },
  { key: "stories_with_activity", label: "Active", hint: "Stories with any views or readers in this range" },
  { key: "views", label: "Views" },
  { key: "unique_readers", label: "Readers", hint: "Distinct people who read a story in this group" },
  { key: "engagement_minutes", label: "Time", hint: "Session-capped minutes spent" },
  { key: "completion_rate", label: "Completion", hint: "Share of signed-in readers who finished" },
  { key: "views_per_story", label: "Views / story", hint: "Views divided by published stories in the group" },
];

/** A compact, sortable table of in-range engagement per genre or story type. */
const GroupTable = ({
  rows,
  nameLabel,
  limit,
  noun,
}: {
  rows: AdminContentGroupPerformance[];
  nameLabel: string;
  limit?: number;
  noun: string;
}) => {
  const [sortKey, setSortKey] = useState<GroupSortKey>("views");
  const [descending, setDescending] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const direction = descending ? -1 : 1;
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return direction * a.name.localeCompare(b.name);
      const left = a[sortKey] ?? -1;
      const right = b[sortKey] ?? -1;
      return direction * (left - right) || a.name.localeCompare(b.name);
    });
  }, [rows, sortKey, descending]);

  if (rows.length === 0) return <EmptyNote>No published stories yet</EmptyNote>;
  const visible = limit && !showAll ? sorted.slice(0, limit) : sorted;

  const toggleSort = (key: GroupSortKey) => {
    if (key === sortKey) setDescending((current) => !current);
    else {
      setSortKey(key);
      setDescending(key !== "name");
    }
  };

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              {GROUP_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`py-2 pr-3 ${column.key === "name" ? "text-left" : "text-right"}`}
                  aria-sort={sortKey === column.key ? (descending ? "descending" : "ascending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    title={column.hint}
                    className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
                  >
                    {column.key === "name" ? nameLabel : column.label}
                    {sortKey === column.key &&
                      (descending ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const idle = row.views === 0 && row.unique_readers === 0;
              return (
                <tr key={row.name} className={`border-b last:border-0 ${idle ? "text-muted-foreground" : ""}`}>
                  <td className="py-2 pr-3 font-medium">{row.name}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.stories_in_catalogue)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.stories_with_activity)}</td>
                  <td className="py-2 pr-3 text-right font-semibold">{formatNumber(row.views)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(row.unique_readers)}</td>
                  <td className="py-2 pr-3 text-right">{formatMinutes(row.engagement_minutes)}</td>
                  <td className="py-2 pr-3 text-right">
                    {row.completion_rate === null ? "—" : formatPercent(row.completion_rate)}
                  </td>
                  <td className="py-2 text-right">{row.views_per_story.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {limit && sorted.length > limit && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((current) => !current)}>
          {showAll ? `Show top ${limit}` : `Show all ${sorted.length} ${noun}`}
        </Button>
      )}
    </div>
  );
};

const GapList = ({ rows, total }: { rows: AdminContentGapRow[]; total: number }) => {
  if (rows.length === 0) return <EmptyNote>Nothing missing — every published story has this.</EmptyNote>;
  return (
    <div>
      <ul className="divide-y">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              to={`/admin/content?storyId=${row.id}`}
              className="group flex flex-wrap items-center justify-between gap-2 py-2.5 hover:bg-muted/30"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-primary">{row.title}</span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                <span className="hidden gap-1 sm:flex">
                  {row.missing.map((piece) => (
                    <span key={piece} className="rounded border px-1.5 py-0.5">
                      {MISSING_LABEL[piece]}
                    </span>
                  ))}
                </span>
                <span>
                  <span className="font-semibold text-foreground">{formatNumber(row.views)}</span> views
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {total > rows.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing the {rows.length} most viewed of {formatNumber(total)}.
        </p>
      )}
    </div>
  );
};

export const ContentTabSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading content analytics">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {KPI_TILES.map((tile) => (
        <Skeleton key={tile.key} className="h-[104px] w-full" />
      ))}
    </div>
    <Skeleton className="h-[330px] w-full" />
    <Skeleton className="h-[360px] w-full" />
    <div className="grid gap-4 xl:grid-cols-2">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

export function ContentTab({
  data,
  days,
  isRefreshing = false,
}: {
  data: AdminAnalyticsContentResponse;
  days: AdminAnalyticsRangeDays;
  isRefreshing?: boolean;
}) {
  const [kind, setKind] = useState<AdminContentKind>("story");
  const [hideLowSample, setHideLowSample] = useState(true);
  const [gap, setGap] = useState<AdminContentGapKey>("no_audio");

  const block = data.top_content[kind];
  const visibleRows = hideLowSample ? block.rows.filter((row) => !row.low_sample) : block.rows;
  const hiddenCount = block.rows.length - visibleRows.length;
  const chart = data.views_over_time;
  const publishing = data.publishing;
  const publishedTotal = publishing.stories + publishing.blogs;
  const publishingInterval = data.time_interval === "hour" ? "day" : data.time_interval;

  return (
    <div className={`space-y-4 transition-opacity ${isRefreshing ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPI_TILES.map((tile) => (
          <KpiCard
            key={tile.key}
            label={tile.label}
            hint={KPI_HINTS[tile.key]}
            value={(tile.format ?? formatNumber)(data.kpis[tile.key].value)}
            kpi={data.kpis[tile.key]}
            days={days}
          />
        ))}
      </div>

      <Section
        title="Views over time"
        subtitle="Detail-page views, counting everyone who then read, listened or watched, plus blog views."
        days={days}
      >
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-bold leading-none">{formatNumber(chart.total)}</span>
          <span className="text-xs text-muted-foreground">views this period</span>
          <ChangeBadge
            kpi={{ value: chart.total, change_pct: chart.change_pct, previous_value: chart.previous_total }}
            days={days}
          />
          {days !== "all" && chart.previous_total !== null && (
            <span className="text-xs text-muted-foreground">
              vs {formatNumber(chart.previous_total)} in the {rangeLabel(days)}
            </span>
          )}
        </div>
        <MarkedTrendChart
          data={chart.series.map((row) => ({ day: String(row.day), value: row.count }))}
          previous={chart.previous_series?.map((row) => ({ day: String(row.day), value: row.count }))}
          markers={chart.publish_markers}
          interval={data.time_interval}
          label="Views"
        />
      </Section>

      <Section title="Top content" days={days} accent="border-t-emerald-500">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={kind} onValueChange={(value) => setKind(value as AdminContentKind)}>
            <TabsList className="h-auto flex-wrap">
              {KIND_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">{formatNumber(data.top_content[tab.value].count)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-low-sample"
                checked={hideLowSample}
                onCheckedChange={(checked) => setHideLowSample(checked === true)}
              />
              <Label htmlFor="hide-low-sample" className="text-xs font-normal" title="Hide titles with fewer than 2 people">
                Hide low-sample
              </Label>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/analytics/content-performance?kind=${kind}&days=${days}`}>View all</Link>
            </Button>
          </div>
        </div>
        <ContentPerformanceTable
          rows={visibleRows}
          kind={kind}
          days={days}
          scoreSummary={data.score_formula.summary}
          emptyMessage={
            hiddenCount > 0
              ? `Every title here has fewer than 2 people. Untick "Hide low-sample" to see ${hiddenCount}.`
              : "No activity in this range."
          }
        />
        {hiddenCount > 0 && visibleRows.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {hiddenCount} low-sample {hiddenCount === 1 ? "title" : "titles"} hidden.
          </p>
        )}
      </Section>

      <div className="space-y-4">
        <Section
          title="Genre performance"
          subtitle="Engagement with each genre's stories in this range."
          days={days}
          accent="border-t-sky-500"
        >
          <GroupTable rows={data.genre_performance} nameLabel="Genre" limit={10} noun="genres" />
        </Section>
        <Section
          title="Story type performance"
          subtitle="The same, per story type."
          days={days}
          accent="border-t-violet-500"
        >
          <GroupTable rows={data.story_type_performance} nameLabel="Type" noun="types" />
        </Section>
      </div>

      <Section title="Publishing" days={days} accent="border-t-amber-500">
        <p className="text-sm">
          Published this period: <span className="font-semibold">{formatNumber(publishing.stories)} {publishing.stories === 1 ? "story" : "stories"}</span>
          {" · "}
          <span className="font-semibold">{formatNumber(publishing.blogs)} {publishing.blogs === 1 ? "blog" : "blogs"}</span>
          {publishing.previous_stories !== null && publishing.previous_blogs !== null && (
            <span className="text-muted-foreground">
              {" "}
              (previous: {formatNumber(publishing.previous_stories)} · {formatNumber(publishing.previous_blogs)})
            </span>
          )}
        </p>
        {publishedTotal > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
              {[
                { label: "Stories", color: CHART_PALETTE[0] },
                { label: "Blogs", color: CHART_PALETTE[1] },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5 rounded" style={{ background: item.color }} aria-hidden="true" />
                  {item.label}
                </span>
              ))}
            </div>
            <TrendLineChart
              data={publishing.series}
              xKey="day"
              series={[
                { key: "stories", label: "Stories" },
                { key: "blogs", label: "Blogs" },
              ]}
              formatX={formatPeriod(publishingInterval)}
              height={200}
            />
          </div>
        )}
      </Section>

      <Section
        title="Catalogue gaps"
        subtitle="Published stories missing something, most viewed first — the ones worth fixing."
        days={days}
        accent="border-t-rose-500"
      >
        <Tabs value={gap} onValueChange={(value) => setGap(value as AdminContentGapKey)}>
          <TabsList className="mb-3 h-auto flex-wrap">
            {GAP_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                <span className="ml-1.5 text-xs text-muted-foreground">{formatNumber(data.catalogue_gaps[tab.value].total)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <GapList rows={data.catalogue_gaps[gap].rows} total={data.catalogue_gaps[gap].total} />
      </Section>
    </div>
  );
}
