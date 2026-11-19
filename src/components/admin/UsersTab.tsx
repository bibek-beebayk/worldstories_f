import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  Headphones,
  Heart,
  MessageSquare,
  Newspaper,
  Search,
  Trophy,
  Zap,
} from "lucide-react";
import { storyApi } from "@/api/story";
import type {
  AdminAnalyticsRangeDays,
  AdminAnalyticsUsersResponse,
  AdminUserRow,
  AdminUserStatus,
  AdminUserTimelineItem,
  AdminUsersKpi,
  AdminUsersKpiKey,
} from "@/api/types";
import { formatCountChange, formatRateChange, type ChangeDisplay } from "@/components/admin/charts/changeFormat";
import { formatPeriod } from "@/components/admin/charts/MarkedTrendChart";
import { CHART_PALETTE } from "@/components/admin/charts/palette";
import {
  EmptyNote,
  Funnel,
  Section,
  Skeleton,
  Sparkline,
  formatNumber,
  formatPercent,
} from "@/components/admin/OverviewWidgets";
import { SampleKpiCard } from "@/components/admin/SampleKpiCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Under this many users a percentage change is noise, so the absolute change is shown.
const MIN_FOR_PERCENT = 10;

const STATUS_META: Record<AdminUserStatus, { label: string; chip: string; hint: string }> = {
  new: { label: "New", chip: "bg-sky-100 text-sky-700 border-sky-200", hint: "Joined in the last 14 days" },
  active: { label: "Active", chip: "bg-emerald-100 text-emerald-700 border-emerald-200", hint: "Active in the last 14 days" },
  at_risk: { label: "At risk", chip: "bg-amber-100 text-amber-800 border-amber-200", hint: "Last active 14–30 days ago" },
  dormant: { label: "Dormant", chip: "bg-slate-100 text-slate-600 border-slate-200", hint: "Not active for 30+ days, or never" },
  unverified: { label: "Unverified", chip: "bg-rose-100 text-rose-700 border-rose-200", hint: "Hasn't verified their account yet" },
};
const STATUS_ORDER: AdminUserStatus[] = ["new", "active", "at_risk", "dormant", "unverified"];

const StatusChip = ({ status }: { status: AdminUserStatus }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_META[status].chip}`}
    title={STATUS_META[status].hint}
  >
    {STATUS_META[status].label}
  </span>
);

export const timeAgo = (iso: string | null) => {
  if (!iso) return "never";
  const minutes = (Date.now() - new Date(iso).getTime()) / 60000;
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"} ago`;
  const days = hours / 24;
  if (days < 14) return `${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"} ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const sourceLabel = (source: string | null) => (source ? source.replace(/_/g, " ") : "unknown");
const displayName = (user: AdminUserRow) => user.display_name || user.username;
const engagedMinutes = (user: AdminUserRow) => user.reading_minutes + user.listening_minutes + user.watching_minutes;

const KPI_TILES: {
  key: AdminUsersKpiKey;
  label: string;
  hint: string;
  sampleLabel: string;
  format: (value: number) => string;
  change: (kpi: AdminUsersKpi) => ChangeDisplay | null;
}[] = [
  {
    key: "registered_users",
    label: "Registered users",
    hint: "Reader accounts. Staff are not counted.",
    sampleLabel: "accounts",
    format: formatNumber,
    change: (kpi) => formatCountChange(kpi.value ?? 0, kpi.previous_value, { minForPercent: MIN_FOR_PERCENT }),
  },
  {
    key: "new_users",
    label: "New users",
    hint: "Accounts created in this range.",
    sampleLabel: "accounts",
    format: formatNumber,
    change: (kpi) => formatCountChange(kpi.value ?? 0, kpi.previous_value, { minForPercent: MIN_FOR_PERCENT }),
  },
  {
    key: "active_users",
    label: "Active users",
    hint: "Registered users with any reading, listening, watching or progress activity in this range.",
    sampleLabel: "registered users",
    format: formatNumber,
    change: (kpi) => formatCountChange(kpi.value ?? 0, kpi.previous_value, { minForPercent: MIN_FOR_PERCENT }),
  },
  {
    key: "activation_rate",
    label: "Activation",
    hint: "New users who started a story within 7 days of joining, out of new users whose first week is already over.",
    sampleLabel: "new users past their first week",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
  {
    key: "visitor_to_signup_rate",
    label: "Visitor → signup",
    hint: "New users as a share of unique anonymous visitors in this range.",
    sampleLabel: "anonymous visitors",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
  {
    key: "signed_in_minutes_share",
    label: "Signed-in time share",
    hint: "Share of all reading, listening and watching time (capped per session) that came from signed-in users.",
    sampleLabel: "people with time spent",
    format: formatPercent,
    change: (kpi) => formatRateChange(kpi.value, kpi.previous_value),
  },
];

const KpiRow = ({ data, days }: { data: AdminAnalyticsUsersResponse; days: AdminAnalyticsRangeDays }) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {KPI_TILES.map((tile) => {
      const kpi = data.kpis[tile.key];
      const counts = tile.key === "registered_users" || tile.key === "new_users" || tile.key === "active_users";
      return (
        <SampleKpiCard
          key={tile.key}
          label={tile.label}
          hint={tile.hint}
          value={kpi.value === null ? null : tile.format(kpi.value)}
          sample={
            counts ? (
              tile.key === "active_users" ? (
                <>
                  of <span className="font-medium text-foreground">{formatNumber(kpi.sample_size)}</span> {tile.sampleLabel}
                </>
              ) : (
                tile.sampleLabel
              )
            ) : (
              <>
                {kpi.value === null ? "only " : "of "}
                <span className="font-medium text-foreground">{formatNumber(kpi.sample_size)}</span> {tile.sampleLabel}
              </>
            )
          }
          change={tile.change(kpi)}
          days={days}
          emptyHint={`Not enough data: fewer than ${kpi.min_sample} ${tile.sampleLabel} (${kpi.sample_size} so far).`}
          footer={kpi.sparkline ? <Sparkline data={kpi.sparkline} color={CHART_PALETTE[0]} /> : undefined}
        />
      );
    })}
  </div>
);

// --- table -------------------------------------------------------------------------------------

type Column = {
  key: string;
  label: string;
  hint?: string;
  align?: "left" | "right";
  sortValue: (row: AdminUserRow) => number | string;
  render: (row: AdminUserRow) => React.ReactNode;
};

const num = (value: number) => <span className={value === 0 ? "text-muted-foreground" : ""}>{formatNumber(value)}</span>;

const COLUMNS: Column[] = [
  { key: "status", label: "Status", sortValue: (r) => STATUS_ORDER.indexOf(r.status), render: (r) => <StatusChip status={r.status} /> },
  { key: "joined", label: "Joined", sortValue: (r) => r.date_joined, render: (r) => <span title={shortDate(r.date_joined)}>{timeAgo(r.date_joined)}</span> },
  {
    key: "last_active",
    label: "Last active",
    hint: "Latest reading, listening, watching or progress activity.",
    sortValue: (r) => r.last_active ?? "",
    render: (r) => (r.last_active ? <span title={new Date(r.last_active).toLocaleString()}>{timeAgo(r.last_active)}</span> : <span className="text-muted-foreground">never</span>),
  },
  {
    key: "source",
    label: "Source",
    hint: "How they first arrived: their first referral before signing up, else their first visit after.",
    sortValue: (r) => r.signup_source ?? "",
    render: (r) => (r.signup_source ? <span className="capitalize">{sourceLabel(r.signup_source)}</span> : <span className="text-muted-foreground">unknown</span>),
  },
  { key: "active_days", label: "Active days", hint: "Distinct days active in this range.", align: "right", sortValue: (r) => r.active_days, render: (r) => num(r.active_days) },
  { key: "started", label: "Started", hint: "Stories started in this range.", align: "right", sortValue: (r) => r.stories_started, render: (r) => num(r.stories_started) },
  { key: "completed", label: "Completed", hint: "Stories finished in this range.", align: "right", sortValue: (r) => r.stories_completed, render: (r) => num(r.stories_completed) },
  {
    key: "minutes",
    label: "Engaged min",
    hint: "Reading + listening + watching minutes in this range, each session capped. Hover a value for the split.",
    align: "right",
    sortValue: engagedMinutes,
    render: (r) => (
      <UiTooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${engagedMinutes(r) === 0 ? "text-muted-foreground" : ""}`}>{formatNumber(Math.round(engagedMinutes(r)))}</span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          Reading {formatNumber(Math.round(r.reading_minutes))} · Listening {formatNumber(Math.round(r.listening_minutes))} · Watching{" "}
          {formatNumber(Math.round(r.watching_minutes))} min
        </TooltipContent>
      </UiTooltip>
    ),
  },
  { key: "favorites", label: "Favs", hint: "Favorites, all time.", align: "right", sortValue: (r) => r.favorites, render: (r) => num(r.favorites) },
  { key: "reviews", label: "Reviews", hint: "Reviews written, all time.", align: "right", sortValue: (r) => r.reviews, render: (r) => num(r.reviews) },
  { key: "reactions", label: "Reactions", hint: "Story reactions, all time.", align: "right", sortValue: (r) => r.reactions, render: (r) => num(r.reactions) },
  {
    key: "streak",
    label: "Streak",
    hint: "Current streak, and the longest, in days.",
    align: "right",
    sortValue: (r) => r.current_streak * 1000 + r.longest_streak,
    render: (r) => (
      <span className={r.longest_streak === 0 ? "text-muted-foreground" : ""}>
        {r.current_streak} <span className="text-xs text-muted-foreground">/ {r.longest_streak}</span>
      </span>
    ),
  },
  { key: "achievements", label: "Badges", hint: "Achievements earned.", align: "right", sortValue: (r) => r.achievements_count, render: (r) => num(r.achievements_count) },
  { key: "passport", label: "Countries", hint: "Countries explored in the Story Passport.", align: "right", sortValue: (r) => r.passport_countries, render: (r) => num(r.passport_countries) },
  { key: "journeys", label: "Journeys", hint: "Story journeys completed.", align: "right", sortValue: (r) => r.journeys_completed, render: (r) => num(r.journeys_completed) },
  { key: "country", label: "Country", hint: "Where they last signed in from.", sortValue: (r) => r.country ?? "", render: (r) => r.country ?? <span className="text-muted-foreground">—</span> },
];

const UsersTable = ({
  data,
  statusFilter,
  onOpen,
}: {
  data: AdminAnalyticsUsersResponse;
  statusFilter: AdminUserStatus | null;
  onOpen: (user: AdminUserRow) => void;
}) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("last_active");
  const [descending, setDescending] = useState(true);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = data.users.filter(
      (user) =>
        (!statusFilter || user.status === statusFilter) &&
        (!needle ||
          [user.username, user.display_name ?? "", user.email, user.signup_source ?? "", user.country ?? ""].some((value) =>
            value.toLowerCase().includes(needle)
          ))
    );
    const column = COLUMNS.find((c) => c.key === sortKey);
    const direction = descending ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const left = column ? column.sortValue(a) : displayName(a);
      const right = column ? column.sortValue(b) : displayName(b);
      if (left === right) return displayName(a).localeCompare(displayName(b));
      return direction * (left > right ? 1 : -1);
    });
  }, [data.users, search, statusFilter, sortKey, descending]);

  const toggleSort = (key: string) => {
    if (key === sortKey) setDescending((current) => !current);
    else {
      setSortKey(key);
      setDescending(key !== "source" && key !== "country");
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, source or country"
          className="pl-8"
          aria-label="Search users"
        />
      </div>
      {rows.length === 0 ? (
        <EmptyNote>{data.users.length === 0 ? "No registered users yet" : "No users match"}</EmptyNote>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card py-2 pr-3 text-left" aria-sort={sortKey === "user" ? (descending ? "descending" : "ascending") : "none"}>
                  <button type="button" onClick={() => toggleSort("user")} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground">
                    User
                    {sortKey === "user" && (descending ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                  </button>
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={`whitespace-nowrap py-2 pr-3 ${column.align === "right" ? "text-right" : "text-left"}`}
                    aria-sort={sortKey === column.key ? (descending ? "descending" : "ascending") : "none"}
                  >
                    <button type="button" title={column.hint} onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground">
                      {column.label}
                      {sortKey === column.key && (descending ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/40"
                  onClick={() => onOpen(user)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(user);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ${displayName(user)}`}
                >
                  <td className="sticky left-0 z-10 max-w-[220px] bg-card py-2.5 pr-3">
                    <p className="truncate font-medium">{displayName(user)}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className={`whitespace-nowrap py-2.5 pr-3 ${column.align === "right" ? "text-right" : ""}`}>
                      {column.render(user)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.users_total > data.users.length && (
        <p className="text-xs text-muted-foreground">
          Showing the first {formatNumber(data.users.length)} of {formatNumber(data.users_total)} users.
        </p>
      )}
    </div>
  );
};

// --- drawer --------------------------------------------------------------------------------------

const TIMELINE_ICON: Record<AdminUserTimelineItem["kind"], { icon: typeof BookOpen; label: string }> = {
  story_session: { icon: BookOpen, label: "Read" },
  quick_read_session: { icon: Zap, label: "Quick Read" },
  blog_session: { icon: Newspaper, label: "Read a blog post" },
  audio_session: { icon: Headphones, label: "Listened to" },
  video_session: { icon: Clapperboard, label: "Watched" },
  completion: { icon: CheckCircle2, label: "Finished" },
  favorite: { icon: Heart, label: "Favorited" },
  review: { icon: MessageSquare, label: "Reviewed" },
  achievement: { icon: Trophy, label: "Earned" },
};

const TimelineRow = ({ item }: { item: AdminUserTimelineItem }) => {
  const meta = TIMELINE_ICON[item.kind];
  const Icon = meta.icon;
  const details: string[] = [];
  if (item.minutes !== undefined) details.push(`${formatNumber(Math.round(item.minutes))} min`);
  if (item.sessions !== undefined && item.sessions > 1) details.push(`${item.sessions} sessions`);
  if (item.progress !== undefined && item.progress !== null) details.push(`${formatPercent(item.progress)} through`);
  if (item.rating !== undefined) details.push(`${item.rating}★`);
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="text-muted-foreground">{meta.label}</span> <span className="font-medium">{item.title}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {timeAgo(item.at)}
          {details.length > 0 && ` · ${details.join(" · ")}`}
        </p>
      </div>
    </li>
  );
};

const Stat = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <div className="rounded-lg border p-2.5" title={hint}>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-lg font-bold leading-none">{value}</p>
  </div>
);

const UserDrawer = ({ user, onClose }: { user: AdminUserRow | null; onClose: () => void }) => {
  const timeline = useQuery({
    queryKey: ["admin-user-timeline", user?.id],
    queryFn: () => storyApi.getAdminUserTimeline(user!.id),
    enabled: Boolean(user),
  });
  return (
    <Sheet open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto scrollbar-thin sm:max-w-md">
        {user && (
          <>
            <SheetHeader className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
                  <AvatarFallback>{displayName(user).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{displayName(user)}</SheetTitle>
                  <SheetDescription className="truncate">{user.email}</SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip status={user.status} />
                {user.country && <span className="text-xs text-muted-foreground">Last signed in from {user.country}</span>}
              </div>
            </SheetHeader>

            <div className="mt-5 space-y-5">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd>{shortDate(user.date_joined)} · {timeAgo(user.date_joined)}</dd>
                  <dt className="text-muted-foreground">Last active</dt>
                  <dd>{timeAgo(user.last_active)}</dd>
                  <dt className="text-muted-foreground">Last login</dt>
                  <dd>{timeAgo(user.last_login)}</dd>
                  <dt className="text-muted-foreground">Logins</dt>
                  <dd>{formatNumber(user.login_count)}</dd>
                  <dt className="text-muted-foreground">Verified</dt>
                  <dd>{user.otp_verified ? "Yes" : "No"}</dd>
                </dl>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">How they signed up</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="capitalize">{user.signup_source ? sourceLabel(user.signup_source) : "Unknown"}</dd>
                  <dt className="text-muted-foreground">Landing page</dt>
                  <dd className="min-w-0 truncate" title={user.signup_landing?.path}>{user.signup_landing ? user.signup_landing.title : "—"}</dd>
                  <dt className="text-muted-foreground">Reading at signup</dt>
                  <dd className="min-w-0 truncate">{user.signup_story ? user.signup_story.title : "—"}</dd>
                </dl>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {user.signup_method === "before_signup"
                    ? "From their visits on this browser before they signed up."
                    : user.signup_method === "after_signup"
                      ? "No visit before signing up was recorded, so this is their first visit after."
                      : "No visit on any of their browsers was recorded."}
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Engagement</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Streak" value={<>{user.current_streak}<span className="text-xs font-normal text-muted-foreground"> / {user.longest_streak}</span></>} hint="Current streak / longest, in days" />
                  <Stat label="Badges" value={user.achievements_count} hint="Achievements earned" />
                  <Stat label="Countries" value={user.passport_countries} hint="Countries explored in the Story Passport" />
                  <Stat label="Journeys" value={user.journeys_completed} hint="Story journeys completed" />
                  <Stat label="Favorites" value={user.favorites} />
                  <Stat label="Reviews" value={user.reviews} />
                </div>
              </section>

              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h3>
                {timeline.isLoading ? (
                  <div className="space-y-2 py-2" aria-busy="true">
                    {[0, 1, 2, 3].map((key) => (
                      <Skeleton key={key} className="h-10 w-full" />
                    ))}
                  </div>
                ) : timeline.isError ? (
                  <p className="py-3 text-sm text-red-600">Couldn't load this user's activity.</p>
                ) : timeline.data && timeline.data.items.length > 0 ? (
                  <>
                    <ul className="divide-y">
                      {timeline.data.items.map((item, index) => (
                        <TimelineRow key={`${item.kind}-${item.at}-${index}`} item={item} />
                      ))}
                    </ul>
                    {timeline.data.total > timeline.data.items.length && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Showing the {timeline.data.items.length} most recent of {formatNumber(timeline.data.total)}.
                      </p>
                    )}
                  </>
                ) : (
                  <EmptyNote>No activity yet</EmptyNote>
                )}
              </section>

              <Link
                to={`/admin/users?search=${encodeURIComponent(user.email)}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Open in Users admin <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

// --- charts --------------------------------------------------------------------------------------

const sourceColor = (source: string, sources: string[]) =>
  source === "unknown" ? "#94a3b8" : CHART_PALETTE[sources.filter((s) => s !== "unknown").indexOf(source) % CHART_PALETTE.length];

const SignupsChart = ({ data }: { data: AdminAnalyticsUsersResponse["signups_over_time"] }) => {
  const { series, sources, interval } = data;
  if (series.every((point) => point.total === 0)) return <EmptyNote>No signups in this range</EmptyNote>;
  const rows = series.map((point) => ({ day: String(point.day), total: point.total, ...point.by_source }));
  const formatX = formatPeriod(interval);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {sources.map((source) => (
          <span key={source} className="inline-flex items-center gap-1.5 capitalize">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: sourceColor(source, sources) }} aria-hidden="true" />
            {sourceLabel(source)}
          </span>
        ))}
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" tickFormatter={formatX} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} minTickGap={20} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={32} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={({ active, label }) => {
                if (!active || typeof label !== "string") return null;
                const point = series.find((p) => String(p.day) === label);
                if (!point) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">
                      {interval === "week" ? formatX(label) : formatX(label)} · {formatNumber(point.total)} signup{point.total === 1 ? "" : "s"}
                    </p>
                    {Object.entries(point.by_source).map(([source, count]) => (
                      <p key={source} className="capitalize">
                        {sourceLabel(source)}: <span className="font-semibold">{formatNumber(count)}</span>
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {sources.map((source) => (
              <Bar key={source} dataKey={source} name={sourceLabel(source)} stackId="signups" fill={sourceColor(source, sources)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CohortGrid = ({ cohorts }: { cohorts: AdminAnalyticsUsersResponse["cohorts"] }) => {
  if (!cohorts.available) {
    return (
      <p className="py-3 text-sm text-muted-foreground">
        Cohort retention appears once you have {cohorts.min_users}+ users ({formatNumber(cohorts.total_users)} so far).
      </p>
    );
  }
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 text-left">Signed up (week of)</th>
            <th className="py-2 pr-3 text-right">Users</th>
            {Array.from({ length: cohorts.weeks }, (_, index) => (
              <th key={index} className="py-2 pr-3 text-center" title={`Active on days ${7 * (index + 1)}–${7 * (index + 1) + 6} after signing up`}>
                Week {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.rows.map((row) => (
            <tr key={row.cohort} className="border-b last:border-0">
              <td className="py-1.5 pr-3 font-medium">{shortDate(row.cohort)}</td>
              <td className="py-1.5 pr-3 text-right">{formatNumber(row.size)}</td>
              {row.weeks.map((week) => (
                <td key={week.week} className="px-1 py-1.5 text-center">
                  {week.rate === null ? (
                    <span className="text-muted-foreground" title="This week isn't over for anyone in the cohort yet">—</span>
                  ) : (
                    <span
                      className="inline-block min-w-[3rem] rounded px-1.5 py-1 text-xs font-semibold"
                      style={{ background: `hsl(var(--primary) / ${0.08 + week.rate * 0.6})` }}
                      title={`${week.active} of ${week.eligible} users active`}
                    >
                      {formatPercent(week.rate)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">Share of each signup cohort active in each week after joining. Hover a cell for the counts.</p>
    </div>
  );
};

export const UsersTabSkeleton = () => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading users analytics">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {KPI_TILES.map((tile) => (
        <Skeleton key={tile.key} className="h-[120px] w-full" />
      ))}
    </div>
    <Skeleton className="h-52 w-full" />
    <Skeleton className="h-96 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export function UsersTab({
  data,
  days,
  isRefreshing = false,
}: {
  data: AdminAnalyticsUsersResponse;
  days: AdminAnalyticsRangeDays;
  isRefreshing?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | null>(null);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const funnelSteps = data.signup_funnel.map((step) => ({
    key: step.key,
    label: step.label,
    count: step.count,
    rate: step.rate,
    rate_label: step.rate === null ? null : "of the step above",
  }));
  const { attribution } = data;

  return (
    <div className={`space-y-4 transition-opacity ${isRefreshing ? "opacity-60" : ""}`}>
      <KpiRow data={data} days={days} />

      <Section
        title="Signup funnel"
        subtitle="Visitors to active users. Each step counts only people who made it through the one above; opening the signup form isn't recorded, so there's no step for it."
        days={days}
        accent="border-t-sky-500"
      >
        <Funnel steps={funnelSteps} />
      </Section>

      <Section
        title="Users"
        subtitle="Everyone with an account. Click a segment to filter, a heading to sort, a row for details."
        days={days}
        accent="border-t-violet-500"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter(null)}
            aria-pressed={statusFilter === null}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === null ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            All <span className="ml-1 opacity-80">{formatNumber(data.users_total)}</span>
          </button>
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter((current) => (current === status ? null : status))}
              aria-pressed={statusFilter === status}
              title={STATUS_META[status].hint}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === status ? "border-primary bg-primary text-primary-foreground" : `${STATUS_META[status].chip} hover:opacity-80`
              }`}
            >
              {STATUS_META[status].label} <span className="ml-1 opacity-80">{formatNumber(data.segments[status])}</span>
            </button>
          ))}
        </div>
        <UsersTable data={data} statusFilter={statusFilter} onOpen={setSelected} />
        {attribution.total > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Signup source known for {formatNumber(attribution.attributed)} of {formatNumber(attribution.total)} users (
            {formatNumber(attribution.before_signup)} from visits before signing up, {formatNumber(attribution.after_signup)} from their first visit after).
          </p>
        )}
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Signups over time"
          subtitle={`${data.signups_over_time.interval === "week" ? "Per week" : "Per day"}, by where each user first came from.`}
          days={days}
          accent="border-t-emerald-500"
        >
          <SignupsChart data={data.signups_over_time} />
        </Section>
        <Section title="Cohort retention" subtitle="Whether each week's signups came back." days={days} accent="border-t-amber-500">
          <CohortGrid cohorts={data.cohorts} />
        </Section>
      </div>

      <UserDrawer user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

