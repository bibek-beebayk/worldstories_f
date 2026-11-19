import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, Info } from "lucide-react";
import type {
  AdminAnalyticsAudienceResponse,
  AdminAnalyticsRangeDays,
  AdminAnalyticsTimeInterval,
  AdminAudienceAcquisitionRow,
  AdminAudienceFormat,
  AdminAudienceKpi,
  AdminAudienceKpiKey,
  AdminAudiencePageType,
} from "@/api/types";
import {
  formatCountChange,
  formatRateChange,
  type ChangeDisplay,
} from "@/components/admin/charts/changeFormat";
import { formatPeriod } from "@/components/admin/charts/MarkedTrendChart";
import { CHART_PALETTE } from "@/components/admin/charts/palette";
import {
  EmptyNote,
  Section,
  Skeleton,
  formatNumber,
  formatPercent,
} from "@/components/admin/OverviewWidgets";
import { SampleKpiCard } from "@/components/admin/SampleKpiCard";

const NEW_COLOR = CHART_PALETTE[0];
const RETURNING_COLOR = CHART_PALETTE[1];

// A flag run older than this, or a bot share above this, means the dashboard is
// probably still counting bots.
const STALE_FLAG_HOURS = 24;
const HIGH_BOT_SHARE = 0.2;

const KPI_TILES: {
  key: AdminAudienceKpiKey;
  label: string;
  hint: string;
  sampleLabel: string;
  format: (value: number) => string;
  change: (kpi: AdminAudienceKpi) => ChangeDisplay | null;
}[] = [
  {
    key: "unique_visitors",
    label: "Unique visitors",
    hint: "People who loaded a page. A signed-in reader counts once across devices.",
    sampleLabel: "in this range",
    format: formatNumber,
    change: (kpi) => formatCountChange(kpi.value ?? 0, kpi.previous_value),
  },
  {
    key: "engaged_visitors",
    label: "Engaged visitors",
    hint: "Visitors who viewed 2+ pages in a visit, spent 30+ seconds active, or started reading, listening or watching.",
    sampleLabel: "visitors",
    format: formatNumber,
    change: (kpi) => formatCountChange(kpi.value ?? 0, kpi.previous_value),
  },
  {
    key: "engaged_rate",
    label: "Engaged rate",
    hint: "Engaged visitors as a share of all visitors.",
    sampleLabel: "visitors",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
  {
    key: "returning_rate",
    label: "Returning visitors",
    hint: "Visitors seen before this range, or on more than one day within it, as a share of all visitors.",
    sampleLabel: "visitors",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
  {
    key: "median_engaged_minutes",
    label: "Median engaged time",
    hint: "Median active minutes per engaged visitor. Each reading, listening or watching session counts only up to a cap, so an idle tab can't inflate it.",
    sampleLabel: "engaged visitors",
    format: (value) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} min`,
    change: (kpi) =>
      kpi.value === null ? null : formatCountChange(kpi.value, kpi.previous_value, { unit: " min", decimals: 1 }),
  },
  {
    key: "signed_in_share",
    label: "Signed-in share",
    hint: "Visitors who were logged in, as a share of all visitors.",
    sampleLabel: "visitors",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
];

const sourceLabel = (source: string) => source.replace(/_/g, " ");
const familyLabel = (family: string) => family.replace(/_/g, " ");

const timeAgo = (hours: number) => {
  if (hours < 1) return "less than an hour ago";
  if (hours < 48) return `${Math.round(hours)} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
};

const TrafficQualityBanner = ({ quality }: { quality: AdminAnalyticsAudienceResponse["traffic_quality"] }) => {
  const run = quality.last_bot_flag_run;
  const stale = run === null || run.hours_ago > STALE_FLAG_HOURS;
  const highBots = quality.bot_share !== null && quality.bot_share > HIGH_BOT_SHARE;
  const warn = stale || highBots;
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        warn
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "bg-muted/30"
      }`}
      role={warn ? "alert" : undefined}
    >
      <div className="flex items-start gap-2">
        {warn ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">Traffic quality</p>
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
            <li title="Visit events from visitors flagged as suspected bots, as a share of all visit events. Flagged traffic is already left out of everything below.">
              <span className="font-semibold">{quality.bot_share === null ? "—" : formatPercent(quality.bot_share)}</span>{" "}
              of page views flagged as bots
              {quality.previous_bot_share !== null && quality.bot_share !== null && (
                <span className="text-muted-foreground"> (was {formatPercent(quality.previous_bot_share)})</span>
              )}
            </li>
            <li title="Bot flagging only takes effect once the flag_suspected_bots command has run.">
              Bot flagging{" "}
              <span className="font-semibold">{run === null ? "has never run" : `last ran ${timeAgo(run.hours_ago)}`}</span>
              {run !== null && run.flagged_events > 0 && (
                <span className="text-muted-foreground"> ({formatNumber(run.flagged_events)} events)</span>
              )}
            </li>
            <li title="Visitors who arrived from a source we can name, out of visitors we could attribute. The rest are 'direct' — no referrer, which also includes bots and privacy-stripped links.">
              <span className="font-semibold">{quality.referrer_coverage === null ? "—" : formatPercent(quality.referrer_coverage)}</span>{" "}
              of visitors have a known referrer
            </li>
          </ul>
          {warn && (
            <p className="text-xs">
              {stale && "Bot flagging isn't running regularly, so recent bot traffic may still be counted. "}
              {highBots && "More than a fifth of page views are flagged as bots. "}
              Schedule <code className="rounded bg-background/70 px-1">python manage.py flag_suspected_bots --apply</code> to run daily.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const VisitorsChart = ({
  data,
  interval,
}: {
  data: AdminAnalyticsAudienceResponse["visitors_over_time"];
  interval: AdminAnalyticsTimeInterval;
}) => {
  const formatX = formatPeriod(interval);
  const { series, previous_series: previous, publish_markers: markers } = data;
  const rows = useMemo(
    () =>
      series.map((row, index) => {
        const total = row.new_visitors + row.returning_visitors;
        let previousTotal: number | undefined;
        if (previous?.length) {
          const previousIndex = series.length <= 1 ? 0 : Math.round((index * (previous.length - 1)) / (series.length - 1));
          const point = previous[previousIndex];
          previousTotal = point ? point.new_visitors + point.returning_visitors : undefined;
        }
        return { ...row, total, previous: previousTotal };
      }),
    [series, previous]
  );
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const markersByDay = new Map<string, typeof markers>();
  markers.forEach((marker) => {
    if (marker.bucket && byDay.has(marker.bucket)) markersByDay.set(marker.bucket, [...(markersByDay.get(marker.bucket) ?? []), marker]);
  });

  if (rows.every((row) => row.total === 0) && !previous?.some((row) => row.new_visitors + row.returning_visitors > 0)) {
    return <EmptyNote />;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NEW_COLOR }} aria-hidden="true" />
          New visitors
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: RETURNING_COLOR }} aria-hidden="true" />
          Returning visitors
        </span>
        {previous && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="22" y2="4" stroke="hsl(var(--foreground))" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Previous period (all visitors)
          </span>
        )}
        {markersByDay.size > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
            Published — hover to see what
          </span>
        )}
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" tickFormatter={formatX} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={({ active, label }) => {
                if (!active || typeof label !== "string") return null;
                const row = byDay.get(label);
                if (!row) return null;
                const published = markersByDay.get(label) ?? [];
                return (
                  <div className="max-w-[260px] rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">{formatX(label)}</p>
                    <p className="mt-1">
                      New: <span className="font-semibold">{formatNumber(row.new_visitors)}</span> · Returning:{" "}
                      <span className="font-semibold">{formatNumber(row.returning_visitors)}</span>
                    </p>
                    <p>
                      All visitors: <span className="font-semibold">{formatNumber(row.total)}</span>
                    </p>
                    {row.previous !== undefined && (
                      <p className="text-muted-foreground">Previous period: {formatNumber(row.previous)}</p>
                    )}
                    {published.length > 0 && (
                      <div className="mt-1.5 border-t pt-1.5">
                        <p className="text-muted-foreground">Published</p>
                        {published.map((marker) => (
                          <p key={`${marker.type}-${marker.slug}`} className="font-medium">
                            {marker.title}
                            {marker.type === "blog" && <span className="ml-1 font-normal text-muted-foreground">(blog)</span>}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="new_visitors" name="New visitors" stackId="visitors" fill={NEW_COLOR} />
            <Bar dataKey="returning_visitors" name="Returning visitors" stackId="visitors" fill={RETURNING_COLOR} radius={[3, 3, 0, 0]} />
            {previous && (
              <Line
                type="monotone"
                dataKey="previous"
                name="Previous period"
                stroke="hsl(var(--foreground))"
                strokeOpacity={0.55}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls
              />
            )}
            {[...markersByDay.entries()].map(([day, published]) => (
              <ReferenceDot
                key={day}
                x={day}
                y={byDay.get(day)?.total ?? 0}
                r={6}
                ifOverflow="visible"
                shape={(props: { cx?: number; cy?: number }) => (
                  <g>
                    <title>{`Published: ${published.map((marker) => marker.title).join(", ")}`}</title>
                    <circle cx={props.cx} cy={props.cy} r={6} fill="#f59e0b" stroke="hsl(var(--background))" strokeWidth={2} />
                  </g>
                )}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

type AcquisitionSort = keyof Pick<
  AdminAudienceAcquisitionRow,
  "source" | "unique_visitors" | "engaged_rate" | "unique_starters" | "story_completions" | "returning_rate"
>;

const ACQUISITION_COLUMNS: { key: AcquisitionSort; label: string; hint: string }[] = [
  { key: "source", label: "Source", hint: "How the visitor first arrived in this range. 'direct' means no referrer." },
  { key: "unique_visitors", label: "Visitors", hint: "Unique visitors whose first visit in this range came from this source." },
  { key: "engaged_rate", label: "Engaged", hint: "Share of this source's visitors who were engaged." },
  { key: "unique_starters", label: "Started", hint: "Visitors who started reading, listening or watching a story." },
  { key: "story_completions", label: "Completions", hint: "Stories these visitors finished." },
  { key: "returning_rate", label: "Returning", hint: "Share of this source's visitors who had been here before or came back." },
];

const AcquisitionTable = ({ rows, days }: { rows: AdminAudienceAcquisitionRow[]; days: AdminAnalyticsRangeDays }) => {
  const [sortKey, setSortKey] = useState<AcquisitionSort>("unique_visitors");
  const [descending, setDescending] = useState(true);
  const sorted = useMemo(() => {
    const direction = descending ? -1 : 1;
    return [...rows].sort((a, b) => {
      if (sortKey === "source") return direction * a.source.localeCompare(b.source);
      return direction * ((a[sortKey] ?? -1) - (b[sortKey] ?? -1)) || b.unique_visitors - a.unique_visitors;
    });
  }, [rows, sortKey, descending]);
  if (rows.length === 0) return <EmptyNote />;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            {ACQUISITION_COLUMNS.map((column) => (
              <th
                key={column.key}
                className={`py-2 pr-3 ${column.key === "source" ? "text-left" : "text-right"}`}
                aria-sort={sortKey === column.key ? (descending ? "descending" : "ascending") : "none"}
              >
                <button
                  type="button"
                  title={column.hint}
                  onClick={() => {
                    if (column.key === sortKey) setDescending((current) => !current);
                    else {
                      setSortKey(column.key);
                      setDescending(column.key !== "source");
                    }
                  }}
                  className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
                >
                  {column.label}
                  {sortKey === column.key && (descending ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const change = days === "all" ? null : formatCountChange(row.unique_visitors, row.previous_unique_visitors);
            return (
              <tr key={row.source} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium capitalize">{sourceLabel(row.source)}</td>
                <td className="py-2 pr-3 text-right">
                  <span className="font-semibold">{formatNumber(row.unique_visitors)}</span>
                  {change && (
                    <span
                      className={`ml-1.5 text-[11px] ${change.tone === "good" ? "text-emerald-600" : change.tone === "bad" ? "text-rose-600" : "text-muted-foreground"}`}
                      title={change.title}
                    >
                      {change.arrow} {change.text}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">
                  {row.engaged_rate === null ? "—" : formatPercent(row.engaged_rate)}
                  <span className="ml-1 text-xs text-muted-foreground">of visitors</span>
                </td>
                <td className="py-2 pr-3 text-right">{formatNumber(row.unique_starters)}</td>
                <td className="py-2 pr-3 text-right">{formatNumber(row.story_completions)}</td>
                <td className="py-2 text-right">
                  {row.returning_rate === null ? "—" : formatPercent(row.returning_rate)}
                  <span className="ml-1 text-xs text-muted-foreground">of visitors</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const PAGE_TYPE_STYLE: Record<AdminAudiencePageType, { label: string; className: string }> = {
  story: { label: "Story", className: "bg-primary/10 text-primary" },
  read: { label: "Reader", className: "bg-sky-500/10 text-sky-700" },
  listen: { label: "Listen", className: "bg-violet-500/10 text-violet-700" },
  watch: { label: "Watch", className: "bg-indigo-500/10 text-indigo-700" },
  blog: { label: "Blog", className: "bg-emerald-500/10 text-emerald-700" },
  page: { label: "Page", className: "bg-amber-500/10 text-amber-700" },
  home: { label: "Home", className: "bg-muted text-foreground" },
  library: { label: "Library", className: "bg-muted text-foreground" },
  other: { label: "Other", className: "bg-muted text-muted-foreground" },
};

export const PageTypeBadge = ({ type }: { type: AdminAudiencePageType }) => (
  <span className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PAGE_TYPE_STYLE[type].className}`}>
    {PAGE_TYPE_STYLE[type].label}
  </span>
);

const LandingPages = ({ data }: { data: AdminAnalyticsAudienceResponse }) => {
  const { landing_pages: pages, slug_warnings: warnings } = data;
  return (
    <div className="space-y-3">
      {warnings.total > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <p className="font-medium">
            {formatNumber(warnings.total)} published {warnings.total === 1 ? "story has" : "stories have"} a placeholder URL
            like <code>story-12</code>, which says nothing in analytics or in search results:
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            {warnings.stories.map((story) => (
              <li key={story.id}>
                <Link to={story.admin_link} className="underline underline-offset-2 hover:no-underline">
                  {story.title}
                </Link>{" "}
                <span className="text-muted-foreground">/story/{story.slug}</span>
              </li>
            ))}
            {warnings.total > warnings.stories.length && <li>and {warnings.total - warnings.stories.length} more</li>}
          </ul>
        </div>
      )}
      {pages.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Landing page</th>
                <th className="py-2 pr-3 text-right" title="Unique visitors whose visit began on this page.">Visitors</th>
                <th className="py-2 pr-3 text-right" title="Visits that viewed only this page and did nothing else.">Bounce</th>
                <th className="py-2 text-right" title="Visits that started reading, listening or watching.">Started</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.path} className="border-b last:border-0">
                  <td className="max-w-[360px] py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <PageTypeBadge type={page.type} />
                      <span className="min-w-0 truncate font-medium" title={page.path}>
                        {page.title}
                      </span>
                      {page.admin_link && (
                        <Link to={page.admin_link} className="shrink-0 text-muted-foreground hover:text-primary" title="Open in the admin" aria-label={`Open ${page.title} in the admin`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                    {page.resolved && page.type !== "home" && page.type !== "library" && (
                      <p className="mt-0.5 truncate pl-1 text-[11px] text-muted-foreground">{page.path}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <span className="font-semibold">{formatNumber(page.unique_visitors)}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {page.bounce_rate === null ? "—" : formatPercent(page.bounce_rate)}
                    <span className="ml-1 text-xs text-muted-foreground">of visits</span>
                  </td>
                  <td className="py-2.5 text-right">
                    {page.started_rate === null ? "—" : formatPercent(page.started_rate)}
                    <span className="ml-1 text-xs text-muted-foreground">of visits</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const FORMAT_LABEL: Record<AdminAudienceFormat, string> = {
  read: "Read",
  listen: "Listen",
  watch: "Watch",
  quick_read: "Quick Read",
  blog: "Blog",
};

const FormatSplit = ({ rows }: { rows: AdminAnalyticsAudienceResponse["behaviour"]["format_split"] }) => {
  if (rows.every((row) => row.unique_people === 0)) return <EmptyNote />;
  const maxPeople = Math.max(...rows.map((row) => row.unique_people), 1);
  const maxMinutes = Math.max(...rows.map((row) => row.minutes), 1);
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NEW_COLOR }} aria-hidden="true" />People</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: RETURNING_COLOR }} aria-hidden="true" />Minutes (capped per session)</span>
      </div>
      {rows.map((row) => (
        <div key={row.format}>
          <p className="mb-1 text-sm font-medium">{FORMAT_LABEL[row.format]}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${(row.unique_people / maxPeople) * 100}%`, background: NEW_COLOR }} />
              </div>
              <span className="w-20 shrink-0 text-right"><span className="font-semibold">{formatNumber(row.unique_people)}</span> <span className="text-muted-foreground">people</span></span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${(row.minutes / maxMinutes) * 100}%`, background: RETURNING_COLOR }} />
              </div>
              <span className="w-20 shrink-0 text-right"><span className="font-semibold">{formatNumber(Math.round(row.minutes))}</span> <span className="text-muted-foreground">min</span></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Devices = ({ rows }: { rows: AdminAnalyticsAudienceResponse["behaviour"]["devices"] }) => {
  if (rows.length === 0) return <EmptyNote />;
  const total = rows.reduce((sum, row) => sum + row.visitors, 0);
  const max = Math.max(...rows.map((row) => row.visitors), 1);
  return (
    <ul className="space-y-2">
      {rows.slice(0, 8).map((row) => (
        <li key={row.ua_family}>
          <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate capitalize">{familyLabel(row.ua_family)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{formatNumber(row.visitors)}</span> · {formatPercent(row.visitors / total)} of visitors
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(row.visitors / max) * 100}%`, background: NEW_COLOR }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

const Completions = ({ data }: { data: AdminAnalyticsAudienceResponse["behaviour"]["completions"] }) => {
  const items = [
    { label: "Stories", value: data.stories, hint: "Whole stories finished." },
    { label: "Chapters", value: data.chapters, hint: "Individual chapters finished — not stories." },
    { label: "Read-along", value: data.read_along, hint: "Read-along tracks finished — not stories." },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border p-3 text-center" title={item.hint}>
            <p className="text-2xl font-bold leading-none">{formatNumber(item.value)}</p>
            <p className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">
          {data.story_completion_rate === null ? "—" : formatPercent(data.story_completion_rate)}
        </span>{" "}
        of people who started a story finished it
        {data.story_completion_rate === null
          ? ` (only ${formatNumber(data.story_starters)} starters — too few to rate)`
          : ` (${formatNumber(data.story_starters)} starters)`}
        . Chapters and read-along tracks aren't counted in this rate.
        {data.other > 0 && ` ${formatNumber(data.other)} audio, EPUB or PDF finishes are also recorded separately.`}
      </p>
    </div>
  );
};

export const AudienceTabSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading audience analytics">
    <Skeleton className="h-[88px] w-full" />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KPI_TILES.map((tile) => (
        <Skeleton key={tile.key} className="h-[120px] w-full" />
      ))}
    </div>
    <Skeleton className="h-[340px] w-full" />
    <Skeleton className="h-64 w-full" />
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-64 w-full" />
      ))}
    </div>
  </div>
);

export function AudienceTab({
  data,
  days,
  isRefreshing = false,
}: {
  data: AdminAnalyticsAudienceResponse;
  days: AdminAnalyticsRangeDays;
  isRefreshing?: boolean;
}) {
  return (
    <div className={`space-y-4 transition-opacity ${isRefreshing ? "opacity-60" : ""}`}>
      <TrafficQualityBanner quality={data.traffic_quality} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPI_TILES.map((tile) => {
          const kpi = data.kpis[tile.key];
          return (
            <SampleKpiCard
              key={tile.key}
              label={tile.label}
              hint={tile.hint}
              value={kpi.value === null ? null : tile.format(kpi.value)}
              sample={
                tile.key === "unique_visitors" ? (
                  "in this range"
                ) : (
                  <>
                    {kpi.value === null ? "only " : "of "}
                    <span className="font-medium text-foreground">{formatNumber(kpi.sample_size)}</span> {tile.sampleLabel}
                  </>
                )
              }
              change={tile.change(kpi)}
              days={days}
              emptyHint={`Not enough data: fewer than ${kpi.min_sample} ${tile.sampleLabel} in this range (${kpi.sample_size} so far).`}
            />
          );
        })}
      </div>

      <Section
        title="Visitors over time"
        subtitle="New visitors had never been seen before; returning visitors had."
        days={days}
      >
        <VisitorsChart data={data.visitors_over_time} interval={data.time_interval} />
      </Section>

      <Section
        title="Where visitors come from"
        subtitle="By each visitor's first source in this range. Click a heading to sort."
        days={days}
        accent="border-t-sky-500"
      >
        <AcquisitionTable rows={data.acquisition} days={days} />
      </Section>

      <Section
        title="Landing pages"
        subtitle="Where visits begin, and whether they go on to read, listen or watch."
        days={days}
        accent="border-t-violet-500"
      >
        <LandingPages data={data} />
      </Section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Section title="Formats" subtitle="People and time by how they consumed." days={days} accent="border-t-emerald-500">
          <FormatSplit rows={data.behaviour.format_split} />
        </Section>
        <Section title="Devices" subtitle="Browsers and platforms, by unique visitors." days={days} accent="border-t-amber-500">
          <Devices rows={data.behaviour.devices} />
        </Section>
        <Section title="Completions" subtitle="Stories, chapters and read-along, kept apart." days={days} accent="border-t-rose-500">
          <Completions data={data.behaviour.completions} />
        </Section>
      </div>
    </div>
  );
}
