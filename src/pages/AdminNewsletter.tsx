import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Loader2, RefreshCw, Search, Send } from "lucide-react";
import {
  newsletterAdminApi,
  type AdminDigestIssue,
  type AdminNewsletterSubscriber,
  type AdminSubscriberStatus,
} from "@/api/newsletterAdmin";
import type { NewsletterSource } from "@/api/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const SHORT_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const SOURCE_OPTIONS: { value: NewsletterSource; label: string }[] = [
  { value: "blog", label: "Blog" },
  { value: "completion", label: "Completion" },
  { value: "footer", label: "Footer" },
  { value: "profile", label: "Profile" },
  { value: "prompt", label: "Prompt" },
  { value: "other", label: "Other" },
];

const STATUS_BADGE: Record<AdminSubscriberStatus, { label: string; className: string; dot: string }> = {
  confirmed: {
    label: "Confirmed",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  unsubscribed: {
    label: "Unsubscribed",
    className: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/70",
  },
};

function getIssueDisplayStatus(issue: AdminDigestIssue): { label: string; className: string; dot: string } {
  if (issue.status === "failed" && issue.sent_count > 0) {
    return {
      label: "Partial",
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }
  if (issue.status === "failed") {
    return {
      label: "Failed",
      className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-300",
      dot: "bg-red-500",
    };
  }
  if (issue.status === "finished" && issue.sent_count === 0 && issue.failed_count === 0) {
    return {
      label: "Skipped",
      className: "border-border bg-muted text-muted-foreground",
      dot: "bg-muted-foreground/70",
    };
  }
  if (issue.status === "finished") {
    return {
      label: "Sent",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }
  return {
    label: "Sending",
    className:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300",
    dot: "bg-blue-500",
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatShortWeek(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const InlineError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
    <span>{message}</span>
    <Button type="button" size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      Retry
    </Button>
  </div>
);

const StatTileSkeleton = () => (
  <div className="rounded-lg border bg-card p-4">
    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
    <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
    <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
  </div>
);

const AdminNewsletter = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "issues" ? "issues" : "subscribers";

  const setActiveTab = (next: string) => {
    setSearchParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === "issues") out.set("tab", "issues");
        else out.delete("tab");
        return out;
      },
      { replace: true },
    );
  };

  // Subscribers filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminSubscriberStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<NewsletterSource | "all">("all");
  const [weekdayFilter, setWeekdayFilter] = useState<number | "all">("all");
  const [subPage, setSubPage] = useState(1);
  const subPageSize = 25;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedSearch((prev) => {
        if (prev !== next) setSubPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Issues state
  const [issuePage, setIssuePage] = useState(1);
  const issuePageSize = 20;
  const [selectedIssue, setSelectedIssue] = useState<AdminDigestIssue | null>(null);

  // Dialogs & transient UI states
  const [pendingUnsubscribe, setPendingUnsubscribe] = useState<AdminNewsletterSubscriber | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Queries
  const statsQuery = useQuery({
    queryKey: ["admin-newsletter-stats"],
    queryFn: newsletterAdminApi.getStats,
  });

  const subscribersQuery = useQuery({
    queryKey: ["admin-newsletter-subscribers", debouncedSearch, statusFilter, sourceFilter, weekdayFilter, subPage],
    queryFn: () =>
      newsletterAdminApi.getSubscribers({
        q: debouncedSearch,
        status: statusFilter,
        source: sourceFilter,
        weekday: weekdayFilter,
        page: subPage,
        page_size: subPageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const issuesQuery = useQuery({
    queryKey: ["admin-newsletter-issues", issuePage],
    queryFn: () => newsletterAdminApi.getIssues(issuePage, issuePageSize),
    enabled: activeTab === "issues",
    placeholderData: keepPreviousData,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["admin-newsletter-deliveries", selectedIssue?.id],
    queryFn: () => newsletterAdminApi.getIssueDeliveries(selectedIssue!.id, "failed"),
    enabled: activeTab === "issues" && selectedIssue !== null,
  });

  const previewQuery = useQuery({
    queryKey: ["admin-newsletter-preview"],
    queryFn: newsletterAdminApi.getPreview,
    enabled: previewOpen,
  });

  // Mutations
  const testSendMutation = useMutation({
    mutationFn: () => newsletterAdminApi.sendTestDigest(),
    onSuccess: (data) => {
      toast.success(data.detail);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to send test digest.");
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) => newsletterAdminApi.resendConfirmation(id),
    onSuccess: (data) => {
      toast.success(data.detail);
      void queryClient.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to resend confirmation.");
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: (id: number) => newsletterAdminApi.unsubscribeSubscriber(id),
    onSuccess: (updated) => {
      toast.success(`${updated.email} has been unsubscribed.`);
      setPendingUnsubscribe(null);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-newsletter-stats"] }),
      ]);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to unsubscribe.");
    },
  });

  const retryFailedMutation = useMutation({
    mutationFn: (issueId: number) => newsletterAdminApi.retryFailedDeliveries(issueId),
    onSuccess: (res) => {
      toast.success(
        `Retried ${res.attempted}: ${res.sent} sent, ${res.failed} failed (${res.remaining_failed} remaining).`,
      );
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-newsletter-issues"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-newsletter-deliveries", selectedIssue?.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-newsletter-stats"] }),
      ]);
      if (selectedIssue) {
        setSelectedIssue({
          ...selectedIssue,
          sent_count: selectedIssue.sent_count + res.sent,
          failed_count: res.remaining_failed,
          status: res.remaining_failed === 0 ? "finished" : "failed",
        });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to retry deliveries.");
    },
  });

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const filename = await newsletterAdminApi.exportSubscribersCsv({
        q: debouncedSearch,
        status: statusFilter,
        source: sourceFilter,
        weekday: weekdayFilter,
      });
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export CSV.");
    } finally {
      setExportingCsv(false);
    }
  };

  const stats = statsQuery.data;
  const maxWeeklyGrowth = useMemo(() => Math.max(1, ...(stats?.weekly_growth.map((w) => w.confirmed) ?? [1])), [stats]);

  const subData = subscribersQuery.data;
  const subCount = subData?.count ?? 0;
  const subTotalPages = Math.max(1, Math.ceil(subCount / subPageSize));
  const subRangeStart = subCount === 0 ? 0 : (subPage - 1) * subPageSize + 1;
  const subRangeEnd = Math.min(subCount, subPage * subPageSize);
  const hasSubFilters = Boolean(
    debouncedSearch || statusFilter !== "all" || sourceFilter !== "all" || weekdayFilter !== "all",
  );

  const issueData = issuesQuery.data;
  const issueCount = issueData?.count ?? 0;
  const issueTotalPages = Math.max(1, Math.ceil(issueCount / issuePageSize));
  const issueRangeStart = issueCount === 0 ? 0 : (issuePage - 1) * issuePageSize + 1;
  const issueRangeEnd = Math.min(issueCount, issuePage * issuePageSize);

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-thin pr-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Newsletter</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Weekly digest subscribers and sends</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "subscribers" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 gap-1.5"
              disabled={exportingCsv}
              onClick={() => void handleExportCsv()}
            >
              {exportingCsv ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              Export CSV
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 gap-1.5"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Preview next digest
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            className="min-h-10 gap-1.5"
            disabled={testSendMutation.isPending}
            onClick={() => testSendMutation.mutate()}
          >
            {testSendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Send test digest
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          {statsQuery.isError && (
            <InlineError
              message={
                statsQuery.error instanceof Error ? statsQuery.error.message : "Failed to load newsletter stats."
              }
              onRetry={() => void statsQuery.refetch()}
            />
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statsQuery.isLoading ? (
              <>
                <StatTileSkeleton />
                <StatTileSkeleton />
                <StatTileSkeleton />
                <StatTileSkeleton />
              </>
            ) : (
              <>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirmed</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{(stats?.confirmed ?? 0).toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                    +{(stats?.new_this_week ?? 0).toLocaleString()} this week
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{(stats?.pending ?? 0).toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">awaiting confirmation</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unsubscribed</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{(stats?.unsubscribed ?? 0).toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {((stats?.unsubscribe_rate ?? 0) * 100).toFixed(1)}% of all signups
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total signups</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{(stats?.total ?? 0).toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">all statuses</p>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Confirmed subscribers gained per week</CardTitle>
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <div className="h-36 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="flex h-36 items-end gap-1.5 pt-4" role="list" aria-label="Weekly confirmed signups">
                    {(stats?.weekly_growth ?? []).map((week) => {
                      const heightPct = Math.round((week.confirmed / maxWeeklyGrowth) * 100);
                      return (
                        <div
                          key={week.week_start}
                          role="listitem"
                          className="flex min-w-0 flex-1 flex-col items-center gap-1"
                        >
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {week.confirmed > 0 ? week.confirmed : ""}
                          </span>
                          <div className="flex h-24 w-full items-end">
                            <div
                              role="img"
                              aria-label={`Week of ${week.week_start}: ${week.confirmed} confirmed subscribers`}
                              title={`Week of ${week.week_start}: ${week.confirmed}`}
                              style={{ height: `${week.confirmed > 0 ? Math.max(8, heightPct) : 2}%` }}
                              className={`w-full rounded-t transition-all ${
                                week.confirmed > 0 ? "bg-primary" : "bg-muted"
                              }`}
                            />
                          </div>
                          <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                            {formatShortWeek(week.week_start)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Send day load (limit {(stats?.daily_send_limit ?? 80).toLocaleString()}/day)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <div className="space-y-2">
                    {SHORT_WEEKDAYS.map((day) => (
                      <div key={day} className="h-4 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2" role="list" aria-label="Confirmed subscribers by send day">
                    {(stats?.weekday_load ?? []).map((entry) => {
                      const limit = stats?.daily_send_limit ?? 80;
                      const pct = limit > 0 ? Math.min(100, Math.round((entry.count / limit) * 100)) : 0;
                      const nearCap = pct >= 85;
                      return (
                        <div key={entry.weekday} role="listitem" className="flex items-center gap-2.5 text-xs">
                          <span className="w-8 shrink-0 font-medium text-muted-foreground">{entry.label}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              role="img"
                              aria-label={`${entry.label}: ${entry.count} of ${limit} daily limit`}
                              style={{ width: `${pct}%` }}
                              className={`h-full rounded-full transition-all ${
                                nearCap ? "bg-amber-500" : "bg-primary"
                              }`}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right font-medium tabular-nums">
                            {entry.count.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative min-w-0 flex-1 sm:max-w-xs">
                  <Label htmlFor="newsletter-subscriber-search" className="sr-only">
                    Search subscribers by email
                  </Label>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="newsletter-subscriber-search"
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search email..."
                    className="h-10 pl-9"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setSubPage(1);
                    setStatusFilter(value as AdminSubscriberStatus | "all");
                  }}
                >
                  <SelectTrigger className="h-10 w-full sm:w-[150px]" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sourceFilter}
                  onValueChange={(value) => {
                    setSubPage(1);
                    setSourceFilter(value as NewsletterSource | "all");
                  }}
                >
                  <SelectTrigger className="h-10 w-full sm:w-[145px]" aria-label="Filter by source">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {SOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={weekdayFilter === "all" ? "all" : String(weekdayFilter)}
                  onValueChange={(value) => {
                    setSubPage(1);
                    setWeekdayFilter(value === "all" ? "all" : Number(value));
                  }}
                >
                  <SelectTrigger className="h-10 w-full sm:w-[145px]" aria-label="Filter by send day">
                    <SelectValue placeholder="Send day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All days</SelectItem>
                    {WEEKDAYS.map((day, idx) => (
                      <SelectItem key={day} value={String(idx)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {subscribersQuery.isError && (
                <InlineError
                  message={
                    subscribersQuery.error instanceof Error
                      ? subscribersQuery.error.message
                      : "Failed to load subscribers."
                  }
                  onRetry={() => void subscribersQuery.refetch()}
                />
              )}

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5">Email</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Source</th>
                      <th className="px-3 py-2.5">Send day</th>
                      <th className="px-3 py-2.5">Signed up</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {subscribersQuery.isLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={6} className="px-3 py-3">
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </td>
                        </tr>
                      ))
                    ) : (subData?.results.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          {hasSubFilters ? "No subscribers match these filters" : "No subscribers yet"}
                        </td>
                      </tr>
                    ) : (
                      (subData?.results ?? []).map((sub) => {
                        const badge = STATUS_BADGE[sub.status];
                        const isResending = resendMutation.isPending && resendMutation.variables === sub.id;
                        return (
                          <tr key={sub.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2.5 font-medium">{sub.email}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                              >
                                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 capitalize text-muted-foreground">{sub.source}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {sub.send_weekday !== null && sub.send_weekday >= 0 && sub.send_weekday <= 6
                                ? SHORT_WEEKDAYS[sub.send_weekday]
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{formatDate(sub.created_at)}</td>
                            <td className="px-3 py-2.5 text-right">
                              {sub.status === "pending" ? (
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  disabled={isResending}
                                  onClick={() => resendMutation.mutate(sub.id)}
                                >
                                  {isResending ? "Sending..." : "Resend link"}
                                </Button>
                              ) : sub.status === "confirmed" ? (
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs text-destructive hover:text-destructive"
                                  onClick={() => setPendingUnsubscribe(sub)}
                                >
                                  Unsubscribe
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                <span>
                  Showing {subRangeStart.toLocaleString()}–{subRangeEnd.toLocaleString()} of {subCount.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={subPage <= 1}
                    onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={subPage >= subTotalPages}
                    onClick={() => setSubPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          {issuesQuery.isError && (
            <InlineError
              message={issuesQuery.error instanceof Error ? issuesQuery.error.message : "Failed to load digest issues."}
              onRetry={() => void issuesQuery.refetch()}
            />
          )}

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5">Issue date</th>
                      <th className="px-3 py-2.5">Subject</th>
                      <th className="px-3 py-2.5">Featured story</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Sent</th>
                      <th className="px-3 py-2.5 text-right">Failed</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {issuesQuery.isLoading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={7} className="px-3 py-3">
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </td>
                        </tr>
                      ))
                    ) : (issueData?.results.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          No digest issues have been sent yet.
                        </td>
                      </tr>
                    ) : (
                      (issueData?.results ?? []).map((issue) => {
                        const badge = getIssueDisplayStatus(issue);
                        const isSelected = selectedIssue?.id === issue.id;
                        return (
                          <tr key={issue.id} className={`hover:bg-muted/30 ${isSelected ? "bg-primary/5" : ""}`}>
                            <td className="whitespace-nowrap px-3 py-2.5 font-medium">{issue.issue_date}</td>
                            <td className="max-w-[260px] truncate px-3 py-2.5">{issue.subject}</td>
                            <td className="max-w-[200px] truncate px-3 py-2.5 text-muted-foreground">
                              {issue.featured_story_title || "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                              >
                                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{issue.sent_count.toLocaleString()}</td>
                            <td
                              className={`px-3 py-2.5 text-right tabular-nums ${
                                issue.failed_count > 0 ? "font-semibold text-red-600 dark:text-red-400" : ""
                              }`}
                            >
                              {issue.failed_count.toLocaleString()}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => setSelectedIssue(issue)}
                              >
                                {issue.failed_count > 0 ? "View failures" : "Details"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {issueCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
                  <span>
                    Showing {issueRangeStart.toLocaleString()}–{issueRangeEnd.toLocaleString()} of{" "}
                    {issueCount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={issuePage <= 1}
                      onClick={() => setIssuePage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={issuePage >= issueTotalPages}
                      onClick={() => setIssuePage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedIssue && (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold">Failed deliveries · {selectedIssue.issue_date}</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedIssue.failed_count > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={retryFailedMutation.isPending}
                      onClick={() => retryFailedMutation.mutate(selectedIssue.id)}
                      className="gap-1.5"
                    >
                      {retryFailedMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      Retry all failed
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIssue(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {deliveriesQuery.isError && (
                  <InlineError
                    message={
                      deliveriesQuery.error instanceof Error
                        ? deliveriesQuery.error.message
                        : "Failed to load deliveries."
                    }
                    onRetry={() => void deliveriesQuery.refetch()}
                  />
                )}
                {deliveriesQuery.isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                ) : (deliveriesQuery.data?.results.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No failed deliveries for this issue.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[500px] text-left text-sm">
                      <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(deliveriesQuery.data?.results ?? []).map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2 font-medium">{row.email}</td>
                            <td className="px-3 py-2 text-xs text-destructive">{row.error || "Unknown error"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={pendingUnsubscribe !== null}
        onOpenChange={(open) => {
          if (!open && !unsubscribeMutation.isPending) setPendingUnsubscribe(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubscribe reader</AlertDialogTitle>
            <AlertDialogDescription>
              Unsubscribe {pendingUnsubscribe?.email} from the weekly digest? They will stop receiving digest emails
              unless they resubscribe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unsubscribeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={unsubscribeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (pendingUnsubscribe) unsubscribeMutation.mutate(pendingUnsubscribe.id);
              }}
            >
              {unsubscribeMutation.isPending ? "Unsubscribing..." : "Unsubscribe"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Next digest preview</DialogTitle>
          </DialogHeader>
          {previewQuery.isLoading ? (
            <div className="h-[50vh] animate-pulse rounded-md bg-muted" />
          ) : previewQuery.isError ? (
            <InlineError
              message={previewQuery.error instanceof Error ? previewQuery.error.message : "Failed to load preview."}
              onRetry={() => void previewQuery.refetch()}
            />
          ) : previewQuery.data?.html ? (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium text-muted-foreground">Subject:</span> {previewQuery.data.subject}
              </p>
              <iframe
                title="Digest preview"
                sandbox=""
                srcDoc={previewQuery.data.html}
                className="h-[65vh] w-full rounded-md border bg-white"
              />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {previewQuery.data?.reason || "No new stories this week"}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNewsletter;
