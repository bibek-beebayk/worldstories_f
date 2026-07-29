import {
  Bar,
  BarChart,
  CartesianGrid,
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

interface BreakdownBarChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  series: Series<T>[];
  layout?: "horizontal" | "vertical";
  formatX?: (value: string) => string;
  formatY?: (value: number) => string;
  height?: number;
  emptyLabel?: string;
}

export function BreakdownBarChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  layout = "horizontal",
  formatX,
  formatY,
  height = 260,
  emptyLabel = "No data for this range yet.",
}: BreakdownBarChartProps<T>) {
  if (data.length === 0) {
    return <div className={emptyStateClass}>{emptyLabel}</div>;
  }

  const isVertical = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        barCategoryGap={isVertical ? 8 : 16}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={!isVertical} vertical={isVertical} />
        {isVertical ? (
          <>
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatY}
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tickFormatter={formatX}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              width={110}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tickFormatter={formatX}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={formatY}
            />
          </>
        )}
        <Tooltip
          formatter={(value: number, name: string) => [formatY ? formatY(value) : value, name]}
          labelFormatter={(value) => (formatX ? formatX(String(value)) : String(value))}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            fontSize: "0.75rem",
          }}
        />
        {series.map((s, idx) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
