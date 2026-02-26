import FullScreenLoader from "@/components/FullScreenLoader";
import { getAccessToken } from "@/api/client";
import { authApi } from "@/api/auth";
import { storyApi } from "@/api/story";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const formatNumber = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const statAccentClasses = [
  "border-l-primary",
  "border-l-sky-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-violet-500",
  "border-l-rose-500",
];

const AdminHome = () => {
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });

  const isSuperuser = Boolean(me?.is_superuser);

  const { data: overview, isLoading: overviewLoading, isError } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: storyApi.getAdminOverview,
    enabled: isAuthenticated && isSuperuser,
  });

  if (meLoading || overviewLoading) {
    return <FullScreenLoader />;
  }

  if (!isSuperuser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>
        </CardContent>
      </Card>
    );
  }

  if (isError || !overview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Failed to load admin overview stats.</p>
        </CardContent>
      </Card>
    );
  }

  const summaryCards = [
    { label: "Stories", value: overview.summary.stories },
    { label: "Chapters", value: overview.summary.chapters },
    { label: "Audiobooks", value: overview.summary.audios },
    { label: "Users", value: overview.summary.users },
    { label: "Active Readers", value: overview.summary.active_readers },
    { label: "Active Listeners", value: overview.summary.active_listeners },
    { label: "Reviews", value: overview.summary.reviews },
    { label: "Favorites", value: overview.summary.favorites },
    { label: "Story Views", value: overview.summary.total_story_views },
    { label: "Pending Submissions", value: overview.summary.submissions_pending },
    { label: "Approved Submissions", value: overview.summary.submissions_approved },
    { label: "Rejected Submissions", value: overview.summary.submissions_rejected },
  ];

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      <div className="rounded-lg border bg-gradient-to-r from-muted/60 via-muted/20 to-transparent px-4 py-3">
        <h2 className="text-base font-semibold">Overview Dashboard</h2>
        <p className="text-xs text-muted-foreground">
          Quick health and engagement summary for stories and audiobooks.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg">Vital Stats</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item, index) => (
              <div
                key={item.label}
                className={`rounded-md border border-l-4 bg-card px-3 py-2 shadow-sm ${statAccentClasses[index % statAccentClasses.length]}`}
              >
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-xl font-semibold leading-none">{formatNumber(item.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Most Read Books</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {overview.most_read_stories.map((story, idx) => (
              <Link
                key={story.id}
                to={`/story/${story.slug}`}
                className="group flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium group-hover:text-primary">{story.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Readers: {formatNumber(story.readers_count)} | Views: {formatNumber(story.views)}
                    </p>
                  </div>
                </div>
                <span className="ml-2 text-xs text-muted-foreground">{story.rating.toFixed(1)}★</span>
              </Link>
            ))}
            {overview.most_read_stories.length === 0 && (
              <p className="text-sm text-muted-foreground">No reading data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-sky-500">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Most Listened Audiobooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {overview.most_listened_audios.map((audio, idx) => (
              <Link
                key={audio.id}
                to={`/story/${audio.story_slug}`}
                className="group flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-600">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium group-hover:text-primary">{audio.story_title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {audio.title} | Listeners: {formatNumber(audio.listeners_count)}
                    </p>
                  </div>
                </div>
                <span className="ml-2 text-xs text-muted-foreground">{formatPercent(audio.avg_progress)}</span>
              </Link>
            ))}
            {overview.most_listened_audios.length === 0 && (
              <p className="text-sm text-muted-foreground">No audiobook listening data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-rose-500">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Most Favorited Stories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {overview.top_favorited_stories.map((story, idx) => (
              <Link
                key={story.id}
                to={`/story/${story.slug}`}
                className="group flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-xs font-semibold text-rose-600">
                    {idx + 1}
                  </span>
                  <p className="min-w-0 truncate text-sm font-medium group-hover:text-primary">{story.title}</p>
                </div>
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatNumber(story.favorites_count)} favorites
                </span>
              </Link>
            ))}
            {overview.top_favorited_stories.length === 0 && (
              <p className="text-sm text-muted-foreground">No favorites data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-t-amber-500">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base">Top Rated Stories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {overview.top_rated_stories.map((story, idx) => (
              <Link
                key={story.id}
                to={`/story/${story.slug}`}
                className="group flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-600">
                    {idx + 1}
                  </span>
                  <p className="min-w-0 truncate text-sm font-medium group-hover:text-primary">{story.title}</p>
                </div>
                <span className="ml-2 text-xs text-muted-foreground">
                  {story.rating.toFixed(1)}★ | {formatNumber(story.views)} views
                </span>
              </Link>
            ))}
            {overview.top_rated_stories.length === 0 && (
              <p className="text-sm text-muted-foreground">No ratings data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminHome;
