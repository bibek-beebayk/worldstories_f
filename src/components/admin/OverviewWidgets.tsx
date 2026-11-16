import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AdminAnalyticsRangeDays,
  AdminAnalyticsTimeInterval,
  AdminOverviewAttentionItem,
  AdminOverviewFormat,
  AdminOverviewFunnelStep,
  AdminOverviewKpi,
  AdminOverviewMover,
  AdminOverviewPublishMarker,
} from "@/api/types";

export const formatNumber = (value: number) => value.toLocaleString();
export const formatPercent = (rate: number) => `${Math.round(rate * 100)}%`;
export const formatMinutes = (minutes: number) =>
  minutes >= 600 ? `${(minutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} h` : `${formatNumber(Math.round(minutes))} min`;

export const rangeLabel = (days: AdminAnalyticsRangeDays) =>
  days === 1 ? "previous 24 hours" : days === "all" ? "all time" : `previous ${days} days`;

const formatPeriod = (interval: AdminAnalyticsTimeInterval) => (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (interval === "hour") return date.toLocaleTimeString([], { hour: "numeric" });
  if (interval === "month") return date.toLocaleDateString([], { month: "short", year: "numeric" });
  const label = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return interval === "week" ? `Week of ${label}` : label;
};

export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden="true" />
);

export const EmptyNote = ({ children = "No activity in this range" }: { children?: ReactNode }) => (
  <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
);

/** A dashboard section: titled card with a link to the matching Analytics tab. */
export const Section = ({
  title,
  subtitle,
  analyticsTab,
  days,
  accent = "border-t-primary",
  children,
}: {
  title: string;
  subtitle?: string;
  analyticsTab?: string;
  days: AdminAnalyticsRangeDays;
  accent?: string;
  children: ReactNode;
}) => (
  <Card className={`min-w-0 overflow-hidden border-t-4 ${accent}`}>
    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b bg-muted/20 px-4 py-3">
      <div className="min-w-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {analyticsTab && (
        <Link
          to={`/admin/analytics?tab=${analyticsTab}&days=${days}`}
          className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline"
        >
          View in Analytics →
        </Link>
      )}
    </CardHeader>
    <CardContent className="px-4 pt-4">{children}</CardContent>
  </Card>
);

export const NeedsAttention = ({ items }: { items: AdminOverviewAttentionItem[] }) => {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        Needs attention
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.link}
            className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-background px-3 py-1 text-sm transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:hover:bg-amber-500/20"
          >
            <span className="min-w-[1.25rem] rounded-full bg-amber-500 px-1.5 text-center text-xs font-semibold leading-5 text-white">
              {formatNumber(item.count)}
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length < 2) return <div className="h-9" />;
  const points = data.map((value, index) => ({ index, value }));
  return (
    <div className="h-9" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={0.12}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const ChangeBadge = ({ kpi, days }: { kpi: AdminOverviewKpi; days: AdminAnalyticsRangeDays }) => {
  if (kpi.change_pct === null) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title={kpi.previous_value === null ? "All time has no earlier period to compare with" : "Nothing in the previous period to compare with"}
      >
        —
      </span>
    );
  }
  const up = kpi.change_pct > 0;
  const down = kpi.change_pct < 0;
  const tone = up ? "text-emerald-600" : down ? "text-rose-600" : "text-muted-foreground";
  return (
    <span className={`text-xs font-semibold ${tone}`} title={`${formatNumber(kpi.previous_value ?? 0)} in the ${rangeLabel(days)}`}>
      {up ? "▲" : down ? "▼" : "•"} {Math.abs(kpi.change_pct).toFixed(1)}%
    </span>
  );
};

export const KpiTile = ({
  label,
  kpi,
  days,
  color,
  format = formatNumber,
}: {
  label: string;
  kpi: AdminOverviewKpi;
  days: AdminAnalyticsRangeDays;
  color: string;
  format?: (value: number) => string;
}) => (
  <div className="min-w-0 overflow-hidden rounded-xl border bg-card px-3 py-3 shadow-sm">
    <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1.5 truncate text-2xl font-bold leading-none tracking-tight">{format(kpi.value)}</p>
    <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className="whitespace-nowrap">
        <ChangeBadge kpi={kpi} days={days} />
      </span>
      {days !== "all" && <span className="text-[11px] leading-tight text-muted-foreground">vs {rangeLabel(days)}</span>}
    </div>
    <div className="mt-2">
      <Sparkline data={kpi.sparkline} color={color} />
    </div>
  </div>
);

export const KpiSkeleton = () => (
  <div className="rounded-xl border bg-card px-3 py-3 shadow-sm">
    <Skeleton className="h-3 w-20" />
    <Skeleton className="mt-3 h-7 w-24" />
    <Skeleton className="mt-3 h-3 w-28" />
    <Skeleton className="mt-3 h-9 w-full" />
  </div>
);

export const TrafficChart = ({
  series,
  markers,
  interval,
}: {
  series: { day: string; visitors: number }[];
  markers: AdminOverviewPublishMarker[];
  interval: AdminAnalyticsTimeInterval;
}) => {
  const formatX = formatPeriod(interval);
  const visitorsByDay = new Map(series.map((row) => [row.day, row.visitors]));
  const markersByDay = new Map<string, AdminOverviewPublishMarker[]>();
  markers.forEach((marker) => {
    if (marker.bucket && visitorsByDay.has(marker.bucket)) {
      markersByDay.set(marker.bucket, [...(markersByDay.get(marker.bucket) ?? []), marker]);
    }
  });

  if (series.length === 0 || series.every((row) => row.visitors === 0)) return <EmptyNote />;

  return (
    <div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={formatX}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={({ active, label }) => {
                if (!active || typeof label !== "string") return null;
                const published = markersByDay.get(label) ?? [];
                return (
                  <div className="max-w-[260px] rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">{formatX(label)}</p>
                    <p className="mt-1">
                      Unique visitors: <span className="font-semibold">{formatNumber(visitorsByDay.get(label) ?? 0)}</span>
                    </p>
                    {published.length > 0 && (
                      <div className="mt-1.5 border-t pt-1.5">
                        <p className="text-muted-foreground">Published</p>
                        {published.map((marker) => (
                          <p key={marker.slug} className="font-medium">{marker.title}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              name="Unique visitors"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              dot={series.length <= 32}
              activeDot={{ r: 4 }}
            />
            {[...markersByDay.entries()].map(([day, published]) => (
              <ReferenceDot
                key={day}
                x={day}
                y={visitorsByDay.get(day) ?? 0}
                r={6}
                fill="#f59e0b"
                stroke="hsl(var(--background))"
                strokeWidth={2}
                ifOverflow="visible"
                // Native hover text, for when the pointer is on the dot itself.
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
      {markersByDay.size > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
          A story was published — hover the dot to see which
        </p>
      )}
    </div>
  );
};

export const Funnel = ({ steps }: { steps: AdminOverviewFunnelStep[] }) => {
  const max = Math.max(...steps.map((step) => step.count), 0);
  if (max === 0) return <EmptyNote />;
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{step.label}</span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{formatNumber(step.count)}</span>
              {step.rate !== null && step.rate_label && (
                <>
                  {" · "}
                  {step.rate > 1 ? (
                    <span title="More readers got to this step than the one above it — some start from Continue Reading or a direct link without opening the story page.">
                      100%+
                    </span>
                  ) : (
                    formatPercent(step.rate)
                  )}{" "}
                  {step.rate_label}
                </>
              )}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80"
              style={{ width: `${Math.max(2, (step.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const FormatCard = ({
  label,
  icon,
  format,
  tone,
}: {
  label: string;
  icon: ReactNode;
  format: AdminOverviewFormat;
  tone: string;
}) => {
  const idle = format.minutes === 0 && format.unique_users === 0;
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <div className={`flex items-center gap-2 text-sm font-medium ${tone}`}>
        {icon}
        {label}
      </div>
      {idle ? (
        <p className="mt-3 text-xs text-muted-foreground">No activity in this range</p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dd className="text-xl font-bold leading-none">{formatMinutes(format.minutes)}</dd>
            <dt className="mt-0.5 text-[11px] text-muted-foreground">time spent</dt>
          </div>
          <div>
            <dd className="font-semibold leading-none">{formatNumber(format.unique_users)}</dd>
            <dt className="mt-0.5 text-[11px] text-muted-foreground">unique {label === "Read" ? "readers" : label === "Listen" ? "listeners" : "watchers"}</dt>
          </div>
          <div>
            <dd className="font-semibold leading-none">
              {format.avg_completion === null ? "—" : formatPercent(format.avg_completion)}
            </dd>
            <dt className="mt-0.5 text-[11px] text-muted-foreground">avg completion</dt>
          </div>
        </dl>
      )}
    </div>
  );
};

const storyReportLink = (story: { title: string }) =>
  `/admin/story-report?search=${encodeURIComponent(story.title)}`;

const RankChange = ({ change }: { change: number | null | undefined }) => {
  if (change === null || change === undefined) {
    return <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600" title="Not ranked in the previous period">NEW</span>;
  }
  if (change === 0) return <span className="text-xs text-muted-foreground" title="Same rank as the previous period">–</span>;
  return (
    <span
      className={`text-xs font-semibold ${change > 0 ? "text-emerald-600" : "text-rose-600"}`}
      title={`${change > 0 ? "Up" : "Down"} ${Math.abs(change)} place${Math.abs(change) === 1 ? "" : "s"} vs the previous period`}
    >
      {change > 0 ? "▲" : "▼"} {Math.abs(change)}
    </span>
  );
};

export const MoverList = ({
  rows,
  kind,
  empty,
}: {
  rows: AdminOverviewMover[];
  kind: "trending" | "gems" | "leaky";
  empty: string;
}) => {
  if (rows.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  // With nothing ranked last period every row would read NEW, which says
  // nothing — so the movement badges only show when there is a comparison.
  const hasComparison = rows.some((row) => row.rank_change !== null && row.rank_change !== undefined);
  return (
    <ol className="space-y-2">
      {rows.map((row, index) => (
        <li key={row.id}>
          <Link
            to={storyReportLink(row)}
            className="group flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium group-hover:text-primary">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {kind === "trending"
                    ? `${formatNumber(Math.round(row.performance_score))} score · ${formatNumber(row.views)} views`
                    : `${row.completion_rate === null ? "—" : formatPercent(row.completion_rate)} completed · ${formatNumber(row.starts)} starts · ${formatNumber(row.views)} views`}
                </p>
              </div>
            </div>
            {kind === "trending" && hasComparison && <RankChange change={row.rank_change} />}
          </Link>
        </li>
      ))}
    </ol>
  );
};

export const MoversSkeleton = () => (
  <div className="space-y-2">
    {[0, 1, 2].map((key) => (
      <Skeleton key={key} className="h-12 w-full" />
    ))}
  </div>
);

const regionName = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

export const countryLabel = (code: string) => {
  try {
    return regionName?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

export const RankedList = ({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; unit: string }[];
}) => (
  <div className="min-w-0">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">No data in this range</p>
    ) : (
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate capitalize">{row.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{formatNumber(row.value)}</span> {row.unit}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
