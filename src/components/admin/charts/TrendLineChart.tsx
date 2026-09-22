import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_PALETTE, emptyStateClass } from "./palette";

interface Series<T> {
  key: keyof T & string;
  label: string;
}

interface TrendLineChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  series: Series<T>[];
  formatX?: (value: string) => string;
  formatY?: (value: number) => string;
  height?: number;
  emptyLabel?: string;
  yDomain?: [number, number];
  yAxisWidth?: number;
  previousData?: T[] | null;
}

const defaultFormatX = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function TrendLineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  formatX = defaultFormatX,
  formatY,
  height = 260,
  emptyLabel = "Not enough data for this range yet.",
  yDomain,
  yAxisWidth = 36,
  previousData,
}: TrendLineChartProps<T>) {
  if (data.length === 0) {
    return <div className={emptyStateClass}>{emptyLabel}</div>;
  }

  const chartData = data.map((row, index) => {
    // Compare equivalent positions inside each period, not their real calendar
    // dates. This keeps the previous period directly overlaid on the selected
    // period even when month/week bucketing produces a different row count.
    const previousIndex = previousData?.length
      ? data.length <= 1
        ? 0
        : Math.round(index * (previousData.length - 1) / (data.length - 1))
      : -1;
    const previous = previousIndex >= 0 ? previousData?.[previousIndex] : undefined;
    if (!previous) return row;
    return {
      ...row,
      ...Object.fromEntries(series.map((item) => [`${item.key}__previous`, previous[item.key]])),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={formatX}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          domain={yDomain ?? [0, "auto"]}
          allowDecimals={Boolean(yDomain)}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={yAxisWidth}
          tickFormatter={formatY}
        />
        <Tooltip
          labelFormatter={(value) => formatX(String(value))}
          formatter={(value: number, name: string) => [formatY ? formatY(value) : value, name]}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            fontSize: "0.75rem",
          }}
        />
        {series.map((s, idx) => (
          previousData && (
            <Line
              key={`${s.key}-previous`}
              type="monotone"
              dataKey={`${s.key}__previous`}
              name={`${s.label} (previous)`}
              stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
              strokeWidth={2}
              strokeDasharray="5 5"
              strokeOpacity={0.55}
              dot={false}
              activeDot={{ r: 3 }}
            />
          )
        ))}
        {series.map((s, idx) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
            strokeWidth={2}
            // 32 covers every filled range the dashboard asks for (25 hourly
            // buckets for 24h, 31 daily for 30d, 14 weekly, 13 monthly), so
            // series no longer lose their dots just because empty buckets are
            // now included in the row count.
            dot={data.length <= 32}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
