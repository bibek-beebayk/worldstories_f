import FullScreenLoader from "@/components/FullScreenLoader";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { BlogListFilters } from "@/components/admin/blog/BlogListFilters";
import { BlogListRow } from "@/components/admin/blog/BlogListRow";
import { BlogNeedsAttention } from "@/components/admin/blog/BlogNeedsAttention";
import {
  DEFAULT_BLOG_LIST,
  buildBlogListParams,
  hasActiveBlogFilters,
  parseBlogListParams,
  toBlogApiParams,
  type BlogListState,
  type BlogNeed,
} from "@/components/admin/blog/blogList";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  ArrowLeft,
  Bold,
  Code2,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Search,
  Underline,
  X,
} from "lucide-react";
import { AdminBlog, AdminStory } from "@/api/types";
import { handleRichTextPaste } from "@/lib/richTextPaste";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { getLanguageLabel } from "@/lib/languages";
import { AiGenerationResultBanner } from "@/components/admin/AiGenerationControls";

type LinkedContentOption = { id: number; title: string; slug: string };

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

const adminBlogLinkedStoryDetails = (blog: AdminBlog): LinkedContentOption[] =>
  blog.linked_story_details || (blog.linked_story_detail ? [blog.linked_story_detail] : []);

const adminBlogLinkedBlogDetails = (blog: AdminBlog): LinkedContentOption[] => blog.linked_blog_details || [];

const AdminBlogs = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });
  const isSuperuser = Boolean(me?.is_superuser);

  const [searchParams, setSearchParams] = useSearchParams();
  const listState = useMemo(() => parseBlogListParams(searchParams), [searchParams]);
  const apiParams = useMemo(() => toBlogApiParams(listState), [listState]);

  const updateListState = useCallback(
    (patch: Partial<BlogListState>) => {
      setSearchParams(
        (prev) => {
          const current = parseBlogListParams(prev);
          const next: BlogListState = {
            ...current,
            ...patch,
            page: patch.page !== undefined ? patch.page : 1,
          };
          return buildBlogListParams(next, prev);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => buildBlogListParams(DEFAULT_BLOG_LIST, prev), { replace: true });
  }, [setSearchParams]);

  const selectNeedFromAttention = useCallback(
    (need: BlogNeed) => {
      setSearchParams((prev) => buildBlogListParams({ ...DEFAULT_BLOG_LIST, needs: [need] }, prev), { replace: true });
    },
    [setSearchParams],
  );

  const { data: blogsData, isLoading: blogsLoading } = useQuery({
    queryKey: [
      "admin-blogs",
      listState.page,
      listState.q,
      listState.status,
      listState.needs.join(","),
      listState.topic,
      listState.sort,
    ],
    queryFn: () => storyApi.getAdminBlogs(apiParams),
    enabled: isAuthenticated && isSuperuser,
    placeholderData: keepPreviousData,
  });

  const {
    data: blogStats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ["admin-blog-stats"],
    queryFn: storyApi.getAdminBlogStats,
    enabled: isAuthenticated && isSuperuser,
  });

  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);
  const [togglingPublishId, setTogglingPublishId] = useState<number | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<AdminBlog | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [topicIds, setTopicIds] = useState<number[]>([]);
  const [topicsBannerDismissed, setTopicsBannerDismissed] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const [linkedStories, setLinkedStories] = useState<LinkedContentOption[]>([]);
  const [linkedBlogs, setLinkedBlogs] = useState<LinkedContentOption[]>([]);
  const [copyCoverFromStoryId, setCopyCoverFromStoryId] = useState<number | null>(null);
  const [copyCoverFromStoryUrl, setCopyCoverFromStoryUrl] = useState<string | null>(null);
  const [linkStoryOffer, setLinkStoryOffer] = useState<AdminStory | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteBlog, setPendingDeleteBlog] = useState<AdminBlog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [excerptBannerDismissed, setExcerptBannerDismissed] = useState(false);
  const [isContentHtmlMode, setIsContentHtmlMode] = useState(false);

  const contentEditorRef = useRef<HTMLDivElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const lastAppliedExcerptStatusRef = useRef<string | null>(null);

  const { data: liveEditingBlog } = useQuery({
    queryKey: ["admin-blog", editingBlog?.id],
    queryFn: () => storyApi.getAdminBlog(editingBlog!.id),
    enabled: isAuthenticated && isSuperuser && showForm && editingBlog !== null,
    refetchInterval: (query) => {
      const s = query.state.data;
      const busy = (status?: string | null) => status === "pending" || status === "processing";
      return busy(s?.excerpt_status) || busy(s?.topics_status) ? 2000 : false;
    },
  });

  const { data: topicOptions } = useQuery({
    queryKey: ["admin-blog-topics"],
    queryFn: storyApi.getAdminBlogTopics,
    enabled: isAuthenticated && isSuperuser,
    staleTime: 5 * 60_000,
  });
  const lastAppliedTopicsStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!liveEditingBlog) return;
    if (liveEditingBlog.excerpt_status === "completed" && lastAppliedExcerptStatusRef.current !== "completed") {
      setExcerpt(liveEditingBlog.excerpt || "");
    }
    lastAppliedExcerptStatusRef.current = liveEditingBlog.excerpt_status;
    // Topics the model just suggested land in the form the same way a generated excerpt does.
    if (liveEditingBlog.topics_status === "completed" && lastAppliedTopicsStatusRef.current !== "completed") {
      setTopicIds(liveEditingBlog.topics ?? []);
    }
    lastAppliedTopicsStatusRef.current = liveEditingBlog.topics_status ?? null;
  }, [liveEditingBlog]);

  const topicsSuggestionBusy =
    liveEditingBlog?.topics_status === "pending" || liveEditingBlog?.topics_status === "processing";

  const excerptGenerationBusy =
    liveEditingBlog?.excerpt_status === "pending" || liveEditingBlog?.excerpt_status === "processing";

  const [storySearchQuery, setStorySearchQuery] = useState("");
  const [debouncedStorySearchQuery, setDebouncedStorySearchQuery] = useState("");
  const [blogSearchQuery, setBlogSearchQuery] = useState("");
  const [debouncedBlogSearchQuery, setDebouncedBlogSearchQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedStorySearchQuery(storySearchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [storySearchQuery]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedBlogSearchQuery(blogSearchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [blogSearchQuery]);
  const { data: storySearchResults } = useQuery({
    queryKey: ["admin-stories-linked-search", debouncedStorySearchQuery],
    queryFn: () => storyApi.getAdminStories(1, debouncedStorySearchQuery),
    enabled: debouncedStorySearchQuery.length >= 2,
  });
  const { data: blogSearchResults } = useQuery({
    queryKey: ["admin-blogs-linked-search", debouncedBlogSearchQuery],
    queryFn: () => storyApi.getAdminBlogs({ page: 1, search: debouncedBlogSearchQuery }),
    enabled: debouncedBlogSearchQuery.length >= 2,
  });

  useEffect(() => {
    if (!showForm || !contentEditorRef.current) return;
    // Seeded through the readers' sanitizer so the editor shows what the
    // published post will (inline styles from older pastes stripped, their
    // bold/italic kept as tags) — see the chapter editor in AdminContent.tsx.
    const cleanContent = sanitizeHtml(content);
    contentEditorRef.current.innerHTML = cleanContent;
    setContent(cleanContent);
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

  // Switching *out* of HTML mode has to push whatever was typed in the
  // textarea back into the actual contentEditable node — editing the
  // textarea only ever touches the `content` string state, not that DOM
  // node, so without this the WYSIWYG view would silently show stale
  // content until something else happened to re-sync it.
  const toggleContentHtmlMode = () => {
    setIsContentHtmlMode((prev) => {
      if (prev && contentEditorRef.current) {
        contentEditorRef.current.innerHTML = content;
      }
      return !prev;
    });
  };

  const resetForm = () => {
    setEditingBlog(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setAuthorName("");
    setContent("");
    setIsPublished(true);
    setIsFeatured(false);
    setTopicIds([]);
    setTopicsBannerDismissed(false);
    lastAppliedTopicsStatusRef.current = null;
    setPublishAt("");
    setCoverImageFile(null);
    setRemoveCoverImage(false);
    setLinkedStories([]);
    setLinkedBlogs([]);
    setCopyCoverFromStoryId(null);
    setCopyCoverFromStoryUrl(null);
    setLinkStoryOffer(null);
    setStorySearchQuery("");
    setBlogSearchQuery("");
    setExcerptBannerDismissed(false);
    setIsContentHtmlMode(false);
    lastAppliedExcerptStatusRef.current = null;
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = async (blog: AdminBlog) => {
    try {
      setLoadingEditId(blog.id);
      const fullBlog = await storyApi.getAdminBlog(blog.id);
      setEditingBlog(fullBlog);
      setTitle(fullBlog.title);
      setSlug(fullBlog.slug);
      setExcerpt(fullBlog.excerpt || "");
      setAuthorName(fullBlog.author_name || "");
      setContent(fullBlog.content ?? "");
      setIsPublished(fullBlog.is_published);
      setIsFeatured(Boolean(fullBlog.is_featured));
      setTopicIds(fullBlog.topics ?? []);
      setTopicsBannerDismissed(false);
      lastAppliedTopicsStatusRef.current = fullBlog.topics_status ?? null;
      setPublishAt(toDatetimeLocalValue(fullBlog.publish_at));
      setCoverImageFile(null);
      setRemoveCoverImage(false);
      setLinkedStories(adminBlogLinkedStoryDetails(fullBlog));
      setLinkedBlogs(adminBlogLinkedBlogDetails(fullBlog));
      setCopyCoverFromStoryId(null);
      setCopyCoverFromStoryUrl(null);
      setLinkStoryOffer(null);
      setStorySearchQuery("");
      setBlogSearchQuery("");
      setExcerptBannerDismissed(false);
      setIsContentHtmlMode(false);
      lastAppliedExcerptStatusRef.current = fullBlog.excerpt_status;
      setShowForm(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load blog post.");
    } finally {
      setLoadingEditId(null);
    }
  };

  const selectLinkedStory = (story: AdminStory) => {
    setLinkedStories((current) =>
      current.some((item) => item.id === story.id)
        ? current
        : [...current, { id: story.id, title: story.title, slug: story.slug }],
    );
    setStorySearchQuery("");
    if (story.retrospective || story.cover_image_url) {
      setLinkStoryOffer(story);
    }
  };

  const selectLinkedBlog = (blog: AdminBlog) => {
    if (blog.id === editingBlog?.id) return;
    setLinkedBlogs((current) =>
      current.some((item) => item.id === blog.id)
        ? current
        : [...current, { id: blog.id, title: blog.title, slug: blog.slug }],
    );
    setBlogSearchQuery("");
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
      formData.append("is_featured", String(isFeatured));
      if (topicIds.length > 0) topicIds.forEach((id) => formData.append("topics", String(id)));
      else formData.append("topics", "");
      formData.append("publish_at", publishAt ? fromDatetimeLocalValue(publishAt) : "");
      if (linkedStories.length > 0) {
        linkedStories.forEach((story) => formData.append("linked_stories", String(story.id)));
      } else {
        formData.append("linked_stories", "");
      }
      if (linkedBlogs.length > 0) {
        linkedBlogs.forEach((blog) => formData.append("linked_blogs", String(blog.id)));
      } else {
        formData.append("linked_blogs", "");
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-blogs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-blog-stats"] }),
      ]);
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

  const handleSuggestTopics = async () => {
    if (!editingBlog) return;
    setTopicsBannerDismissed(false);
    try {
      await storyApi.suggestBlogTopics(editingBlog.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-blog", editingBlog.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start topic suggestion.");
    }
  };

  const toggleTopic = (id: number) =>
    setTopicIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const deleteBlog = async () => {
    if (!pendingDeleteBlog) return;
    try {
      setDeleting(true);
      await storyApi.deleteAdminBlog(pendingDeleteBlog.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-blogs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-blog-stats"] }),
      ]);
      toast.success("Blog post deleted.");
      setPendingDeleteBlog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete blog post.");
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePublish = async (blog: AdminBlog) => {
    const nextPublished = !blog.is_published;
    try {
      setTogglingPublishId(blog.id);
      const formData = new FormData();
      formData.append("is_published", String(nextPublished));
      await storyApi.updateAdminBlog(blog.id, formData);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-blogs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-blog-stats"] }),
      ]);
      toast.success(nextPublished ? "Post published." : "Post unpublished.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update publish status.");
    } finally {
      setTogglingPublishId(null);
    }
  };

  const handleToggleFeatured = async (blog: AdminBlog) => {
    const nextFeatured = !blog.is_featured;
    try {
      setTogglingFeaturedId(blog.id);
      const formData = new FormData();
      formData.append("is_featured", String(nextFeatured));
      await storyApi.updateAdminBlog(blog.id, formData);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-blogs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-blog-stats"] }),
      ]);
      toast.success(nextFeatured ? "Post marked as featured." : "Removed featured status.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update featured status.");
    } finally {
      setTogglingFeaturedId(null);
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
      <div className="h-full space-y-4 overflow-y-auto scrollbar-thin pr-1">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
          >
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Topics</Label>
                  {editingBlog && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={topicsSuggestionBusy}
                      onClick={handleSuggestTopics}
                    >
                      {topicsSuggestionBusy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                      {topicsSuggestionBusy ? "Suggesting..." : "Suggest topics"}
                    </Button>
                  )}
                </div>
                {editingBlog && (
                  <div className="mt-2">
                    <AiGenerationResultBanner
                      label="Topics"
                      status={liveEditingBlog?.topics_status ?? null}
                      source={liveEditingBlog?.topics_source ?? null}
                      confident={liveEditingBlog?.topics_confident ?? null}
                      confidenceNote={liveEditingBlog?.topics_confidence_note ?? null}
                      error={liveEditingBlog?.topics_error ?? null}
                      dismissed={topicsBannerDismissed}
                      onDismiss={() => setTopicsBannerDismissed(true)}
                      onRetryWithContent={handleSuggestTopics}
                      onTryAgain={handleSuggestTopics}
                    />
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Topics">
                  {(topicOptions ?? []).map((topic) => {
                    const on = topicIds.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleTopic(topic.id)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        {topic.name}
                      </button>
                    );
                  })}
                  {topicOptions?.length === 0 && <p className="text-xs text-muted-foreground">No topics exist yet.</p>}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Shown as chips on the blog page. Pick one or two.
                  {editingBlog?.reading_time_minutes
                    ? ` Reading time (automatic): ${editingBlog.reading_time_minutes} min.`
                    : ""}
                </p>
              </div>

              <div>
                <Label htmlFor="blog-content">Content *</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                    {!isContentHtmlMode && (
                      <>
                        <Button type="button" variant="outline" size="sm" onClick={() => runContentCommand("bold")}>
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => runContentCommand("italic")}>
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => runContentCommand("underline")}
                        >
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
                          onClick={() => runContentCommand("formatBlock", "h3")}
                        >
                          <Heading3 className="h-4 w-4" />
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
                      </>
                    )}
                    <Button
                      type="button"
                      variant={isContentHtmlMode ? "default" : "outline"}
                      size="sm"
                      onClick={toggleContentHtmlMode}
                      className="ml-auto gap-1.5"
                      title={isContentHtmlMode ? "Switch to visual editor" : "Edit raw HTML"}
                    >
                      <Code2 className="h-4 w-4" />
                      HTML
                    </Button>
                  </div>
                  {isContentHtmlMode ? (
                    <Textarea
                      id="blog-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-60 font-mono text-xs"
                      spellCheck={false}
                      placeholder="<p>Raw HTML for this post&hellip;</p>"
                    />
                  ) : (
                    <div
                      id="blog-content"
                      ref={contentEditorRef}
                      contentEditable
                      dir="ltr"
                      style={{ direction: "ltr", unicodeBidi: "isolate", writingMode: "horizontal-tb" }}
                      suppressContentEditableWarning
                      onInput={syncContentEditor}
                      onPaste={(e) => handleRichTextPaste(e, syncContentEditor)}
                      className="prose prose-sm min-h-60 max-w-none rounded-md border px-3 py-2 text-left [unicode-bidi:isolate] [&_*]:text-left focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
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
                <Label htmlFor="blog-linked-story">Linked Stories (optional)</Label>
                <p className="mt-1 text-xs text-muted-foreground">Selected stories will appear after the blog post.</p>
                {linkedStories.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {linkedStories.map((story) => (
                      <div key={story.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                        <span className="flex-1 truncate">{story.title}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          aria-label={`Remove ${story.title}`}
                          onClick={() => {
                            setLinkedStories((current) => current.filter((item) => item.id !== story.id));
                            if (copyCoverFromStoryId === story.id) {
                              setCopyCoverFromStoryId(null);
                              setCopyCoverFromStoryUrl(null);
                            }
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
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
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto scrollbar-thin rounded-md border p-1">
                    {(storySearchResults?.results || [])
                      .filter((story) => !linkedStories.some((selected) => selected.id === story.id))
                      .map((story) => (
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
                    {(storySearchResults?.results || []).filter(
                      (story) => !linkedStories.some((selected) => selected.id === story.id),
                    ).length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No matching stories.</p>}
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                <Label htmlFor="blog-linked-blog">Linked Blogs (optional)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selected posts will appear in a Related Posts section after this blog.
                </p>
                {linkedBlogs.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {linkedBlogs.map((blog) => (
                      <div key={blog.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                        <span className="flex-1 truncate">{blog.title}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          aria-label={`Remove ${blog.title}`}
                          onClick={() => setLinkedBlogs((current) => current.filter((item) => item.id !== blog.id))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="blog-linked-blog"
                    placeholder="Search blog posts by title..."
                    className="pl-9"
                    value={blogSearchQuery}
                    onChange={(e) => setBlogSearchQuery(e.target.value)}
                  />
                </div>
                {debouncedBlogSearchQuery.length >= 2 && (
                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto scrollbar-thin rounded-md border p-1">
                    {(blogSearchResults?.results || [])
                      .filter(
                        (blog) =>
                          blog.id !== editingBlog?.id && !linkedBlogs.some((selected) => selected.id === blog.id),
                      )
                      .map((blog) => (
                        <button
                          key={blog.id}
                          type="button"
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                          onClick={() => selectLinkedBlog(blog)}
                        >
                          <span className="truncate">{blog.title}</span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {blog.is_published ? "Published" : "Draft"}
                          </span>
                        </button>
                      ))}
                    {(blogSearchResults?.results || []).filter(
                      (blog) => blog.id !== editingBlog?.id && !linkedBlogs.some((selected) => selected.id === blog.id),
                    ).length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">No matching blog posts.</p>
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
                <Checkbox
                  id="blog-featured"
                  className="ml-6"
                  checked={isFeatured}
                  onCheckedChange={(checked) => setIsFeatured(checked === true)}
                />
                <Label htmlFor="blog-featured" className="cursor-pointer font-normal">
                  Featured on the blog page
                </Label>
                <span className="text-xs text-muted-foreground">(only one at a time)</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setLinkStoryOffer(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkStoryOffer.retrospective && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">This story has a retrospective. Use it as the blog content?</p>
                    <div
                      className="prose prose-sm max-h-40 max-w-none overflow-y-auto scrollbar-thin rounded-md border bg-muted/30 px-3 py-2"
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
                      <img src={linkStoryOffer.cover_image_url} alt="" className="h-20 w-16 rounded-md object-cover" />
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

  const activeFilters = hasActiveBlogFilters(listState);
  const filteredTotal = blogsData?.pagination.count ?? 0;

  return (
    <div className="h-full space-y-4 overflow-y-auto scrollbar-thin pr-1">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Blog</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage blog posts and their related stories and posts shown at /blog.
            </p>
          </div>
          <Button size="sm" className="min-h-11" onClick={openCreateForm}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Post
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <BlogNeedsAttention
            stats={blogStats}
            isLoading={statsLoading}
            isError={statsError}
            activeNeeds={listState.needs}
            onSelectNeed={selectNeedFromAttention}
          />

          <BlogListFilters
            state={listState}
            total={filteredTotal}
            topicOptions={topicOptions ?? []}
            onChange={updateListState}
            onClear={clearFilters}
          />

          {blogsLoading ? (
            <p className="text-sm text-muted-foreground">Loading posts...</p>
          ) : (blogsData?.results?.length || 0) === 0 ? (
            activeFilters ? (
              <div className="rounded-md border py-8 text-center">
                <p className="text-sm font-medium">No posts match these filters</p>
                <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No blog posts yet — create the first one.</p>
            )
          ) : (
            <div className="divide-y rounded-md border">
              {(blogsData?.results || []).map((blog) => (
                <BlogListRow
                  key={blog.id}
                  blog={blog}
                  isEditLoading={loadingEditId === blog.id}
                  isTogglingPublish={togglingPublishId === blog.id}
                  isTogglingFeatured={togglingFeaturedId === blog.id}
                  onEdit={openEditForm}
                  onDelete={setPendingDeleteBlog}
                  onTogglePublish={handleTogglePublish}
                  onToggleFeatured={handleToggleFeatured}
                />
              ))}
            </div>
          )}

          {blogsData && blogsData.pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11"
                disabled={listState.page <= 1}
                onClick={() => updateListState({ page: Math.max(1, listState.page - 1) })}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {blogsData.pagination.page} of {blogsData.pagination.pages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11"
                disabled={listState.page >= blogsData.pagination.pages}
                onClick={() => updateListState({ page: listState.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDeleteBlog !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeleteBlog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{pendingDeleteBlog?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void deleteBlog();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBlogs;
