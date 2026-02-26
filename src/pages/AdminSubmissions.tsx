import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "requires_edit", label: "Requires Edit" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

const submissionStatusBadgeClass = (status: string) => {
  if (status === "approved") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-red-100 text-red-700 border-red-200";
  if (status === "requires_edit") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const AdminSubmissions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "requires_edit" | "approved" | "rejected">("all");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [nextStatus, setNextStatus] = useState<"pending" | "requires_edit" | "approved" | "rejected">("pending");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["admin-submissions", page, search, statusFilter],
    queryFn: () => storyApi.getAdminSubmissions(page, search, statusFilter),
    enabled: isAuthenticated && Boolean(me?.is_superuser),
  });

  const { data: selectedSubmission, isLoading: selectedLoading } = useQuery({
    queryKey: ["admin-submission", selectedSubmissionId],
    queryFn: () => storyApi.getAdminSubmission(selectedSubmissionId!),
    enabled: isAuthenticated && Boolean(me?.is_superuser) && selectedSubmissionId !== null,
  });

  useEffect(() => {
    if (!selectedSubmission) return;
    setNextStatus(selectedSubmission.status);
    setReviewerNotes(selectedSubmission.reviewer_notes || "");
  }, [selectedSubmission]);

  const canSave = useMemo(
    () => Boolean(selectedSubmission) && (
      nextStatus !== selectedSubmission?.status ||
      reviewerNotes !== (selectedSubmission?.reviewer_notes || "")
    ),
    [nextStatus, reviewerNotes, selectedSubmission]
  );

  const saveReview = async () => {
    if (!selectedSubmissionId) return;
    if (nextStatus === "requires_edit" && !reviewerNotes.trim()) {
      toast.error("Reviewer notes are required when requesting edits.");
      return;
    }
    try {
      setSaving(true);
      await storyApi.updateAdminSubmission(selectedSubmissionId, {
        status: nextStatus,
        reviewer_notes: reviewerNotes,
      });
      toast.success("Submission updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-submission", selectedSubmissionId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update submission.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              <Link to="/admin/login" className="text-primary hover:underline">Admin login</Link> required to access submissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (meLoading) return <FullScreenLoader />;

  if (!me?.is_superuser) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6 text-center">
            <p className="text-red-500">Access denied. Superuser privileges required.</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/")}>Back to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="h-full w-full overflow-hidden">
      <div className="grid h-full min-h-0 gap-6 overflow-hidden lg:grid-cols-[360px_1fr]">
        <Card className="h-full min-h-0">
          <CardContent className="flex h-full flex-col gap-3 p-3">
            <div className="flex gap-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setPage(1);
                    setSearch(searchInput.trim());
                  }
                }}
                placeholder="Search title or user email"
              />
              <Button size="sm" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>
                Search
              </Button>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value: "all" | "pending" | "requires_edit" | "approved" | "rejected") => {
                setPage(1);
                setStatusFilter(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Total submissions: <span className="font-medium text-foreground">{listData?.pagination?.count ?? 0}</span>
            </p>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border p-2">
              {listLoading && <p className="text-sm text-muted-foreground">Loading submissions...</p>}
              {(listData?.results || []).map((item) => (
                <button
                  key={item.id}
                  className={`w-full rounded-md border px-3 py-2 text-left hover:bg-muted ${selectedSubmissionId === item.id ? "border-primary" : ""}`}
                  onClick={() => setSelectedSubmissionId(item.id)}
                >
                  <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{item.user_email}</p>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${submissionStatusBadgeClass(
                      item.status
                    )}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </button>
              ))}
              {(listData?.results?.length || 0) === 0 && !listLoading && (
                <p className="text-sm text-muted-foreground">No submissions found.</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                disabled={(listData?.pagination?.page || 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {listData?.pagination?.page || 1} / {listData?.pagination?.pages || 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={(listData?.pagination?.page || 1) >= (listData?.pagination?.pages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full min-h-0">
          <CardHeader>
            <CardTitle className="text-base">Submission Details</CardTitle>
          </CardHeader>
          <CardContent className="h-full min-h-0 overflow-y-auto pb-4">
            {!selectedSubmissionId ? (
              <p className="text-sm text-muted-foreground">Select a submission from the list.</p>
            ) : selectedLoading ? (
              <p className="text-sm text-muted-foreground">Loading submission details...</p>
            ) : !selectedSubmission ? (
              <p className="text-sm text-muted-foreground">Submission not found.</p>
            ) : (
              <div className="space-y-4 pb-24">
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Title:</span> {selectedSubmission.title}</p>
                  <p><span className="text-muted-foreground">User:</span> {selectedSubmission.user_email}</p>
                  <p><span className="text-muted-foreground">Type:</span> {selectedSubmission.story_type}</p>
                  <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{selectedSubmission.status}</span></p>
                  <p><span className="text-muted-foreground">Created:</span> {new Date(selectedSubmission.created_at).toLocaleString()}</p>
                  <p><span className="text-muted-foreground">Reviewed:</span> {selectedSubmission.reviewed_at ? new Date(selectedSubmission.reviewed_at).toLocaleString() : "-"}</p>
                </div>

                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Genres</p>
                  {selectedSubmission.genres.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSubmission.genres.map((genre) => (
                        <span key={genre.id} className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">-</p>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-sm text-muted-foreground">About</p>
                  <p className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{selectedSubmission.about || "-"}</p>
                </div>

                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Content</p>
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm">
                    {selectedSubmission.content ? (
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: selectedSubmission.content }}
                      />
                    ) : (
                      "-"
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">Attached Files</p>
                  <div className="space-y-1 text-sm">
                    <p>
                      Cover:{" "}
                      {selectedSubmission.cover_image_url ? (
                        <a href={selectedSubmission.cover_image_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a>
                      ) : "-"}
                    </p>
                    <p>
                      PDF:{" "}
                      {selectedSubmission.pdf_file_url ? (
                        <a href={selectedSubmission.pdf_file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a>
                      ) : "-"}
                    </p>
                    <p>
                      EPUB:{" "}
                      {selectedSubmission.epub_file_url ? (
                        <a href={selectedSubmission.epub_file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a>
                      ) : "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-sm font-medium">Moderation</p>
                  <div>
                    <Label>Status</Label>
                    <Select value={nextStatus} onValueChange={(v: "pending" | "requires_edit" | "approved" | "rejected") => setNextStatus(v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="requires_edit">Requires Edit</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="reviewer-notes">Reviewer Notes</Label>
                    <Textarea
                      id="reviewer-notes"
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      className="mt-1 min-h-24"
                    />
                  </div>
                  {selectedSubmission.status !== "approved" ? (
                    <div className="sticky bottom-0 -mx-3 flex flex-wrap gap-2 border-t bg-background/95 px-3 pb-1 pt-3 backdrop-blur">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNextStatus("requires_edit")}
                      >
                        Request Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNextStatus("approved")}
                      >
                        Mark Approved
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNextStatus("rejected")}
                      >
                        Mark Rejected
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveReview}
                        disabled={saving || !canSave}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This submission is approved. Moderation actions are hidden.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AdminSubmissions;
