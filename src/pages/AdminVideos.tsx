import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, Plus, Search, Trash2, X, Youtube } from "lucide-react";
import { AdminVideo } from "@/api/types";
import { getLanguageLabel } from "@/lib/languages";

type StoryOption = { id: number; title: string; slug: string };
type StoryFilter = "all" | "linked" | "standalone";

const STORY_FILTER_TO_PARAM: Record<StoryFilter, boolean | undefined> = {
  all: undefined,
  linked: true,
  standalone: false,
};

const formatCreatedAt = (isoString: string) => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
};

// Standalone CRUD for videos — mirrors AdminBlogs.tsx (list → full-page
// form). Videos can also be managed per story from AdminContent.tsx; this
// page is the only place to manage videos that aren't attached to a story.
const AdminVideos = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [storyFilter, setStoryFilter] = useState<StoryFilter>("all");
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["admin-videos-list", page, search, storyFilter],
    queryFn: () => storyApi.listAdminVideos(page, search, STORY_FILTER_TO_PARAM[storyFilter]),
    enabled: isAuthenticated && isSuperuser,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<AdminVideo | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [story, setStory] = useState<StoryOption | null>(null);
  const [order, setOrder] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteVideo, setPendingDeleteVideo] = useState<AdminVideo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  const [storySearchQuery, setStorySearchQuery] = useState("");
  const [debouncedStorySearchQuery, setDebouncedStorySearchQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedStorySearchQuery(storySearchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [storySearchQuery]);
  const { data: storySearchResults } = useQuery({
    queryKey: ["admin-stories-linked-search", debouncedStorySearchQuery],
    queryFn: () => storyApi.getAdminStories(1, debouncedStorySearchQuery),
    enabled: debouncedStorySearchQuery.length >= 2,
  });

  const resetForm = () => {
    setEditingVideo(null);
    setTitle("");
    setSlug("");
    setYoutubeUrl("");
    setDuration("");
    setAspectRatio("16:9");
    setStory(null);
    setOrder("");
    setCoverImageFile(null);
    setRemoveCoverImage(false);
    setStorySearchQuery("");
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (video: AdminVideo) => {
    setEditingVideo(video);
    setTitle(video.title);
    setSlug(video.slug || "");
    setYoutubeUrl(video.youtube_url || "");
    setDuration(video.duration_seconds != null ? String(video.duration_seconds) : "");
    setAspectRatio(video.aspect_ratio || "16:9");
    setStory(video.story_detail);
    setOrder(video.story_detail ? String(video.order) : "");
    setCoverImageFile(null);
    setRemoveCoverImage(false);
    setStorySearchQuery("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const saveVideo = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !youtubeUrl.trim()) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      if (slug.trim()) formData.append("slug", slug.trim());
      formData.append("youtube_url", youtubeUrl.trim());
      formData.append("duration_seconds", duration.trim());
      formData.append("aspect_ratio", aspectRatio);
      // An empty value detaches the video from its story (standalone).
      formData.append("story", story ? String(story.id) : "");
      // Left blank, the backend appends the video to the end of the story's list.
      if (story && order.trim()) formData.append("order", order.trim());
      if (coverImageFile) formData.append("cover_image_file", coverImageFile);
      if (removeCoverImage) formData.append("remove_cover_image_file", "true");

      if (editingVideo) {
        await storyApi.updateAdminVideoForm(editingVideo.id, formData);
        toast.success("Video updated.");
      } else {
        await storyApi.createAdminVideoForm(formData);
        toast.success("Video created.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-videos-list"] });
      // The story editor's per-story video list.
      await queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save video.");
    } finally {
      setSaving(false);
    }
  };

  const deleteVideo = async () => {
    if (!pendingDeleteVideo) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminVideo(pendingDeleteVideo.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-videos-list"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      toast.success("Video deleted.");
      setPendingDeleteVideo(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete video.");
    } finally {
      setDeleting(false);
    }
  };

  if (meLoading) {
    return <FullScreenLoader />;
  }

  if (!isSuperuser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Access denied. Superuser privileges are required.</p>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <div className="h-full space-y-4 overflow-y-auto pr-1">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={closeForm}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{editingVideo ? "Edit Video" : "New Video"}</h2>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={saveVideo}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="video-title">Title *</Label>
                  <Input id="video-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="video-slug">Slug</Label>
                  <Input
                    id="video-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated if empty"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="video-url">YouTube URL *</Label>
                <Input
                  id="video-url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="video-duration">Duration</Label>
                  <Input
                    id="video-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="seconds or mm:ss"
                  />
                </div>
                <div>
                  <Label htmlFor="video-aspect-ratio">Video orientation</Label>
                  <Select value={aspectRatio} onValueChange={(value: "16:9" | "9:16") => setAspectRatio(value)}>
                    <SelectTrigger id="video-aspect-ratio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                      <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Cover Image</Label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {editingVideo?.cover_image_url && !removeCoverImage && !coverImageFile && (
                    <a href={editingVideo.cover_image_url} target="_blank" rel="noreferrer">
                      <img src={editingVideo.cover_image_url} alt="" className="h-12 w-auto rounded object-cover" />
                    </a>
                  )}
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCoverImageFile(file);
                        setRemoveCoverImage(false);
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => coverFileInputRef.current?.click()}>
                    {coverImageFile ? coverImageFile.name : "Choose Image"}
                  </Button>
                  {coverImageFile && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setCoverImageFile(null)}>
                      Clear
                    </Button>
                  )}
                  {editingVideo?.cover_image_url && !removeCoverImage && !coverImageFile && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRemoveCoverImage(true);
                        setCoverImageFile(null);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                  {removeCoverImage && (
                    <span className="text-xs text-muted-foreground">
                      Cover will be removed on save.{" "}
                      <button type="button" className="text-primary hover:underline" onClick={() => setRemoveCoverImage(false)}>
                        Undo
                      </button>
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <Label htmlFor="video-story">Story (optional)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attach this video to a story to show it on that story's page, or leave it standalone.
                </p>
                {story ? (
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm sm:col-span-2">
                      <span className="flex-1 truncate">{story.title}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label={`Detach from ${story.title}`}
                        onClick={() => {
                          setStory(null);
                          setOrder("");
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div>
                      <Input
                        id="video-order"
                        type="number"
                        min={1}
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                        placeholder="Order (auto: last)"
                        aria-label="Order within the story"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="video-story"
                        placeholder="Search stories by title..."
                        className="pl-9"
                        value={storySearchQuery}
                        onChange={(e) => setStorySearchQuery(e.target.value)}
                      />
                    </div>
                    {debouncedStorySearchQuery.length >= 2 && (
                      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
                        {(storySearchResults?.results || []).map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setStory({ id: result.id, title: result.title, slug: result.slug });
                              // Keep the existing position when re-picking the video's own story.
                              setOrder(editingVideo?.story === result.id ? String(editingVideo.order) : "");
                              setStorySearchQuery("");
                            }}
                          >
                            <span className="truncate">{result.title}</span>
                            <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                              {getLanguageLabel(result.language)}
                            </span>
                          </button>
                        ))}
                        {(storySearchResults?.results || []).length === 0 && (
                          <p className="px-2 py-1.5 text-xs text-muted-foreground">No matching stories.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !title.trim() || !youtubeUrl.trim()}>
                  {saving ? "Saving..." : editingVideo ? "Save Changes" : "Create Video"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Videos</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage YouTube videos, whether attached to a story or standalone.
            </p>
          </div>
          <Button size="sm" onClick={openCreateForm}>
            <Plus className="mr-1 h-4 w-4" />
            New Video
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search videos or stories"
                className="pl-8"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={storyFilter}
                onValueChange={(value: StoryFilter) => {
                  setStoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Filter by story">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All videos</SelectItem>
                  <SelectItem value="linked">Attached to a story</SelectItem>
                  <SelectItem value="standalone">Standalone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {videosLoading ? (
            <p className="text-sm text-muted-foreground">Loading videos...</p>
          ) : (videosData?.results?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search.trim() || storyFilter !== "all" ? "No videos match your filters." : "No videos yet — create the first one."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {(videosData?.results || []).map((video) => (
                <div key={video.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {video.cover_image_url ? (
                      <img src={video.cover_image_url} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                    ) : (
                      <img
                        src={`https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`}
                        alt=""
                        className="h-10 w-16 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{video.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {video.story_detail ? `${video.story_detail.title} · #${video.order}` : "Standalone"}
                        {" · "}
                        {video.aspect_ratio === "9:16" ? "Portrait" : "Landscape"}
                        {video.created_at && ` · Added ${formatCreatedAt(video.created_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                      <a
                        href={video.youtube_url || `https://www.youtube.com/watch?v=${video.youtube_id}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${video.title} on YouTube`}
                      >
                        <Youtube className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditForm(video)}
                      aria-label={`Edit ${video.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteVideo(video)}
                      aria-label={`Delete ${video.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {videosData && videosData.pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {videosData.pagination.page} of {videosData.pagination.pages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= videosData.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingDeleteVideo && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteVideo(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete "{pendingDeleteVideo.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteVideo(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deleting} onClick={deleteVideo}>
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminVideos;
