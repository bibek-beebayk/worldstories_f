import type { AdminAnalyticsMonetizationResponse, AdminAnalyticsRangeDays } from "@/api/types";
import { PageTypeBadge } from "@/components/admin/AudienceTab";
import { ChangeChip, formatCountChange } from "@/components/admin/charts/changeFormat";
import { EmptyNote, Section, Skeleton, formatNumber, rangeLabel } from "@/components/admin/OverviewWidgets";
import { formatBytes } from "@/lib/utils";

const TILES = [
  { key: "ad_impressions", label: "Ad impressions", hint: "Times an ad slot was shown." },
  { key: "downloads", label: "Downloads", hint: "EPUB and PDF downloads." },
  { key: "unique_downloaders", label: "Unique downloaders", hint: "People who downloaded at least once." },
] as const;

export const MonetizationTabSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading monetization analytics">
    <div className="grid gap-3 sm:grid-cols-3">
      {TILES.map((tile) => (
        <Skeleton key={tile.key} className="h-[96px] w-full" />
      ))}
    </div>
    <Skeleton className="h-56 w-full" />
  </div>
);

export function MonetizationTab({
  data,
  days,
  isRefreshing = false,
}: {
  data: AdminAnalyticsMonetizationResponse;
  days: AdminAnalyticsRangeDays;
  isRefreshing?: boolean;
}) {
  if (!data.has_data) {
    return (
      <div className="rounded-lg border bg-card px-6 py-12 text-center">
        <p className="font-medium">No ad or download data yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ad impressions and downloads show up here once they're recorded in this range.
        </p>
      </div>
    );
  }
  return (
    <div className={`space-y-4 transition-opacity ${isRefreshing ? "opacity-60" : ""}`}>
      <div className="grid gap-3 sm:grid-cols-3">
        {TILES.map((tile) => {
          const kpi = data.kpis[tile.key];
          const change = formatCountChange(kpi.value, kpi.previous_value);
          return (
            <div key={tile.key} className="rounded-xl border bg-card px-3 py-3 shadow-sm" title={tile.hint}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tile.label}</p>
              <p className="mt-1.5 text-2xl font-bold leading-none tracking-tight">{formatNumber(kpi.value)}</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
                {change ? <ChangeChip display={change} /> : <span className="text-xs text-muted-foreground">—</span>}
                {days !== "all" && change && <span className="text-[11px] text-muted-foreground">vs {rangeLabel(days)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Ad placements" subtitle="Impressions by page and slot size." days={days} accent="border-t-amber-500">
          {data.ad_placements.length === 0 ? (
            <EmptyNote>No ad impressions in this range</EmptyNote>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Page</th>
                    <th className="py-2 pr-3">Slot</th>
                    <th className="py-2 text-right">Impressions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ad_placements.map((row) => (
                    <tr key={`${row.path}-${row.size}`} className="border-b last:border-0">
                      <td className="max-w-[260px] py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <PageTypeBadge type={row.type} />
                          <span className="truncate font-medium" title={row.path}>{row.title}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 capitalize text-muted-foreground">{row.size}</td>
                      <td className="py-2 text-right font-semibold">{formatNumber(row.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.ad_by_content_type.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              By content:{" "}
              {data.ad_by_content_type.map((row) => `${row.content_type} ${formatNumber(row.count)}`).join(" · ")}
            </p>
          )}
        </Section>

        <Section title="Top downloaded titles" subtitle="Most downloaded stories in this range." days={days} accent="border-t-sky-500">
          {data.top_downloads.length === 0 ? (
            <EmptyNote>No downloads in this range</EmptyNote>
          ) : (
            <ul className="divide-y">
              {data.top_downloads.map((row) => (
                <li key={row.story_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{row.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatNumber(row.count)}</span> downloads
                    {row.bytes > 0 && ` · ${formatBytes(row.bytes)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {data.download_types.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              By type:{" "}
              {data.download_types.map((row) => `${row.content_type} ${formatNumber(row.count)}`).join(" · ")}
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
