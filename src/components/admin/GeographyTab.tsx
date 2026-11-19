import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDown, ArrowUp, Info, Loader2 } from "lucide-react";
import { storyApi } from "@/api/story";
import type {
  AdminAnalyticsRangeDays,
  AdminGeographyCountryRow,
  AdminGeographyVisitorsResponse,
} from "@/api/types";
import { formatCountChange, formatRateChange } from "@/components/admin/charts/changeFormat";
import { CountryHeatmapMap } from "@/components/admin/charts/CountryHeatmapMap";
import { formatPeriod } from "@/components/admin/charts/MarkedTrendChart";
import { CHART_PALETTE } from "@/components/admin/charts/palette";
import {
  EmptyNote,
  Section,
  Skeleton,
  countryLabel,
  formatMinutes,
  formatNumber,
  formatPercent,
} from "@/components/admin/OverviewWidgets";
import { SampleKpiCard } from "@/components/admin/SampleKpiCard";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** A country whose visit events are more than this share suspected bots deserves a second look. */
export const HIGH_BOT_SHARE = 0.3;
/** Below this coverage the country figures describe a minority of traffic. */
const LOW_COVERAGE = 0.6;
const OTHER_COLOR = "#94a3b8";

const FORMAT_LABELS: Record<string, string> = {
  read: "Reading",
  listen: "Listening",
  watch: "Watching",
  quick_read: "Quick reads",
  blog: "Blog",
};

export const flagEmoji = (code: string) =>
  /^[A-Za-z]{2}$/.test(code)
    ? String.fromCodePoint(...code.toUpperCase().split("").map((char) => 0x1f1e6 + char.charCodeAt(0) - 65))
    : "🏳️";

const humanize = (value: string) => value.replace(/_/g, " ");

type MapMetric = "visitors" | "engaged_visitors" | "minutes" | "completions";

const MAP_METRICS: { key: MapMetric; label: string; unit: string; value: (row: AdminGeographyCountryRow) => number }[] = [
  { key: "visitors", label: "Visitors", unit: "visitors", value: (row) => row.visitors },
  { key: "engaged_visitors", label: "Engaged visitors", unit: "engaged visitors", value: (row) => row.engaged_visitors },
  { key: "minutes", label: "Reading minutes", unit: "minutes", value: (row) => Math.round(row.minutes) },
  { key: "completions", label: "Completions", unit: "completions", value: (row) => row.completions },
];

type SortKey =
  | "country"
  | "visitors"
  | "engaged_rate"
  | "readers"
  | "minutes"
  | "completions"
  | "signed_in_users"
  | "bot_share";

const COLUMNS: { key: SortKey; label: string; hint: string; align: "left" | "right" }[] = [
  { key: "country", label: "Country", hint: "Where the browser connected from (Cloudflare country header).", align: "left" },
  { key: "visitors", label: "Visitors", hint: "Unique people. A signed-in reader counts once across devices.", align: "right" },
  { key: "engaged_rate", label: "Engaged", hint: "Visitors who spent 30+ seconds, viewed 2+ pages or started reading, listening or watching.", align: "right" },
  { key: "readers", label: "Readers", hint: "Unique people who started a story.", align: "right" },
  { key: "minutes", label: "Minutes", hint: "Reading, listening and watching time, each session capped so an idle tab cannot inflate it.", align: "right" },
  { key: "completions", label: "Completed", hint: "Stories finished (chapters and read-along are not counted).", align: "right" },
  { key: "signed_in_users", label: "Signed in", hint: "Visitors who were logged in.", align: "right" },
  { key: "bot_share", label: "Bots", hint: "Share of this country's visits that look automated. Taken before bots are excluded from the other columns.", align: "right" },
];

const sortValue = (row: AdminGeographyCountryRow, key: SortKey) => {
  if (key === "country") return row.country;
  return row[key] ?? -1;
};

const BotShare = ({ share, events }: { share: number | null; events: number }) => {
  if (share === null) return <span className="text-muted-foreground">—</span>;
  const high = share > HIGH_BOT_SHARE && events >= 5;
  return (
    <span
      className={high ? "inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800" : ""}
      title={high ? `${formatPercent(share)} of ${formatNumber(events)} visits look automated — treat this country's numbers with caution.` : undefined}
    >
      {high && <AlertTriangle className="h-3 w-3" />}
      {formatPercent(share)}
    </span>
  );
};

const CountriesTable = ({
  rows,
  days,
  onSelect,
}: {
  rows: AdminGeographyCountryRow[];
  days: AdminAnalyticsRangeDays;
  onSelect: (code: string) => void;
}) => {
  const [sortKey, setSortKey] = useState<SortKey>("visitors");
  const [descending, setDescending] = useState(true);
  const sorted = useMemo(() => {
    const direction = descending ? -1 : 1;
    return [...rows].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      const order = typeof left === "string" ? left.localeCompare(String(right)) : (left as number) - (right as number);
      return direction * order || b.visitors - a.visitors;
    });
  }, [rows, sortKey, descending]);

  if (rows.length === 0) return <EmptyNote>No located visitors in this range.</EmptyNote>;

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className={`py-2 pr-3 ${column.align === "left" ? "text-left" : "text-right"}`}
                aria-sort={sortKey === column.key ? (descending ? "descending" : "ascending") : "none"}
              >
                <button
                  type="button"
                  title={column.hint}
                  onClick={() => {
                    if (column.key === sortKey) setDescending((current) => !current);
                    else {
                      setSortKey(column.key);
                      setDescending(column.key !== "country");
                    }
                  }}
                  className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
                >
                  {column.label}
                  {sortKey === column.key && (descending ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                </button>
              </th>
            ))}
            <th className="py-2 pr-3 text-left" title="The story the most visitors here read">Top story</th>
            <th className="py-2 pr-3 text-left">Format</th>
            <th className="py-2 text-left">Source</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const change = days === "all" ? null : formatCountChange(row.visitors, row.previous_visitors);
            return (
              <tr
                key={row.country_code}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/40 focus-within:bg-muted/40"
                onClick={() => onSelect(row.country_code)}
              >
                <td className="py-2 pr-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-2 text-left" onClick={() => onSelect(row.country_code)}>
                    <span aria-hidden="true">{flagEmoji(row.country_code)}</span>
                    {row.country}
                  </button>
                </td>
                <td className="py-2 pr-3 text-right">
                  <span className="font-semibold">{formatNumber(row.visitors)}</span>
                  {change && (
                    <span
                      className={`ml-1.5 text-[11px] ${change.tone === "good" ? "text-emerald-600" : change.tone === "bad" ? "text-rose-600" : "text-muted-foreground"}`}
                      title={change.title}
                    >
                      {change.arrow} {change.text}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right">{row.engaged_rate === null ? "—" : formatPercent(row.engaged_rate)}</td>
                <td className="py-2 pr-3 text-right">{formatNumber(row.readers)}</td>
                <td className="py-2 pr-3 text-right">{formatMinutes(row.minutes)}</td>
                <td className="py-2 pr-3 text-right">{formatNumber(row.completions)}</td>
                <td className="py-2 pr-3 text-right">{formatNumber(row.signed_in_users)}</td>
                <td className="py-2 pr-3 text-right">
                  <BotShare share={row.bot_share} events={row.bot_visit_events} />
                </td>
                <td className="max-w-[180px] truncate py-2 pr-3" title={row.top_story?.title}>
                  {row.top_story?.title ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-2 pr-3">{row.top_format ? FORMAT_LABELS[row.top_format] : <span className="text-muted-foreground">—</span>}</td>
                <td className="py-2 capitalize">{row.top_source ? humanize(row.top_source) : <span className="text-muted-foreground">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const CountriesOverTime = ({ data }: { data: AdminGeographyVisitorsResponse }) => {
  const hasData = data.over_time.some((row) => data.series.some((series) => Number(row[series.key]) > 0));
  if (!hasData) return <EmptyNote>No located visitors in this range.</EmptyNote>;
  const format = formatPeriod(data.time_interval);
  return (
    <div className="h-72 w-full" role="img" aria-label="Unique visitors per period for the top countries, stacked">
      <ResponsiveContainer>
        <BarChart data={data.over_time} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis dataKey="day" tickFormatter={format} tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            labelFormatter={(value) => format(String(value))}
            formatter={(value: number, name: string) => [formatNumber(value), name]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {data.series.map((series, index) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId="countries"
              fill={series.key === "other" ? OTHER_COLOR : CHART_PALETTE[index % CHART_PALETTE.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const CitiesTable = ({ data }: { data: AdminGeographyVisitorsResponse }) => {
  if (data.cities.length === 0) return <EmptyNote>No cities for this range yet.</EmptyNote>;
  const signedInOnly = data.cities_source === "signed_in_only";
  return (
    <div className="space-y-3">
      {signedInOnly && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Signed-in only</strong> — enable Cloudflare visitor location headers for all visitors (Rules →
            Managed Transforms → "Add visitor location headers"). New visitors' cities appear here once it is on.
          </span>
        </p>
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">City</th>
              <th className="py-2 pr-3">Country</th>
              <th className="py-2 text-right">{signedInOnly ? "Signed-in users" : "Visitors"}</th>
            </tr>
          </thead>
          <tbody>
            {data.cities.map((row) => (
              <tr key={`${row.country_code}-${row.city}-${row.region}`} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">
                  {row.city}
                  {row.region && row.region !== row.city && <span className="ml-1 text-xs text-muted-foreground">{row.region}</span>}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{row.country || (row.country_code ? countryLabel(row.country_code) : "—")}</td>
                <td className="py-2 text-right">{formatNumber(row.visitors)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DetailList = ({ title, rows }: { title: string; rows: { key: string; label: string; value: string; hint?: string }[] }) => (
  <div>
    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nothing yet.</p>
    ) : (
      <ul className="divide-y rounded-lg border">
        {rows.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-sm">
            <span className="min-w-0 truncate" title={row.hint ?? row.label}>
              {row.label}
            </span>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">{row.value}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const CountryDrawer = ({
  code,
  name,
  days,
  onClose,
}: {
  code: string | null;
  name: string;
  days: AdminAnalyticsRangeDays;
  onClose: () => void;
}) => {
  const detail = useQuery({
    queryKey: ["admin-analytics", "geography-country", code, days],
    queryFn: () => storyApi.getAdminAnalyticsGeographyCountry(code as string, days),
    enabled: Boolean(code),
  });
  const data = detail.data;
  return (
    <Sheet open={Boolean(code)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto scrollbar-thin sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <span aria-hidden="true">{code ? flagEmoji(code) : ""}</span>
            {name}
          </SheetTitle>
          <SheetDescription>
            {data ? `${formatNumber(data.visitors)} visitors in this range` : "Loading what this country's visitors do…"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {detail.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {detail.isError && <p className="text-sm text-red-600">Failed to load this country.</p>}
          {data && (
            <>
              <DetailList
                title="Top stories"
                rows={data.top_stories.map((story) => ({
                  key: String(story.id),
                  label: story.title,
                  value: `${formatNumber(story.visitors)} visitors · ${formatNumber(story.readers)} readers · ${formatMinutes(story.minutes)}`,
                }))}
              />
              <DetailList
                title="Landing pages"
                rows={data.landing_pages.map((page) => ({
                  key: page.path,
                  label: page.title,
                  hint: page.path,
                  value: `${formatNumber(page.visitors)} visitors`,
                }))}
              />
              <DetailList
                title="Where they come from"
                rows={data.referral_sources.map((source) => ({
                  key: source.referral_source,
                  label: humanize(source.referral_source),
                  value: `${formatNumber(source.count)} visitors`,
                }))}
              />
              <DetailList
                title="Devices"
                rows={data.devices.map((device) => ({
                  key: device.ua_family,
                  label: humanize(device.ua_family),
                  value: `${formatNumber(device.visitors)} visitors`,
                }))}
              />
              <DetailList
                title="Languages read"
                rows={data.languages.map((language) => ({
                  key: language.language,
                  label: language.name,
                  value: `${formatNumber(language.readers)} readers`,
                }))}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const GeographyTabSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading geography analytics">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} className="h-[120px] w-full" />
      ))}
    </div>
    <Skeleton className="h-[380px] w-full" />
    <Skeleton className="h-72 w-full" />
    <Skeleton className="h-72 w-full" />
  </div>
);

export function GeographyTab({
  data,
  days,
  isRefreshing = false,
}: {
  data: AdminGeographyVisitorsResponse;
  days: AdminAnalyticsRangeDays;
  isRefreshing?: boolean;
}) {
  const [metric, setMetric] = useState<MapMetric>("visitors");
  const [selected, setSelected] = useState<string | null>(null);
  const { kpis } = data;
  const activeMetric = MAP_METRICS.find((item) => item.key === metric) ?? MAP_METRICS[0];

  const mapRows = useMemo(
    () =>
      data.by_country.map((row) => ({
        country: row.country,
        country_code: row.country_code,
        value: activeMetric.value(row),
        detail: `${formatNumber(activeMetric.value(row))} ${activeMetric.unit} · ${formatNumber(row.visitors)} visitors`,
      })),
    [data.by_country, activeMetric]
  );

  const top = kpis.top_country.value;
  const topRow = top ? data.by_country.find((row) => row.country_code === top.country_code) : null;
  const coverage = kpis.country_coverage.value;
  const noLocatedVisitors = data.by_country.length === 0;
  const botShare = kpis.bot_share.value;
  const selectedName = data.by_country.find((row) => row.country_code === selected)?.country ?? (selected ? countryLabel(selected) : "");

  return (
    <div className={`space-y-4 transition-opacity ${isRefreshing ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SampleKpiCard
          label="Countries reached"
          hint="Countries with at least one visitor in this range."
          value={kpis.countries_reached.value === null ? null : formatNumber(kpis.countries_reached.value)}
          sample="with a visitor"
          change={formatCountChange(kpis.countries_reached.value ?? 0, kpis.countries_reached.previous_value)}
          days={days}
          emptyHint="No located visitors yet."
        />
        <SampleKpiCard
          label="Top country"
          hint="The country with the most unique visitors, and its share of everyone we could place."
          value={top ? `${flagEmoji(top.country_code)} ${top.country}` : null}
          sample={
            top ? (
              <>
                <span className="font-medium text-foreground">{top.share === null ? "—" : formatPercent(top.share)}</span> of{" "}
                {formatNumber(kpis.top_country.sample_size)} located visitors
              </>
            ) : (
              "no located visitors"
            )
          }
          change={top && topRow ? formatCountChange(top.visitors, topRow.previous_visitors) : null}
          days={days}
          emptyHint={`Not enough data: fewer than ${kpis.top_country.min_sample} located visitors in this range (${kpis.top_country.sample_size} so far).`}
        />
        <SampleKpiCard
          label="Outside the top country"
          hint="Share of located visitors who are not in the top country — how spread out the audience is."
          value={kpis.outside_top_country_share.value === null ? null : formatPercent(kpis.outside_top_country_share.value)}
          sample={
            <>
              of <span className="font-medium text-foreground">{formatNumber(kpis.outside_top_country_share.sample_size)}</span> located visitors
            </>
          }
          change={formatRateChange(kpis.outside_top_country_share.value, kpis.outside_top_country_share.previous_value)}
          days={days}
          emptyHint={`Not enough data: fewer than ${kpis.outside_top_country_share.min_sample} located visitors (${kpis.outside_top_country_share.sample_size} so far).`}
        />
        <SampleKpiCard
          label="Country coverage"
          hint="Share of browser events that carry a country. Events the server raises itself are not counted. Low coverage means the maps describe only part of your traffic."
          value={coverage === null ? null : formatPercent(coverage)}
          sample={
            <>
              of <span className="font-medium text-foreground">{formatNumber(kpis.country_coverage.sample_size)}</span> browser events
            </>
          }
          change={formatRateChange(coverage, kpis.country_coverage.previous_value)}
          days={days}
          emptyHint={`Not enough data: fewer than ${kpis.country_coverage.min_sample} browser events (${kpis.country_coverage.sample_size} so far).`}
        />
      </div>

      {(coverage !== null && coverage < LOW_COVERAGE) || data.data_since || (botShare !== null && botShare > 0.2) ? (
        <ul className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {coverage !== null && coverage < LOW_COVERAGE && (
            <li className="flex items-start gap-2 text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Only {formatPercent(coverage)} of events carry a country, so these figures describe part of your traffic.
              Check that Cloudflare's visitor country header reaches the API.
            </li>
          )}
          {data.data_since && (
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Anonymous country data starts{" "}
              {new Date(data.data_since).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}; earlier
              visits cannot be placed.
            </li>
          )}
          {botShare !== null && botShare > 0.2 && (
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {formatPercent(botShare)} of visit events in this range look automated. They are left out of every count
              here except the "Bots" column.
            </li>
          )}
        </ul>
      ) : null}

      <Section
        title="Visitors by country"
        subtitle="Click a coloured country for what its visitors read and where they come from."
        days={days}
      >
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Map metric">
          {MAP_METRICS.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={metric === item.key}
              onClick={() => setMetric(item.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                metric === item.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <CountryHeatmapMap
          data={mapRows}
          metricLabel={activeMetric.unit}
          onSelect={setSelected}
          emptyLabel="No located visitors in this range yet."
        />
      </Section>

      <Section
        title="Countries"
        subtitle="Click a heading to sort and a row to open the country."
        days={days}
        accent="border-t-sky-500"
      >
        <CountriesTable rows={data.by_country} days={days} onSelect={setSelected} />
        {noLocatedVisitors && data.data_since === null && (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            No event carries a country yet. Country comes from Cloudflare's CF-IPCountry header.
          </p>
        )}
      </Section>

      <Section
        title="Top countries over time"
        subtitle={`Unique visitors per ${data.time_interval === "hour" ? "hour" : data.time_interval === "day" ? "day" : data.time_interval === "week" ? "week" : "month"}, top five countries plus the rest.`}
        days={days}
        accent="border-t-emerald-500"
      >
        <CountriesOverTime data={data} />
      </Section>

      <Section
        title="Cities"
        subtitle={data.cities_source === "events" ? "Unique visitors per city, from Cloudflare's visitor location headers." : "Where signed-in users log in from."}
        days={days}
        accent="border-t-violet-500"
      >
        <CitiesTable data={data} />
      </Section>

      <CountryDrawer code={selected} name={selectedName} days={days} onClose={() => setSelected(null)} />
    </div>
  );
}
