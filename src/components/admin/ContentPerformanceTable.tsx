import { Info } from "lucide-react";
import { TitleAnalyticsDialog } from "@/components/admin/TitleAnalyticsDialog";
import { RankChange } from "@/components/admin/OverviewWidgets";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdminAnalyticsRangeDays, AdminContentKind, AdminContentPerformanceRow } from "@/api/types";

const number = (value: number) => value.toLocaleString();
const minutes = (value: number) => `${number(Math.round(value))}m`;
const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);

const PEOPLE_LABEL: Record<AdminContentKind, string> = {
  story: "People",
  audiobook: "Listeners",
  quick_read: "Readers",
  blog: "Readers",
};

interface ContentPerformanceTableProps {
  rows: AdminContentPerformanceRow[];
  kind: AdminContentKind;
  days: AdminAnalyticsRangeDays;
  /** The score formula, shown in a tooltip on the Score column. */
  scoreSummary?: string;
  emptyMessage?: string;
}

const HeaderHint = ({ label, hint, align = "right" }: { label: string; hint: string; align?: "left" | "right" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className={`inline-flex cursor-help items-center gap-1 uppercase tracking-wide ${align === "right" ? "justify-end" : ""}`}
      >
        {label}
        <Info className="h-3 w-3 opacity-60" aria-hidden="true" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-xs normal-case tracking-normal">{hint}</TooltipContent>
  </Tooltip>
);

const reportKind = (kind: AdminContentKind) => (kind === "blog" ? "blog" : kind === "quick_read" ? "quick_read" : "story");

export function ContentPerformanceTable({
  rows,
  kind,
  days,
  scoreSummary = "A 0-100 score, normalised within this content type for the range.",
  emptyMessage = "No activity was recorded in this range.",
}: ContentPerformanceTableProps) {
  // With nothing ranked last period every row would read NEW, which says
  // nothing; the movement column only shows once there is something to compare.
  const hasComparison = rows.some((row) => row.rank_change !== null);
  const movement = (row: AdminContentPerformanceRow) =>
    hasComparison && row.unique_people > 0 && row.previous_score !== null ? (
      <RankChange change={row.rank_change} />
    ) : (
      <span className="text-xs text-muted-foreground">–</span>
    );
  const lowSampleBadge = (
    <span
      className="ml-2 inline-flex rounded border px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      title="Fewer than 2 people, so the score says little"
    >
      Low sample
    </span>
  );
  const timeHint = "Minutes spent, counting each session only up to a cap so an idle tab can't inflate it.";
  const completionHint = "Share of signed-in readers who finished. Anonymous readers' progress isn't tracked.";

  const table = (
    <div className="hidden overflow-x-auto scrollbar-thin sm:block">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 uppercase tracking-wide">Content</th>
            <th className="py-2 pr-4 text-right">
              <HeaderHint label="Score" hint={scoreSummary} />
            </th>
            <th className="py-2 pr-4 text-center uppercase tracking-wide">Move</th>
            <th className="py-2 pr-4 text-right">
              <HeaderHint label={PEOPLE_LABEL[kind]} hint="Distinct people, however many sessions each had." />
            </th>
            <th className="py-2 pr-4 text-right">
              <HeaderHint label="Time" hint={timeHint} />
            </th>
            <th className="py-2 pr-4 text-right">
              <HeaderHint label="Completion" hint={completionHint} />
            </th>
            <th className="py-2 pr-4 text-right uppercase tracking-wide">Interactions</th>
            <th className="py-2 text-right uppercase tracking-wide">Report</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`border-b transition-colors last:border-0 hover:bg-primary/[0.04] ${row.low_sample ? "text-muted-foreground" : ""}`}
            >
              <td className="max-w-[300px] py-3 pr-4 font-medium">
                <span className={`line-clamp-2 ${row.low_sample ? "opacity-70" : ""}`}>
                  {row.title}
                  {row.low_sample && lowSampleBadge}
                </span>
              </td>
              <td className={`py-3 pr-4 text-right font-semibold ${row.low_sample ? "" : "text-foreground"}`}>
                {row.performance_score.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </td>
              <td className="py-3 pr-4 text-center">{movement(row)}</td>
              <td className="py-3 pr-4 text-right">{number(row.unique_people)}</td>
              <td className="py-3 pr-4 text-right">{minutes(row.engagement_minutes)}</td>
              <td className="py-3 pr-4 text-right">{percent(row.completion_rate)}</td>
              <td className="py-3 pr-4 text-right">{number(row.interactions)}</td>
              <td className="py-3 text-right">
                <TitleAnalyticsDialog kind={reportKind(kind)} slug={row.slug} title={row.title} initialDays={days} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const mobileCards = (
    <div className="space-y-2 sm:hidden">
      {rows.map((row) => (
        <div
          key={row.id}
          className={`rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-card p-3 shadow-sm ${row.low_sample ? "opacity-70" : ""}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
              {row.title}
              {row.low_sample && lowSampleBadge}
            </p>
            <TitleAnalyticsDialog kind={reportKind(kind)} slug={row.slug} title={row.title} initialDays={days} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Score", value: row.performance_score.toLocaleString(undefined, { maximumFractionDigits: 1 }) },
              { label: PEOPLE_LABEL[kind], value: number(row.unique_people) },
              { label: "Time", value: minutes(row.engagement_minutes) },
              { label: "Done", value: percent(row.completion_rate) },
            ].map((cell) => (
              <div key={cell.label} className="rounded-md bg-muted/40 px-1.5 py-2">
                <p className="text-sm font-semibold">{cell.value}</p>
                <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">{cell.label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>}
    </div>
  );

  return (
    <>
      {mobileCards}
      {table}
    </>
  );
}
