import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminAnalyticsTimeInterval } from "@/api/types";

export interface MarkedTrendMarker {
  /** The `day` of the data point this marker sits on; null means it can't be placed. */
  bucket: string | null;
  title: string;
  slug: string;
  type?: "story" | "blog";
}

interface MarkedTrendChartProps {
  data: { day: string; value: number }[];
  /** The preceding period, drawn dashed and overlaid position-by-position. */
  previous?: { day: string; value: number }[] | null;
  markers?: MarkedTrendMarker[];
  interval: AdminAnalyticsTimeInterval;
  /** What the line measures, e.g. "Views" or "Unique visitors". */
  label: string;
  height?: number;
  emptyLabel?: string;
}

export const formatPeriod = (interval: AdminAnalyticsTimeInterval) => (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (interval === "hour") return date.toLocaleTimeString([], { hour: "numeric" });
  if (interval === "month") return date.toLocaleDateString([], { month: "short", year: "numeric" });
  const label = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return interval === "week" ? `Week of ${label}` : label;
};

const formatNumber = (value: number) => value.toLocaleString();

/**
 * A single-metric time series with an optional previous-period overlay and
 * hoverable publish markers. `monotone` interpolation keeps the line from
 * overshooting below zero between sparse points.
 */
export function MarkedTrendChart({
  data,
  previous,
  markers = [],
  interval,
  label,
  height = 240,
  emptyLabel = "No activity in this range",
}: MarkedTrendChartProps) {
  const formatX = formatPeriod(interval);
  const hasData = data.some((row) => row.value > 0) || Boolean(previous?.some((row) => row.value > 0));
  if (data.length === 0 || !hasData) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  // Compare equivalent positions inside each period, not their calendar dates,
  // so the previous period overlays the current one even when bucketing differs.
  const rows = data.map((row, index) => {
    if (!previous?.length) return { ...row, previous: undefined as number | undefined };
    const previousIndex = data.length <= 1 ? 0 : Math.round((index * (previous.length - 1)) / (data.length - 1));
    return { ...row, previous: previous[previousIndex]?.value };
  });

  const valueByDay = new Map(data.map((row) => [row.day, row.value]));
  const markersByDay = new Map<string, MarkedTrendMarker[]>();
  markers.forEach((marker) => {
    if (marker.bucket && valueByDay.has(marker.bucket)) {
      markersByDay.set(marker.bucket, [...(markersByDay.get(marker.bucket) ?? []), marker]);
    }
  });
  const rowByDay = new Map(rows.map((row) => [row.day, row]));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="hsl(var(--primary))" strokeWidth="2" />
          </svg>
          This period
        </span>
        {previous && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden="true">
              <line
                x1="0"
                y1="4"
                x2="22"
                y2="4"
                stroke="hsl(var(--primary))"
                strokeOpacity="0.55"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            </svg>
            Previous period
          </span>
        )}
        {markersByDay.size > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
            Published — hover to see what
          </span>
        )}
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
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
              domain={[0, "auto"]}
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={({ active, label: hovered }) => {
                if (!active || typeof hovered !== "string") return null;
                const row = rowByDay.get(hovered);
                const published = markersByDay.get(hovered) ?? [];
                return (
                  <div className="max-w-[260px] rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">{formatX(hovered)}</p>
                    <p className="mt-1">
                      {label}: <span className="font-semibold">{formatNumber(row?.value ?? 0)}</span>
                    </p>
                    {row?.previous !== undefined && (
                      <p className="text-muted-foreground">
                        Previous period: <span className="font-semibold">{formatNumber(row.previous)}</span>
                      </p>
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
            <Area
              type="monotone"
              dataKey="value"
              name={label}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              dot={data.length <= 32}
              activeDot={{ r: 4 }}
            />
            {previous && (
              <Line
                type="monotone"
                dataKey="previous"
                name={`${label} (previous period)`}
                stroke="hsl(var(--primary))"
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
                y={valueByDay.get(day) ?? 0}
                r={6}
                ifOverflow="visible"
                // Native hover text for when the pointer is on the dot itself.
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
}
