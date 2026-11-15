import { feedbackApi, FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from "@/api/feedback";
import type { AdminFeedback, FeedbackStatus } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Star } from "lucide-react";
import { useEffect, useState } from "react";

const categoryLabel = (value: string) =>
  FEEDBACK_CATEGORIES.find((option) => option.value === value)?.label ?? value;

const feedbackStatusBadgeClass = (status: FeedbackStatus) => {
  if (status === "resolved") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "reviewed") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
};

const Rating = ({ value }: { value: number | null }) =>
  value ? (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
      ))}
    </span>
  ) : (
    <span>-</span>
  );

const AdminFeedbackPage = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FeedbackStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<AdminFeedback | null>(null);
  const [nextStatus, setNextStatus] = useState<FeedbackStatus>("new");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["admin-feedback", page, search, statusFilter, categoryFilter],
    queryFn: () => feedbackApi.getAdminFeedback(page, search, statusFilter, categoryFilter),
  });

  useEffect(() => {
    if (!selected) return;
    setNextStatus(selected.status);
    setAdminNotes(selected.admin_notes || "");
  }, [selected]);

  const canSave = Boolean(selected) && (nextStatus !== selected?.status || adminNotes !== (selected?.admin_notes || ""));

  const refreshList = () => queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });

  const save = async (patch: { status: FeedbackStatus; admin_notes?: string }) => {
    if (!selected) return;
    try {
      setSaving(true);
      const updated = await feedbackApi.updateAdminFeedback(selected.id, patch);
      setSelected(updated);
      toast.success("Feedback updated.");
      await refreshList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update feedback.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm("Delete this feedback permanently?")) return;
    try {
      setSaving(true);
      await feedbackApi.deleteAdminFeedback(selected.id);
      setSelected(null);
      toast.success("Feedback deleted.");
      await refreshList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete feedback.");
    } finally {
      setSaving(false);
    }
  };

  const counts = listData?.status_counts;

  return (
    <main className="h-full w-full overflow-hidden">
      {/* Same list + detail split as the Submissions inbox: stacked with a
          bounded list height below lg, side by side above it. */}
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:grid lg:gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-[40vh] shrink-0 lg:h-full lg:min-h-0">
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
                placeholder="Search message or email"
              />
              <Button size="sm" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>
                Search
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | FeedbackStatus) => {
                  setPage(1);
                  setStatusFilter(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {FEEDBACK_STATUSES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}{counts ? ` (${counts[opt.value]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setPage(1);
                  setCategoryFilter(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {FEEDBACK_CATEGORIES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{listData?.pagination?.count ?? 0}</span>
              {counts && (
                <> · <span className="font-medium text-foreground">{counts.new}</span> new</>
              )}
            </p>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border p-2">
              {listLoading && <p className="text-sm text-muted-foreground">Loading feedback...</p>}
              {(listData?.results || []).map((item) => (
                <button
                  key={item.id}
                  className={`w-full rounded-md border px-3 py-2 text-left hover:bg-muted ${selected?.id === item.id ? "border-primary" : ""}`}
                  onClick={() => setSelected(item)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{categoryLabel(item.category)}</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {item.images.length > 0 && (
                        <span className="inline-flex items-center gap-0.5" title={`${item.images.length} screenshot(s)`}>
                          <ImageIcon className="h-3 w-3" />
                          {item.images.length}
                        </span>
                      )}
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm">{item.message}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${feedbackStatusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {item.user_email || item.email || "Anonymous"}
                    </span>
                  </div>
                </button>
              ))}
              {(listData?.results?.length || 0) === 0 && !listLoading && (
                <p className="text-sm text-muted-foreground">No feedback found.</p>
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

        <Card className="min-h-0 flex-1 lg:h-full">
          <CardHeader>
            <CardTitle className="text-base">Feedback Details</CardTitle>
          </CardHeader>
          <CardContent className="h-full min-h-0 overflow-y-auto pb-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select feedback from the list.</p>
            ) : (
              <div className="space-y-4 pb-24">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">From:</span>{" "}
                    {selected.user_name ? `${selected.user_name} (${selected.user_email})` : selected.email || "Anonymous visitor"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Reply to:</span>{" "}
                    {selected.email ? (
                      <a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a>
                    ) : "-"}
                  </p>
                  <p><span className="text-muted-foreground">Category:</span> {categoryLabel(selected.category)}</p>
                  <p className="flex items-center gap-1"><span className="text-muted-foreground">Rating:</span> <Rating value={selected.rating} /></p>
                  <p><span className="text-muted-foreground">Sent:</span> {new Date(selected.created_at).toLocaleString()}</p>
                  <p>
                    <span className="text-muted-foreground">Page:</span>{" "}
                    {selected.page_url ? (
                      <a href={selected.page_url} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                        {selected.page_url}
                      </a>
                    ) : "-"}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Message</p>
                  <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{selected.message}</p>
                </div>

                {selected.images.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Screenshots ({selected.images.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.images.map((image, index) => (
                        <a
                          key={image.id}
                          href={image.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-24 w-24 overflow-hidden rounded-md border hover:ring-2 hover:ring-primary"
                          title="Open full size"
                        >
                          <img src={image.url} alt={`Screenshot ${index + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selected.user_agent && (
                  <p className="break-all text-xs text-muted-foreground">
                    <span className="font-medium">Device:</span> {selected.user_agent}
                  </p>
                )}

                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-sm font-medium">Triage</p>
                  <div>
                    <Label>Status</Label>
                    <Select value={nextStatus} onValueChange={(v: FeedbackStatus) => setNextStatus(v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FEEDBACK_STATUSES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="feedback-admin-notes">Internal Notes</Label>
                    <Textarea
                      id="feedback-admin-notes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Only visible to admins"
                      className="mt-1 min-h-24"
                    />
                  </div>
                  <div className="sticky bottom-0 -mx-3 flex flex-wrap gap-2 border-t bg-background/95 px-3 pb-1 pt-3 backdrop-blur">
                    {selected.status !== "resolved" && (
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => save({ status: "resolved", admin_notes: adminNotes })}>
                        Mark Resolved
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={saving} onClick={remove}>
                      Delete
                    </Button>
                    <Button size="sm" disabled={saving || !canSave} onClick={() => save({ status: nextStatus, admin_notes: adminNotes })}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AdminFeedbackPage;
