import { useEffect, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import type { AdminBlog } from "@/api/types";
import { TitleAnalyticsDialog } from "@/components/admin/TitleAnalyticsDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { blogStatus, formatRelativeTime, formatScheduledDate, missingBlogParts, type BlogStatus } from "./blogList";

const STATUS_STYLE: Record<BlogStatus, { pill: string; dot: string }> = {
  published: {
    pill: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  draft: {
    pill: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/70",
  },
  scheduled: {
    pill: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
  },
};

const CoverThumbnail = ({ url }: { url?: string | null }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-[54px] w-24 shrink-0 rounded object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex h-[54px] w-24 shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground"
    >
      <ImageIcon className="h-5 w-5 opacity-70" />
    </div>
  );
};

interface BlogListRowProps {
  blog: AdminBlog;
  isEditLoading: boolean;
  isTogglingPublish: boolean;
  isTogglingFeatured: boolean;
  onEdit: (blog: AdminBlog) => void;
  onDelete: (blog: AdminBlog) => void;
  onTogglePublish: (blog: AdminBlog) => void;
  onToggleFeatured: (blog: AdminBlog) => void;
}

export const BlogListRow = ({
  blog,
  isEditLoading,
  isTogglingPublish,
  isTogglingFeatured,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeatured,
}: BlogListRowProps) => {
  const [mobileAnalyticsOpen, setMobileAnalyticsOpen] = useState(false);

  const status = blogStatus(blog);
  const missing = missingBlogParts(blog);
  const topics = blog.topic_details ?? [];
  const visibleTopics = topics.slice(0, 2);
  const extraTopics = Math.max(0, topics.length - 2);

  const linkedStoriesCount =
    blog.linked_story_details?.length ?? (blog.linked_story_detail ? 1 : (blog.linked_stories?.length ?? 0));
  const linkedBlogsCount = blog.linked_blog_details?.length ?? blog.linked_blogs?.length ?? 0;

  const scheduledWhen = status === "scheduled" ? formatScheduledDate(blog.publish_at) : "";
  const statusText =
    status === "published"
      ? "Published"
      : status === "draft"
        ? "Draft"
        : scheduledWhen
          ? `Scheduled · ${scheduledWhen}`
          : "Scheduled";

  const updatedLabel = formatRelativeTime(blog.updated_at);
  const viewLabel = status === "published" ? "View on site" : "Preview";

  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <CoverThumbnail url={blog.cover_image_url} />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start gap-1.5">
            {blog.is_featured && (
              <Star className="mt-0.5 h-4 w-4 shrink-0 fill-primary text-primary" aria-label="Featured post" />
            )}
            <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">{blog.title}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status].pill}`}
            >
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[status].dot}`} />
              {statusText}
            </span>

            {visibleTopics.map((topic) => (
              <span
                key={topic.id}
                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
              >
                {topic.name}
              </span>
            ))}
            {extraTopics > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                +{extraTopics}
              </span>
            )}

            {blog.reading_time_minutes ? (
              <span className="text-muted-foreground">{blog.reading_time_minutes} min read</span>
            ) : null}

            {updatedLabel && <span className="text-muted-foreground">Updated {updatedLabel}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {linkedStoriesCount === 0 ? (
              <span className="rounded-full border border-amber-300/70 bg-amber-50/70 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
                No linked stories
              </span>
            ) : (
              <span className="text-muted-foreground">
                {linkedStoriesCount} {linkedStoriesCount === 1 ? "story" : "stories"}
                {linkedBlogsCount > 0 && ` · ${linkedBlogsCount} ${linkedBlogsCount === 1 ? "post" : "posts"}`}
              </span>
            )}
            {linkedStoriesCount === 0 && linkedBlogsCount > 0 && (
              <span className="text-muted-foreground">
                {linkedBlogsCount} {linkedBlogsCount === 1 ? "post" : "posts"}
              </span>
            )}

            {missing.length > 0 && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
                Missing: {missing.join(", ")}
              </span>
            )}
          </div>

          <p className="truncate text-xs text-muted-foreground">/{blog.slug}</p>
        </div>
      </div>

      {/* Desktop actions */}
      <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9" title={viewLabel}>
          <a
            href={`/blog/${blog.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${viewLabel}: ${blog.title}`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          disabled={isTogglingPublish}
          onClick={() => onTogglePublish(blog)}
          aria-label={blog.is_published ? `Unpublish ${blog.title}` : `Publish ${blog.title}`}
          title={blog.is_published ? "Unpublish" : "Publish"}
        >
          {isTogglingPublish ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : blog.is_published ? (
            <Eye className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          disabled={isTogglingFeatured}
          onClick={() => onToggleFeatured(blog)}
          aria-label={blog.is_featured ? `Remove featured status from ${blog.title}` : `Feature ${blog.title}`}
          aria-pressed={Boolean(blog.is_featured)}
          title={blog.is_featured ? "Unfeature" : "Feature on blog page"}
        >
          {isTogglingFeatured ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Star
              className={`h-4 w-4 ${blog.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`}
              aria-hidden="true"
            />
          )}
        </Button>

        <TitleAnalyticsDialog kind="blog" slug={blog.slug} title={blog.title} />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          disabled={isEditLoading}
          onClick={() => onEdit(blog)}
          aria-label={`Edit ${blog.title}`}
          title="Edit"
        >
          {isEditLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Pencil className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-destructive hover:text-destructive"
          onClick={() => onDelete(blog)}
          aria-label={`Delete ${blog.title}`}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Mobile actions menu */}
      <div className="shrink-0 sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-11 w-11"
              aria-label={`Actions for ${blog.title}`}
            >
              {isEditLoading || isTogglingPublish || isTogglingFeatured ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <a
                href={`/blog/${blog.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {viewLabel}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 gap-2"
              disabled={isTogglingPublish}
              onClick={() => onTogglePublish(blog)}
            >
              {blog.is_published ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
              {blog.is_published ? "Unpublish" : "Publish"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 gap-2"
              disabled={isTogglingFeatured}
              onClick={() => onToggleFeatured(blog)}
            >
              <Star className={`h-4 w-4 ${blog.is_featured ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
              {blog.is_featured ? "Unfeature" : "Feature"}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" onClick={() => setMobileAnalyticsOpen(true)}>
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Analytics
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" disabled={isEditLoading} onClick={() => onEdit(blog)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="min-h-11 gap-2 text-destructive focus:text-destructive"
              onClick={() => onDelete(blog)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {mobileAnalyticsOpen && (
          <TitleAnalyticsDialog
            kind="blog"
            slug={blog.slug}
            title={blog.title}
            open={mobileAnalyticsOpen}
            onOpenChange={setMobileAnalyticsOpen}
            hideTrigger
          />
        )}
      </div>
    </div>
  );
};
