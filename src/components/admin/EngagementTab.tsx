import { Link } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Star } from "lucide-react";
import type {
  AdminAnalyticsEngagementResponse,
  AdminAnalyticsRangeDays,
  AdminEngagementFormat,
  AdminEngagementFunnelStep,
  AdminEngagementKpi,
  AdminEngagementKpiKey,
  AdminEngagementLength,
} from "@/api/types";
import { CHART_PALETTE } from "@/components/admin/charts/palette";
import { SampleKpiCard } from "@/components/admin/SampleKpiCard";
import {
  ChangeChip,
  formatCountChange,
  formatRateChange,
  type ChangeDisplay,
} from "@/components/admin/charts/changeFormat";
import {
  EmptyNote,
  Section,
  Skeleton,
  Sparkline,
  formatNumber,
  formatPercent,
  rangeLabel,
} from "@/components/admin/OverviewWidgets";

const KPI_TILES: {
  key: AdminEngagementKpiKey;
  label: string;
  hint: string;
  format: (value: number) => string;
  change: (kpi: AdminEngagementKpi) => ChangeDisplay | null;
}[] = [
  {
    key: "start_rate",
    label: "Start rate",
    hint: "People who started reading or listening, out of people who viewed the story page (never fewer than those who started).",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
  {
    key: "completion_rate",
    label: "Completion rate",
    hint: "Signed-in readers who finished a story, out of signed-in readers who started. Only signed-in readers' completions are recorded.",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
  {
    key: "minutes_per_reader",
    label: "Minutes per reader",
    hint: "Average capped session time per person who read, listened or watched.",
    format: (value) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} min`,
    change: (kpi) =>
      kpi.value === null ? null : formatCountChange(kpi.value, kpi.previous_value, { unit: " min", decimals: 1 }),
  },
  {
    key: "returning_rate",
    label: "Returning readers",
    hint: "Readers active on another day in this range, or in the period before it, out of all active readers.",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
  {
    key: "audio_listen_through",
    label: "Audio listen-through",
    hint: "How far listeners get on average, from the furthest 25 / 50 / 75% mark they reach (100% when they finish).",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
  {
    key: "video_watch_through",
    label: "Video watch-through",
    hint: "Average saved progress of signed-in viewers. Video pages record no progress for anonymous viewers.",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
];

const KpiCard = ({ tile, kpi, days }: { tile: (typeof KPI_TILES)[number]; kpi: AdminEngagementKpi; days: AdminAnalyticsRangeDays }) => (
  <SampleKpiCard
    label={tile.label}
    hint={tile.hint}
    value={kpi.value === null ? null : tile.format(kpi.value)}
    sample={
      <>
        {kpi.value === null ? "only " : "of "}
        <span className="font-medium text-foreground">{formatNumber(kpi.sample_size)}</span> {kpi.sample_label}
      </>
    }
    change={tile.change(kpi)}
    days={days}
    emptyHint={`Not enough data: fewer than ${kpi.min_sample} ${kpi.sample_label} in this range (${kpi.sample_size} so far).`}
  />
);

const FORMAT_META: Record<AdminEngagementFormat, { title: string; note: string }> = {
  read: {
    title: "Read",
    note: "Completion is recorded for signed-in readers only, so that step is rated against signed-in readers.",
  },
  listen: {
    title: "Listen",
    note: "Completion is signed-in only. The read-along page doesn't report progress, so it only appears in the first two steps.",
  },
  watch: {
    title: "Watch",
    note: "Video pages record no start or progress events: 50% and completion come from signed-in viewers' saved progress.",
  },
};

const Funnel = ({ format, steps, days }: { format: AdminEngagementFormat; steps: AdminEngagementFunnelStep[]; days: AdminAnalyticsRangeDays }) => {
  const max = Math.max(...steps.map((step) => step.count), 0);
  const meta = FORMAT_META[format];
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <p className="mb-3 text-sm font-semibold">{meta.title}</p>
      {max === 0 ? (
        <EmptyNote>No activity in this range</EmptyNote>
      ) : (
        <div>
          {steps.map((step, index) => (
            <div key={step.key}>
              {index > 0 && (
                <p className="my-1.5 pl-1 text-[11px] text-muted-foreground">
                  ↓{" "}
                  <span className="font-medium text-foreground">{step.rate === null ? "—" : formatPercent(step.rate)}</span>{" "}
                  {step.population === "signed_in" ? "of signed-in readers went on" : "went on"}
                  {days !== "all" && step.previous_rate !== null && step.rate !== null && (
                    <span title="Same step in the previous period"> (was {formatPercent(step.previous_rate)})</span>
                  )}
                </p>
              )}
              <div className="mb-0.5 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {step.label}
                  {step.partial && (
                    <span className="ml-1.5 rounded border px-1 py-px align-middle text-[9px] uppercase tracking-wide text-muted-foreground" title="Only signed-in people are recorded at this step">
                      Signed-in
                    </span>
                  )}
                </span>
                <span className="font-semibold">{formatNumber(step.count)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${step.partial ? "bg-primary/45" : "bg-primary/80"}`}
                  style={{ width: `${step.count === 0 ? 0 : Math.max(2, (step.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{meta.note}</p>
        </div>
      )}
    </div>
  );
};

const LENGTH_META: { key: AdminEngagementLength; label: string; hint: string }[] = [
  { key: "short", label: "Short", hint: "under 20 min" },
  { key: "medium", label: "Medium", hint: "20–60 min" },
  { key: "long", label: "Long", hint: "over 60 min" },
];

const DepthCurve = ({ data }: { data: AdminAnalyticsEngagementResponse["depth_curve"] }) => {
  if (LENGTH_META.every((meta) => data[meta.key].starters === 0)) return <EmptyNote>No activity in this range</EmptyNote>;
  const rows = [0, 25, 50, 75, 100].map((pct) => {
    const row: Record<string, number | null> = { pct };
    for (const meta of LENGTH_META) {
      const rate = data[meta.key].points.find((point) => point.pct === pct)?.rate;
      const value = rate === null || rate === undefined ? null : Math.round(rate * 1000) / 10;
      // 100% is signed-in readers only, a different population from the points
      // before it, so it is a separate marker rather than the end of the line.
      row[meta.key] = pct === 100 ? null : value;
      row[`${meta.key}_done`] = pct === 100 ? value : null;
    }
    return row;
  });
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LENGTH_META.map((meta, index) => (
          <span key={meta.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded" style={{ background: CHART_PALETTE[index] }} aria-hidden="true" />
            {meta.label} ({meta.hint}) · {formatNumber(data[meta.key].starters)} starters
          </span>
        ))}
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="pct"
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              label={{ value: "How far through the story", position: "insideBottom", offset: -10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={({ active, label }) => {
                if (!active) return null;
                const pct = Number(label);
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">{pct === 0 ? "Started" : `Reached ${pct}%`}</p>
                    {LENGTH_META.map((meta) => {
                      const point = data[meta.key].points.find((p) => p.pct === pct);
                      if (!point || point.rate === null) return null;
                      return (
                        <p key={meta.key}>
                          {meta.label}: <span className="font-semibold">{formatPercent(point.rate)}</span>{" "}
                          <span className="text-muted-foreground">
                            ({formatNumber(point.reached)} of {formatNumber(point.of)}
                            {point.population === "signed_in" ? ", signed-in only" : ""})
                          </span>
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
            {LENGTH_META.map((meta, index) => (
              <Line
                key={meta.key}
                type="monotone"
                dataKey={meta.key}
                name={meta.label}
                stroke={CHART_PALETTE[index]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: CHART_PALETTE[index] }}
                activeDot={{ r: 5 }}
              />
            ))}
            {LENGTH_META.map((meta, index) => (
              <Line
                key={`${meta.key}_done`}
                dataKey={`${meta.key}_done`}
                name={`${meta.label} (signed-in finishers)`}
                stroke="transparent"
                strokeWidth={0}
                legendType="none"
                activeDot={false}
                dot={(props: { cx?: number; cy?: number; index?: number; payload?: Record<string, number | null> }) =>
                  // Recharts calls this for empty points too; only the 100% row has a value.
                  props.payload?.[`${meta.key}_done`] == null || props.cx === undefined || props.cy === undefined ? (
                    <g key={`${meta.key}-done-${props.index}`} />
                  ) : (
                    <circle
                      key={`${meta.key}-done-${props.index}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      stroke={CHART_PALETTE[index]}
                      strokeWidth={2}
                      fill="hsl(var(--background))"
                    />
                  )
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        0–75% is every reader who started. The separate hollow 100% marker is the share of signed-in readers who finished — only they can be seen finishing, so it isn't a continuation of the line. Reading, listening and watching progress is recorded at the 25 / 50 / 75% marks, so there is no 10% point.
      </p>
    </div>
  );
};

const DropOffTable = ({ rows }: { rows: AdminAnalyticsEngagementResponse["drop_off_stories"] }) => {
  if (rows.length === 0) return <EmptyNote>No story has 5 or more starters in this range yet.</EmptyNote>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4">Story</th>
            <th className="py-2 pr-4 text-right">Starters</th>
            <th className="py-2 pr-4 text-right" title="Reached the last quarter of the story or finished it. Counts anonymous readers too.">Reached the end</th>
            <th className="py-2 pr-4 text-right" title="Finished it. Only signed-in readers' completions are recorded.">Completed</th>
            <th className="py-2 text-left" title="Where the biggest share of starters stop reading.">Most stop at</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="max-w-[260px] py-2.5 pr-4 font-medium">
                <Link
                  to={`/admin/story-report?search=${encodeURIComponent(row.title)}`}
                  className="line-clamp-2 hover:text-primary hover:underline"
                >
                  {row.title}
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-right">{formatNumber(row.starters)}</td>
              <td className="py-2.5 pr-4 text-right font-semibold">
                {row.finish_rate === null ? "—" : formatPercent(row.finish_rate)}
              </td>
              <td className="py-2.5 pr-4 text-right">
                {row.completion_rate === null ? (
                  "—"
                ) : (
                  <>
                    {formatPercent(row.completion_rate)}
                    <span className="ml-1 text-xs text-muted-foreground">of {formatNumber(row.signed_in_starters)} signed-in</span>
                  </>
                )}
              </td>
              <td className="py-2.5 text-left">
                {row.stop_at ? (
                  <>
                    <span className="font-medium">{row.stop_at}</span>
                    {row.stop_share !== null && (
                      <span className="ml-1 text-xs text-muted-foreground">({formatPercent(row.stop_share)} of starters)</span>
                    )}
                    {row.stop_chapter && (
                      <span className="block text-xs text-muted-foreground">
                        around chapter {row.stop_chapter.order}: {row.stop_chapter.title}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Retention = ({ data, days }: { data: AdminAnalyticsEngagementResponse["retention"]; days: AdminAnalyticsRangeDays }) => {
  const keys = ["d1", "d7", "d30"] as const;
  if (keys.every((key) => data[key].eligible === 0)) {
    return <EmptyNote>No signed-in readers are old enough yet to measure return visits.</EmptyNote>;
  }
  const showPrevious = days !== "all" && keys.some((key) => data[key].previous_rate !== null);
  const rows = keys.map((key) => ({
    label: key === "d1" ? "Day 1" : key === "d7" ? "Day 7" : "Day 30",
    current: data[key].rate === null ? null : Math.round(data[key].rate! * 1000) / 10,
    previous: data[key].previous_rate === null ? null : Math.round(data[key].previous_rate! * 1000) / 10,
    returned: data[key].returned,
    eligible: data[key].eligible,
  }));
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden="true" />
          This period
        </span>
        {showPrevious && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/40" aria-hidden="true" />
            Previous period
          </span>
        )}
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as (typeof rows)[number];
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">{row.label} return rate</p>
                    <p>
                      This period: <span className="font-semibold">{row.current === null ? "—" : `${row.current}%`}</span>{" "}
                      <span className="text-muted-foreground">({formatNumber(row.returned)} of {formatNumber(row.eligible)} readers)</span>
                    </p>
                    {showPrevious && (
                      <p className="text-muted-foreground">Previous period: {row.previous === null ? "—" : `${row.previous}%`}</p>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="current" name="This period" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            {showPrevious && <Bar dataKey="previous" name="Previous period" fill="hsl(var(--primary))" fillOpacity={0.4} radius={[3, 3, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const FeedbackStat = ({
  label,
  total,
  previousTotal,
  sparkline,
  color,
  extra,
}: {
  label: string;
  total: number;
  previousTotal: number | null;
  sparkline: number[];
  color: string;
  extra?: string;
}) => {
  const change = formatCountChange(total, previousTotal);
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold leading-none">{formatNumber(total)}</p>
        {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
      </div>
      <div className="mt-1.5 min-h-[18px]">{change && <ChangeChip display={change} />}</div>
      <div className="mt-1">
        <Sparkline data={sparkline} color={color} />
      </div>
    </div>
  );
};

const Feedback = ({ data }: { data: AdminAnalyticsEngagementResponse["feedback"] }) => {
  const { favorites, reviews, reactions } = data;
  const maxCount = Math.max(...reviews.distribution.map((row) => row.count), 1);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FeedbackStat
          label="Favorites"
          total={favorites.total}
          previousTotal={favorites.previous_total}
          sparkline={favorites.sparkline}
          color="#f43f5e"
        />
        <FeedbackStat
          label="Reviews"
          total={reviews.total}
          previousTotal={reviews.previous_total}
          sparkline={reviews.sparkline}
          color="#f59e0b"
          extra={reviews.avg_rating === null ? undefined : `${reviews.avg_rating.toFixed(1)}★ average`}
        />
        <FeedbackStat label="Reactions" total={reactions.total} previousTotal={reactions.previous_total} sparkline={reactions.sparkline} color="#8b5cf6" />
      </div>
      {reviews.total >= 5 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Rating distribution ({formatNumber(reviews.total)} reviews)</p>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviews.distribution.find((row) => row.rating === rating)?.count ?? 0;
              return (
                <div key={rating} className="flex items-center gap-2 text-xs">
                  <span className="flex w-8 shrink-0 items-center gap-0.5">
                    {rating}
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-muted-foreground">{formatNumber(count)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const OtherSignals = ({ data }: { data: AdminAnalyticsEngagementResponse["other_signals"] }) => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {data.rates.map((row) => (
        <div key={row.key} className="rounded-lg border p-3" title={row.help}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
          <p className="mt-1 text-xl font-bold leading-none">{row.rate === null ? "—" : formatPercent(row.rate)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatNumber(row.numerator)} of {formatNumber(row.denominator)}
          </p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {Object.entries(data.discovery).map(([key, value]) => (
        <div key={key} className="rounded-md bg-muted/40 px-2 py-2 text-center">
          <p className="text-base font-semibold">{formatNumber(value)}</p>
          <p className="mt-0.5 text-[10px] capitalize leading-tight text-muted-foreground">{key.replace(/_/g, " ")}</p>
        </div>
      ))}
    </div>
  </div>
);

export const EngagementTabSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading engagement analytics">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KPI_TILES.map((tile) => (
        <Skeleton key={tile.key} className="h-[120px] w-full" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} className="h-64 w-full" />
      ))}
    </div>
    <Skeleton className="h-[330px] w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export function EngagementTab({
  data,
  days,
  isRefreshing = false,
}: {
  data: AdminAnalyticsEngagementResponse;
  days: AdminAnalyticsRangeDays;
  isRefreshing?: boolean;
}) {
  return (
    <div className={`space-y-4 transition-opacity ${isRefreshing ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPI_TILES.map((tile) => (
          <KpiCard key={tile.key} tile={tile} kpi={data.kpis[tile.key]} days={days} />
        ))}
      </div>

      <Section
        title="Funnels by format"
        subtitle="How many people make it through each step. Each arrow shows the share who went on from the step above."
        days={days}
        accent="border-t-sky-500"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {(["read", "listen", "watch"] as const).map((format) => (
            <Funnel key={format} format={format} steps={data.funnels[format]} days={days} />
          ))}
        </div>
      </Section>

      <Section
        title="Where readers drop off"
        subtitle="Share of people who started a story and were still reading at each point, by story length."
        days={days}
        accent="border-t-violet-500"
      >
        <DepthCurve data={data.depth_curve} />
      </Section>

      <Section
        title="Stories readers leave"
        subtitle="Stories with 5 or more starters, lowest share reaching the end first."
        days={days}
        accent="border-t-rose-500"
      >
        <DropOffTable rows={data.drop_off_stories} />
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Retention"
          subtitle="Signed-in readers who came back, of those old enough to have had the chance."
          days={days}
          accent="border-t-emerald-500"
        >
          <Retention data={data.retention} days={days} />
        </Section>
        <Section
          title="Feedback signals"
          subtitle="Favorites, reviews and reactions in this range."
          days={days}
          accent="border-t-amber-500"
        >
          <Feedback data={data.feedback} />
        </Section>
      </div>

      <Section
        title="Other signals"
        subtitle="Quick Read, Daily Story and journey rates, and discovery counts for this range."
        days={days}
        accent="border-t-slate-400"
      >
        <OtherSignals data={data.other_signals} />
      </Section>
    </div>
  );
}
