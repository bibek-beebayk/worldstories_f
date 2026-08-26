import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatTile, ChartCard } from "@/components/admin/charts/AnalyticsCards";
import { BreakdownBarChart } from "@/components/admin/charts/BreakdownBarChart";
import { storyApi } from "@/api/story";
import type { AdminAnalyticsRangeDays } from "@/api/types";

const formatNumber = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const RANGE_OPTIONS: { value: AdminAnalyticsRangeDays; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
];

interface TitleAnalyticsDialogProps {
  kind: "story" | "blog";
  slug: string;
  title: string;
}

// One dialog handles both stories and blogs since the shell (trigger,
// header, time-range picker) is identical — only the stat tiles and the
// breakdown table underneath differ enough to warrant branching rather
// than two near-duplicate components.
export function TitleAnalyticsDialog({ kind, slug, title }: TitleAnalyticsDialogProps) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<AdminAnalyticsRangeDays>(30);

  const storyQuery = useQuery({
    queryKey: ["admin-analytics", "story-detail", slug, days],
    queryFn: () => storyApi.getAdminStoryDetailAnalytics(slug, days),
    enabled: open && kind === "story",
  });
  const blogQuery = useQuery({
    queryKey: ["admin-analytics", "blog-detail", slug, days],
    queryFn: () => storyApi.getAdminBlogDetailAnalytics(slug, days),
    enabled: open && kind === "blog",
  });

  const isLoading = kind === "story" ? storyQuery.isLoading : blogQuery.isLoading;
  const isError = kind === "story" ? storyQuery.isError : blogQuery.isError;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        aria-label={`View analytics for ${title}`}
        title="View analytics"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
      {/* overflow-auto (not overflow-x-hidden) is deliberate: it's a safety
          net, not the actual fix — if anything below ever still ends up
          wider than the dialog, it becomes scrollable instead of silently
          clipped and inaccessible. */}
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto">
        <DialogHeader className="flex-row items-start justify-between gap-3 space-y-0 pr-6">
          {/* min-w-0 lets this flex item actually shrink below the title's
              own intrinsic width — flex items default to min-width:auto,
              which otherwise uses the untruncated text width as the floor
              and stretches the whole dialog to fit a one-line title. No
              truncate: a long title wraps to multiple lines instead of
              being cut off, while the range filter stays put on the right
              (shrink-0, so it never gets squeezed by the wrapped title). */}
          <DialogTitle className="min-w-0 flex-1 leading-snug">{title}</DialogTitle>
          <Select value={String(days)} onValueChange={(value) => setDays(Number(value) as AdminAnalyticsRangeDays)}>
            <SelectTrigger className="w-[150px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {isError && <p className="text-sm text-red-600">Failed to load analytics for this title.</p>}

        {kind === "story" && storyQuery.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Page opens" value={formatNumber(storyQuery.data.page_opens)} />
              <StatTile label="Started reading" value={formatNumber(storyQuery.data.started_reading)} />
              <StatTile label="Completed" value={formatNumber(storyQuery.data.completed_reading)} />
              <StatTile label="Avg. progress" value={formatPercent(storyQuery.data.avg_progress)} />
              <StatTile label="Reading time" value={`${formatNumber(Math.round(storyQuery.data.reading_minutes))}m`} />
              <StatTile label="Favorites" value={formatNumber(storyQuery.data.favorites_count)} />
              <StatTile label="Reviews" value={formatNumber(storyQuery.data.reviews_count)} />
              <StatTile
                label="Avg. rating"
                value={storyQuery.data.reviews_count ? `${storyQuery.data.avg_rating_in_range.toFixed(1)}★` : "—"}
              />
              {storyQuery.data.has_audio && storyQuery.data.audio && (
                <>
                  <StatTile label="Listeners" value={formatNumber(storyQuery.data.audio.listeners)} />
                  <StatTile label="Avg. listen-through" value={formatPercent(storyQuery.data.audio.avg_progress)} />
                  <StatTile
                    label="Listening time"
                    value={`${formatNumber(Math.round(storyQuery.data.audio.listening_minutes))}m`}
                  />
                </>
              )}
            </div>

            <ChartCard
              title="Chapter breakdown"
              subtitle="Readers and average progress per chapter — where the reader count drops off is where readers are stopping"
            >
              {storyQuery.data.chapter_breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chapter activity in this range yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Chapter</th>
                        <th className="py-2 pr-3 text-right">Readers</th>
                        <th className="py-2 pr-3 text-right">Avg. progress</th>
                        <th className="py-2 text-right">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storyQuery.data.chapter_breakdown.map((row) => (
                        <tr key={row.chapter_slug} className="border-b last:border-0">
                          <td className="max-w-52 truncate py-2 pr-3">
                            {row.chapter_order}. {row.chapter_title}
                          </td>
                          <td className="py-2 pr-3 text-right">{formatNumber(row.readers)}</td>
                          <td className="py-2 pr-3 text-right">{formatPercent(row.avg_progress)}</td>
                          <td className="py-2 text-right">{formatNumber(row.completed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {kind === "blog" && blogQuery.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Page opens" value={formatNumber(blogQuery.data.page_opens)} />
              <StatTile label="Started reading" value={formatNumber(blogQuery.data.started_reading)} />
              <StatTile label="Reading time" value={`${formatNumber(Math.round(blogQuery.data.reading_minutes))}m`} />
              <StatTile
                label="Avg. progress (signed-in)"
                value={formatPercent(blogQuery.data.avg_progress_signed_in)}
              />
              <StatTile label="Completed (signed-in)" value={formatNumber(blogQuery.data.completed_signed_in)} />
              <StatTile
                label="Signed-in readers tracked"
                value={formatNumber(blogQuery.data.signed_in_readers_with_depth_tracked)}
              />
            </div>

            <ChartCard
              title="Reading depth (signed-in readers)"
              subtitle="Anonymous readers only contribute to page opens/started reading above — scroll depth can only be tracked for signed-in readers"
            >
              <BreakdownBarChart
                data={blogQuery.data.progress_distribution_signed_in}
                xKey="bucket"
                series={[{ key: "count", label: "Readers" }]}
                emptyLabel="No signed-in reading activity in this range yet."
              />
            </ChartCard>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
