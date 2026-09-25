import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Shared by AdminAnalytics.tsx's site-wide dashboard and the per-title
// (story/blog) analytics dialogs — pulled out here rather than kept as
// page-local consts so both can use the exact same card treatment.

export const StatTile = ({
  label,
  value,
  current,
  previous,
  average,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number | null;
  average?: string;
}) => {
  const change = current !== undefined && previous != null && previous !== 0
    ? ((current - previous) / Math.abs(previous)) * 100
    : null;
  const isNew = current !== undefined && current > 0 && previous === 0;
  return (
  <div className="group relative min-w-0 overflow-hidden rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.07] via-card to-card px-2.5 py-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:px-3 sm:py-3">
    <span className="absolute inset-y-0 left-0 w-0.5 bg-primary/70" aria-hidden="true" />
    <p className="line-clamp-2 text-[10px] uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px]">{label}</p>
    <p className="mt-1.5 truncate text-base font-bold leading-none tracking-tight sm:text-lg">{value}</p>
    {(change !== null || isNew || average) && (
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        {change !== null && (
          <span className={`rounded-full px-1.5 py-0.5 font-semibold ${change >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
            {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {isNew && (
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-600">
            New vs previous
          </span>
        )}
        {average && <span className="text-muted-foreground">Avg {average}</span>}
      </div>
    )}
  </div>
  );
};

export const ChartCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <Card className="overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md">
    <CardHeader className="border-b bg-gradient-to-r from-primary/[0.07] via-muted/20 to-transparent px-3 py-3 sm:px-6">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold before:h-4 before:w-1 before:rounded-full before:bg-primary">{title}</CardTitle>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </CardHeader>
    <CardContent className="px-2 pt-4 sm:px-6">{children}</CardContent>
  </Card>
);
