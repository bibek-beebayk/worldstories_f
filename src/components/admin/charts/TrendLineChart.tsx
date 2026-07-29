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
}: TrendLineChartProps<T>) {
  if (data.length === 0) {
    return <div className={emptyStateClass}>{emptyLabel}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
            strokeWidth={2}
            dot={data.length <= 30}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
