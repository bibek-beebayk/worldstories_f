import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import { AdminBlog, AdminStory } from "@/api/types";
import { handleRichTextPaste } from "@/lib/richTextPaste";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { getLanguageLabel } from "@/lib/languages";
import { AiGenerationResultBanner } from "@/components/admin/AiGenerationControls";

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time (no
// timezone suffix) — the backend gives back a UTC ISO string, so this
// converts between the two in both directions. Mirrors the identical helper
// in AdminContent.tsx (kept local here rather than shared — both are small,
// page-scoped form utilities like this file's other local helpers).
const toDatetimeLocalValue = (isoString: string | null | undefined) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromDatetimeLocalValue = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const AdminBlogs = () => {
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
  const { data: blogsData, isLoading: blogsLoading } = useQuery({
    queryKey: ["admin-blogs", page, search],
    queryFn: () => storyApi.getAdminBlogs(page, search),
    enabled: isAuthenticated && isSuperuser,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<AdminBlog | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [publishAt, setPublishAt] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const [linkedStoryId, setLinkedStoryId] = useState<number | null>(null);
  const [linkedStoryTitle, setLinkedStoryTitle] = useState<string | null>(null);
  const [copyCoverFromStoryId, setCopyCoverFromStoryId] = useState<number | null>(null);
  const [copyCoverFromStoryUrl, setCopyCoverFromStoryUrl] = useState<string | null>(null);
  const [linkStoryOffer, setLinkStoryOffer] = useState<AdminStory | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteBlog, setPendingDeleteBlog] = useState<AdminBlog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [excerptBannerDismissed, setExcerptBannerDismissed] = useState(false);

  const contentEditorRef = useRef<HTMLDivElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const lastAppliedExcerptStatusRef = useRef<string | null>(null);

  const { data: liveEditingBlog } = useQuery({
    queryKey: ["admin-blog", editingBlog?.id],
    queryFn: () => storyApi.getAdminBlog(editingBlog!.id),
    enabled: isAuthenticated && isSuperuser && showForm && editingBlog !== null,
    refetchInterval: (query) => {
      const s = query.state.data;
      return s?.excerpt_status === "pending" || s?.excerpt_status === "processing" ? 2000 : false;
    },
  });

  useEffect(() => {
    if (!liveEditingBlog) return;
    if (liveEditingBlog.excerpt_status === "completed" && lastAppliedExcerptStatusRef.current !== "completed") {
      setExcerpt(liveEditingBlog.excerpt || "");
    }
    lastAppliedExcerptStatusRef.current = liveEditingBlog.excerpt_status;
  }, [liveEditingBlog]);

  const excerptGenerationBusy =
    liveEditingBlog?.excerpt_status === "pending" || liveEditingBlog?.excerpt_status === "processing";

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

  useEffect(() => {
    if (!showForm || !contentEditorRef.current) return;
    contentEditorRef.current.innerHTML = content || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  const syncContentEditor = () => {
    setContent(contentEditorRef.current?.innerHTML || "");
  };

  const runContentCommand = (command: string, value?: string) => {
    contentEditorRef.current?.focus();
    document.execCommand(command, false, value);
    syncContentEditor();
  };

  const addContentLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    runContentCommand("createLink", url);
  };

  const resetForm = () => {
    setEditingBlog(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setAuthorName("");
    setContent("");
    setIsPublished(true);
    setPublishAt("");
    setCoverImageFile(null);
    setRemoveCoverImage(false);
    setLinkedStoryId(null);
    setLinkedStoryTitle(null);
    setCopyCoverFromStoryId(null);
    setCopyCoverFromStoryUrl(null);
    setLinkStoryOffer(null);
    setStorySearchQuery("");
    setExcerptBannerDismissed(false);
    lastAppliedExcerptStatusRef.current = null;
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (blog: AdminBlog) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setSlug(blog.slug);
    setExcerpt(blog.excerpt || "");
    setAuthorName(blog.author_name || "");
    setContent(blog.content);
    setIsPublished(blog.is_published);
    setPublishAt(toDatetimeLocalValue(blog.publish_at));
    setCoverImageFile(null);
    setRemoveCoverImage(false);
    setLinkedStoryId(blog.linked_story_detail?.id ?? null);
    setLinkedStoryTitle(blog.linked_story_detail?.title ?? null);
    setCopyCoverFromStoryId(null);
    setCopyCoverFromStoryUrl(null);
    setLinkStoryOffer(null);
    setStorySearchQuery("");
    setExcerptBannerDismissed(false);
    lastAppliedExcerptStatusRef.current = blog.excerpt_status;
    setShowForm(true);
  };

  const selectLinkedStory = (story: AdminStory) => {
    setLinkedStoryId(story.id);
    setLinkedStoryTitle(story.title);
    setStorySearchQuery("");
    if (story.retrospective || story.cover_image_url) {
      setLinkStoryOffer(story);
    }
  };

  const useRetrospectiveAsContent = () => {
    if (!linkStoryOffer?.retrospective) return;
    if (content.trim() && !window.confirm("This will replace the current blog content. Continue?")) return;
    setContent(linkStoryOffer.retrospective);
    if (contentEditorRef.current) contentEditorRef.current.innerHTML = linkStoryOffer.retrospective;
    toast.success("Retrospective copied into the blog content — feel free to edit it.");
  };

  const useStoryCoverImage = () => {
    if (!linkStoryOffer?.cover_image_url) return;
    setCopyCoverFromStoryId(linkStoryOffer.id);
    setCopyCoverFromStoryUrl(linkStoryOffer.cover_image_url);
    setCoverImageFile(null);
    setRemoveCoverImage(false);
  };

  const saveBlog = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      if (slug.trim()) formData.append("slug", slug.trim());
      formData.append("excerpt", excerpt);
      formData.append("author_name", authorName);
      formData.append("content", content);
      formData.append("is_published", String(isPublished));
      formData.append("publish_at", publishAt ? fromDatetimeLocalValue(publishAt) : "");
      if (linkedStoryId !== null) {
        formData.append("linked_story", String(linkedStoryId));
      } else if (editingBlog) {
        formData.append("linked_story", "");
      }
      if (coverImageFile) formData.append("cover_image_file", coverImageFile);
      if (removeCoverImage) formData.append("remove_cover_image_file", "true");
      if (copyCoverFromStoryId !== null) formData.append("copy_cover_from_story", String(copyCoverFromStoryId));

      if (editingBlog) {
        await storyApi.updateAdminBlog(editingBlog.id, formData);
        toast.success("Blog post updated.");
      } else {
        await storyApi.createAdminBlog(formData);
        toast.success("Blog post created.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-blogs"] });
      setShowForm(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save blog post.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateExcerpt = async () => {
    if (!editingBlog) return;
    setExcerptBannerDismissed(false);
    try {
      await storyApi.generateBlogExcerpt(editingBlog.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-blog", editingBlog.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start excerpt generation.");
    }
  };

  const deleteBlog = async () => {
    if (!pendingDeleteBlog) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminBlog(pendingDeleteBlog.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-blogs"] });
      toast.success("Blog post deleted.");
      setPendingDeleteBlog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete blog post.");
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
          <CardTitle className="text-lg">Blog</CardTitle>
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
          <Button type="button" variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{editingBlog ? "Edit Blog Post" : "New Blog Post"}</h2>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={saveBlog}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="blog-title">Title *</Label>
                  <Input id="blog-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="blog-slug">Slug</Label>
                  <Input
                    id="blog-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated if empty"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="blog-author">Author Name</Label>
                  <Input id="blog-author" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="blog-publish-at">Publish At</Label>
                  <Input
                    id="blog-publish-at"
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="blog-excerpt">Excerpt</Label>
                  {editingBlog && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={excerptGenerationBusy}
                      onClick={handleGenerateExcerpt}
                    >
                      {excerptGenerationBusy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                      {excerptGenerationBusy ? "Generating..." : "Generate from Content"}
                    </Button>
                  )}
                </div>
                {editingBlog && (
                  <div className="mt-2">
                    <AiGenerationResultBanner
                      label="Excerpt"
                      status={liveEditingBlog?.excerpt_status ?? null}
                      source={liveEditingBlog?.excerpt_source ?? null}
                      confident={liveEditingBlog?.excerpt_confident ?? null}
                      confidenceNote={liveEditingBlog?.excerpt_confidence_note ?? null}
                      error={liveEditingBlog?.excerpt_error ?? null}
                      dismissed={excerptBannerDismissed}
                      onDismiss={() => setExcerptBannerDismissed(true)}
                      onRetryWithContent={handleGenerateExcerpt}
                      onTryAgain={handleGenerateExcerpt}
                    />
                  </div>
                )}
                <Textarea
                  id="blog-excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="mt-2 min-h-20"
                  maxLength={300}
                  placeholder="Short summary shown on the blog list page and used as the SEO description."
                />
              </div>

              <div>
                <Label htmlFor="blog-content">Content *</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2 rounded-md border p-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => runContentCommand("bold")}>
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => runContentCommand("italic")}>
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => runContentCommand("underline")}>
                      <Underline className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => runContentCommand("formatBlock", "h2")}
                    >
                      <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => runContentCommand("insertUnorderedList")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => runContentCommand("insertOrderedList")}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addContentLink}>
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div
                    id="blog-content"
                    ref={contentEditorRef}
                    contentEditable
                    dir="ltr"
                    style={{ direction: "ltr", unicodeBidi: "isolate", writingMode: "horizontal-tb" }}
                    suppressContentEditableWarning
                    onInput={syncContentEditor}
                    onPaste={(e) => handleRichTextPaste(e, syncContentEditor)}
                    className="prose prose-sm dark:prose-invert min-h-60 max-w-none rounded-md border px-3 py-2 text-left [unicode-bidi:isolate] [&_*]:text-left focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <Label>Cover Image</Label>
                {copyCoverFromStoryUrl && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <img src={copyCoverFromStoryUrl} alt="" className="h-10 w-8 rounded object-cover" />
                    <span className="flex-1 text-muted-foreground">Will use the linked story's cover image</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setCopyCoverFromStoryId(null);
                        setCopyCoverFromStoryUrl(null);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {editingBlog?.cover_image_url && !removeCoverImage && !copyCoverFromStoryUrl && (
                    <a
                      href={editingBlog.cover_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Current cover image
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
                        setCopyCoverFromStoryId(null);
                        setCopyCoverFromStoryUrl(null);
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => coverFileInputRef.current?.click()}>
                    {coverImageFile ? coverImageFile.name : "Choose Image"}
                  </Button>
                  {editingBlog?.cover_image_url && !removeCoverImage && !copyCoverFromStoryUrl && (
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
                </div>
              </div>

              <div className="border-t pt-3">
                <Label htmlFor="blog-linked-story">Linked Story (optional)</Label>
                {linkedStoryId !== null && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <span className="flex-1 truncate">{linkedStoryTitle}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setLinkedStoryId(null);
                        setLinkedStoryTitle(null);
                        if (copyCoverFromStoryId === linkedStoryId) {
                          setCopyCoverFromStoryId(null);
                          setCopyCoverFromStoryUrl(null);
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="blog-linked-story"
                    placeholder="Search by title..."
                    className="pl-9"
                    value={storySearchQuery}
                    onChange={(e) => setStorySearchQuery(e.target.value)}
                  />
                </div>
                {debouncedStorySearchQuery.length >= 2 && (
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
                    {(storySearchResults?.results || []).map((story) => (
                      <button
                        key={story.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => selectLinkedStory(story)}
                      >
                        <span className="truncate">{story.title}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                          {getLanguageLabel(story.language)}
                        </span>
                      </button>
                    ))}
                    {(storySearchResults?.results || []).length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">No matching stories.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 border-t pt-3">
                <Checkbox
                  id="blog-published"
                  checked={isPublished}
                  onCheckedChange={(checked) => setIsPublished(checked === true)}
                />
                <Label htmlFor="blog-published" className="cursor-pointer font-normal">
                  Published
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
                  {saving ? "Saving..." : editingBlog ? "Save Changes" : "Create Post"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {linkStoryOffer && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setLinkStoryOffer(null)}
          >
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">Linked "{linkStoryOffer.title}"</CardTitle>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLinkStoryOffer(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkStoryOffer.retrospective && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">This story has a retrospective. Use it as the blog content?</p>
                    <div
                      className="prose prose-sm dark:prose-invert max-h-40 max-w-none overflow-y-auto rounded-md border bg-muted/30 px-3 py-2"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(linkStoryOffer.retrospective) }}
                    />
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={useRetrospectiveAsContent}>
                        Use as Blog Content
                      </Button>
                    </div>
                  </div>
                )}
                {linkStoryOffer.cover_image_url && (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">Use this story's cover image?</p>
                    <div className="flex items-center gap-3">
                      <img
                        src={linkStoryOffer.cover_image_url}
                        alt=""
                        className="h-20 w-16 rounded-md object-cover"
                      />
                      <p className="flex-1 text-xs text-muted-foreground">
                        Otherwise, upload a new cover image for this post separately below.
                      </p>
                      <Button type="button" size="sm" onClick={useStoryCoverImage}>
                        Use This Cover
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex justify-end border-t pt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setLinkStoryOffer(null)}>
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto pr-1">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Blog</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage blog posts shown at /blog — optionally link one to a story.
            </p>
          </div>
          <Button size="sm" onClick={openCreateForm}>
            <Plus className="mr-1 h-4 w-4" />
            New Post
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search posts"
              className="pl-8"
            />
          </div>

          {blogsLoading ? (
            <p className="text-sm text-muted-foreground">Loading posts...</p>
          ) : (blogsData?.results?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search.trim() ? "No posts match your search." : "No blog posts yet — create the first one."}
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {(blogsData?.results || []).map((blog) => (
                <div key={blog.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{blog.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      /{blog.slug} &middot; {blog.is_published ? "Published" : "Draft"}
                      {blog.linked_story_detail && ` · Linked to ${blog.linked_story_detail.title}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEditForm(blog)}
                      aria-label={`Edit ${blog.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setPendingDeleteBlog(blog)}
                      aria-label={`Delete ${blog.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {blogsData && blogsData.pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {blogsData.pagination.page} of {blogsData.pagination.pages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= blogsData.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingDeleteBlog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setPendingDeleteBlog(null)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Delete Blog Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Delete "{pendingDeleteBlog.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteBlog(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={deleting} onClick={deleteBlog}>
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

export default AdminBlogs;
