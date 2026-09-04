import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import type { AdminAnalyticsRangeDays, AdminContentPerformanceSort } from "@/api/types";
import FullScreenLoader from "@/components/FullScreenLoader";
import { ContentPerformanceTable } from "@/components/admin/ContentPerformanceTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RANGES: { value: AdminAnalyticsRangeDays; label: string }[] = [
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
];

const SORTS: { value: AdminContentPerformanceSort; label: string }[] = [
  { value: "performance_score", label: "Performance score" },
  { value: "views", label: "Views" },
  { value: "reads", label: "Reads" },
  { value: "unique_readers", label: "Unique readers" },
  { value: "listens", label: "Listens" },
  { value: "unique_listeners", label: "Unique listeners" },
  { value: "reading_minutes", label: "Reading time" },
  { value: "listening_minutes", label: "Listening time" },
  { value: "engagement_minutes", label: "All engagement time" },
  { value: "interactions", label: "Interactions" },
  { value: "completions", label: "Completions" },
];

const allowedDays = new Set([1, 7, 30, 90, 365]);
const allowedSorts = new Set(SORTS.map((item) => item.value));

export default function AdminContentPerformance() {
  const [params, setParams] = useSearchParams();
  const kindParam = params.get("kind");
  const kind = kindParam === "blog" || kindParam === "audiobook" || kindParam === "quick_read" ? kindParam : "story";
  const rawDays = Number(params.get("days"));
  const days = (allowedDays.has(rawDays) ? rawDays : 30) as AdminAnalyticsRangeDays;
  const rawSort = params.get("sort") as AdminContentPerformanceSort | null;
  const sort = rawSort && allowedSorts.has(rawSort) ? rawSort : "performance_score";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const canFetch = isAuthenticated && Boolean(me?.is_superuser);
  const rankingQuery = useQuery({
    queryKey: ["admin-analytics", "content-performance", kind, days, page, sort],
    queryFn: () => storyApi.getAdminContentPerformance(kind, days, page, sort),
    enabled: canFetch,
  });

  const update = (next: Record<string, string>) => {
    const updated = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => updated.set(key, value));
    setParams(updated);
  };

  if (meLoading) return <FullScreenLoader />;
  if (!me?.is_superuser) {
    return <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>;
  }

  const totalPages = rankingQuery.data
    ? Math.max(1, Math.ceil(rankingQuery.data.count / rankingQuery.data.page_size))
    : 1;

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gradient-to-r from-muted/60 via-muted/20 to-transparent px-4 py-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-3">
            <Link to="/admin/analytics"><ArrowLeft />Back to analytics</Link>
          </Button>
          <h2 className="text-base font-semibold">
            {kind === "story" ? "Story performance" : kind === "audiobook" ? "Audiobook performance" : kind === "quick_read" ? "Quick Read performance" : "Blog performance"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Score = views + 2× {kind === "audiobook" ? "listens" : "reads"} + 3× interactions + {kind === "audiobook" ? "listening" : "engaged"} minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={kind} onValueChange={(value) => update({ kind: value, page: "1" })}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="story">Stories</SelectItem>
              <SelectItem value="audiobook">Audiobooks</SelectItem>
              <SelectItem value="quick_read">Quick Reads</SelectItem>
              <SelectItem value="blog">Blogs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(value) => update({ days: value, page: "1" })}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map((range) => <SelectItem key={range.value} value={String(range.value)}>{range.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => update({ sort: value, page: "1" })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORTS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rankingQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {rankingQuery.isError && <p className="text-sm text-red-600">Failed to load content performance.</p>}
      {rankingQuery.data && (
        <Card>
          <CardContent className="pt-6">
            <ContentPerformanceTable rows={rankingQuery.data.results} kind={kind} days={days} />
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                {rankingQuery.data.count.toLocaleString()} titles · Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
