import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Download, Search } from "lucide-react";
import StoryQueueManager from "@/components/admin/StoryQueueManager";
import { TitleAnalyticsDialog } from "@/components/admin/TitleAnalyticsDialog";

type TriStateFilter = "all" | "true" | "false";
type TabKey = "report" | "queue";

const statusBadgeClass = (present: boolean) =>
  present ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200";

const StatusBadge = ({ present, presentLabel, missingLabel }: { present: boolean; presentLabel: string; missingLabel: string }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(present)}`}>
    {present ? presentLabel : missingLabel}
  </span>
);

const AdminStoryReport = () => {
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const [activeTab, setActiveTab] = useState<TabKey>("report");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [publicationFilter, setPublicationFilter] = useState<TriStateFilter>("all");
  const [completionFilter, setCompletionFilter] = useState<TriStateFilter>("all");
  const [summaryFilter, setSummaryFilter] = useState<TriStateFilter>("all");
  const [retrospectiveFilter, setRetrospectiveFilter] = useState<TriStateFilter>("all");
  const [exporting, setExporting] = useState(false);

  const { data: authors } = useQuery({
    queryKey: ["admin-authors"],
    queryFn: storyApi.getAdminAuthors,
    enabled: isAuthenticated && isSuperuser,
  });
  const authorNameById = useMemo(
    () => new Map((authors || []).map((author) => [author.id, author.name])),
    [authors]
  );

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ["admin-story-report", page, search, publicationFilter, completionFilter, summaryFilter, retrospectiveFilter],
    queryFn: () =>
      storyApi.getAdminStories(page, search, {
        is_published: publicationFilter === "all" ? undefined : publicationFilter === "true",
        is_completed: completionFilter === "all" ? undefined : completionFilter === "true",
        has_summary: summaryFilter === "all" ? undefined : summaryFilter === "true",
        has_retrospective: retrospectiveFilter === "all" ? undefined : retrospectiveFilter === "true",
      }),
    enabled: isAuthenticated && isSuperuser && activeTab === "report",
  });

  const runSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const buffer = await storyApi.exportAdminStories(search, {
        is_published: publicationFilter === "all" ? undefined : publicationFilter === "true",
        is_completed: completionFilter === "all" ? undefined : completionFilter === "true",
        has_summary: summaryFilter === "all" ? undefined : summaryFilter === "true",
        has_retrospective: retrospectiveFilter === "all" ? undefined : retrospectiveFilter === "true",
      });
      const blob = new Blob([buffer], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "stories-export.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export stories.");
    } finally {
      setExporting(false);
    }
  };

  const resetToFirstPage = (setter: (value: TriStateFilter) => void) => (value: string) => {
    setPage(1);
    setter(value as TriStateFilter);
  };

  if (meLoading) {
    return <FullScreenLoader />;
  }

  if (!isSuperuser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Story Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>
        </CardContent>
      </Card>
    );
  }

  const pagination = storiesData?.pagination;
  const pageSize = pagination?.size || 20;
  const startSerial = ((pagination?.page || 1) - 1) * pageSize;

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
        <TabsList>
          <TabsTrigger value="report">Story Report</TabsTrigger>
          <TabsTrigger value="queue">Story Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Story Report</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                A read-only overview of every story — content completeness and publishing status at a glance.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="relative max-w-sm flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        runSearch();
                      }
                    }}
                    placeholder="Search by title"
                    className="pl-8"
                  />
                </div>
                <Button size="sm" onClick={runSearch}>
                  Search
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Select value={publicationFilter} onValueChange={resetToFirstPage(setPublicationFilter)}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue placeholder="Publication" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Publication</SelectItem>
                    <SelectItem value="true">Published</SelectItem>
                    <SelectItem value="false">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={completionFilter} onValueChange={resetToFirstPage(setCompletionFilter)}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue placeholder="Completion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Completion</SelectItem>
                    <SelectItem value="true">Completed</SelectItem>
                    <SelectItem value="false">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={summaryFilter} onValueChange={resetToFirstPage(setSummaryFilter)}>
                  <SelectTrigger className="h-9 w-[150px] text-xs">
                    <SelectValue placeholder="Summary" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Summary</SelectItem>
                    <SelectItem value="true">Present</SelectItem>
                    <SelectItem value="false">Missing</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={retrospectiveFilter} onValueChange={resetToFirstPage(setRetrospectiveFilter)}>
                  <SelectTrigger className="h-9 w-[160px] text-xs">
                    <SelectValue placeholder="Retrospective" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Retrospective</SelectItem>
                    <SelectItem value="true">Present</SelectItem>
                    <SelectItem value="false">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Total stories: <span className="font-medium text-foreground">{pagination?.count ?? 0}</span>
                </p>
                <Button size="sm" variant="outline" disabled={exporting} onClick={handleExport}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {exporting ? "Exporting..." : "Export"}
                </Button>
              </div>

              {storiesLoading ? (
                <p className="text-sm text-muted-foreground">Loading stories...</p>
              ) : (storiesData?.results?.length || 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No stories match your filters.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Title</th>
                        <th className="px-3 py-2">Author</th>
                        <th className="px-3 py-2">Summary</th>
                        <th className="px-3 py-2">Retrospective</th>
                        <th className="px-3 py-2">Completion</th>
                        <th className="px-3 py-2">Publication</th>
                        <th className="px-3 py-2">Analytics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(storiesData?.results || []).map((story, index) => (
                        <tr key={story.id} className="border-b last:border-0">
                          <td className="px-3 py-2 text-muted-foreground">{startSerial + index + 1}</td>
                          <td className="max-w-64 truncate px-3 py-2 font-medium">
                            <Link
                              to={`/admin/content?storyId=${story.id}`}
                              className="text-primary hover:underline"
                            >
                              {story.title}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {story.author ? authorNameById.get(story.author) || "-" : "-"}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge present={Boolean(story.summary?.trim())} presentLabel="Present" missingLabel="Missing" />
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge present={Boolean(story.retrospective?.trim())} presentLabel="Present" missingLabel="Missing" />
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge present={story.is_completed} presentLabel="Completed" missingLabel="Ongoing" />
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge present={story.is_published} presentLabel="Published" missingLabel="Draft" />
                          </td>
                          <td className="px-3 py-2">
                            <TitleAnalyticsDialog kind="story" slug={story.slug} title={story.title} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(pagination?.page || 1) <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {pagination?.page || 1} / {pagination?.pages || 1}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(pagination?.page || 1) >= (pagination?.pages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <StoryQueueManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminStoryReport;
