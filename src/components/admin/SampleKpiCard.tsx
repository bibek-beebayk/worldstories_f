import type { ReactNode } from "react";
import type { AdminAnalyticsRangeDays } from "@/api/types";
import { ChangeChip, type ChangeDisplay } from "@/components/admin/charts/changeFormat";
import { rangeLabel } from "@/components/admin/OverviewWidgets";

/**
 * A KPI tile for a value that may be too thin to show: "—" with an explanation
 * when `value` is null, the number of people behind it underneath, and the
 * change against the previous period. Shared by the Engagement and Audience tabs.
 */
export function SampleKpiCard({
  label,
  hint,
  value,
  sample,
  change,
  days,
  emptyHint,
  footer,
}: {
  label: string;
  hint: string;
  value: string | null;
  /** What the value is out of, e.g. "483 visitors". */
  sample: ReactNode;
  change: ChangeDisplay | null;
  days: AdminAnalyticsRangeDays;
  /** Shown as a tooltip on the "—" when the sample is too small. */
  emptyHint: string;
  /** Optional extra content under the change line, e.g. a sparkline. */
  footer?: ReactNode;
}) {
  const enough = value !== null;
  return (
    <div className="min-w-0 rounded-xl border bg-card px-3 py-3 shadow-sm" title={hint}>
      <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 truncate text-2xl font-bold leading-none tracking-tight ${enough ? "" : "text-muted-foreground"}`}
        title={enough ? undefined : emptyHint}
      >
        {enough ? value : "—"}
      </p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{sample}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        {change ? <ChangeChip display={change} /> : <span className="text-xs text-muted-foreground">—</span>}
        {days !== "all" && change && <span className="text-[11px] leading-tight text-muted-foreground">vs {rangeLabel(days)}</span>}
      </div>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
