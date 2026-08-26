import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Shared by AdminAnalytics.tsx's site-wide dashboard and the per-title
// (story/blog) analytics dialogs — pulled out here rather than kept as
// page-local consts so both can use the exact same card treatment.

export const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-card px-3 py-2 shadow-sm">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
  </div>
);

export const ChartCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <Card className="overflow-hidden">
    <CardHeader className="border-b bg-muted/20 py-3">
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </CardHeader>
    <CardContent className="pt-4">{children}</CardContent>
  </Card>
);
