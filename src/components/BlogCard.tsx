import { Link } from "react-router";
import { BookOpen } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import { Blog } from "@/api/types";
import { formatBlogReadTime } from "@/lib/blogParams";
import { DEFAULT_DISPLAY, type CardShowFlags } from "@/lib/homeDisplay";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

/**
 * One blog post as a card. The whole card is clickable through a single
 * stretched link on the title (a link inside a link is invalid HTML), and the
 * linked-book chip is its own link, lifted above that stretch.
 *
 * Everything past the title is optional so other callers (home rail, a story's
 * related posts) keep working with whatever the API sent: no excerpt, topic,
 * read time or book simply means that line is not drawn.
 */
const BlogCard = ({
  blog,
  variant = "default",
  show,
}: {
  blog: Blog;
  variant?: "default" | "overlay" | "wide" | "text";
  show?: CardShowFlags;
}) => {
  const topic = blog.topics?.[0];
  const showReadingTime = show?.readingTime ?? DEFAULT_DISPLAY.show_reading_time;
  const showOverlaySummary = show?.summary ?? DEFAULT_DISPLAY.show_summary;
  const readTime = showReadingTime ? formatBlogReadTime(blog.reading_time_minutes) : null;
  const book = blog.linked_story;

  if (variant === "overlay") {
    return (
      <article className="group relative h-full">
        <div className="relative aspect-video h-full min-h-[180px] w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5">
          <CoverImage
            src={blog.cover_image}
            alt=""
            title={blog.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <h3 className="!font-serif line-clamp-2 text-base font-bold leading-snug text-white drop-shadow-sm">
              <Link
                to={`/blog/${blog.slug}`}
                className="after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-primary"
              >
                {blog.title}
              </Link>
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-white/90">
              <span suppressHydrationWarning>{formatDate(blog.published_at)}</span>
              {readTime && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>{readTime}</span>
                </>
              )}
            </p>
            {showOverlaySummary && blog.excerpt && (
              <p className="mt-1 line-clamp-2 text-xs text-white/85">{blog.excerpt}</p>
            )}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "wide") {
    return (
      <article className="group relative flex items-start gap-3 rounded-lg border border-transparent p-1.5 transition-colors hover:border-border hover:bg-muted/40">
        <div className="aspect-video w-24 shrink-0 overflow-hidden rounded-lg shadow-sm ring-1 ring-black/5 sm:w-28">
          <CoverImage
            src={blog.cover_image}
            alt=""
            title={blog.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="!font-serif line-clamp-2 text-sm font-bold leading-snug sm:text-base">
            <Link
              to={`/blog/${blog.slug}`}
              className="transition-colors after:absolute after:inset-0 after:z-0 after:content-[''] group-hover:text-primary focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-primary"
            >
              {blog.title}
            </Link>
          </h3>
          {blog.excerpt && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{blog.excerpt}</p>}
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span suppressHydrationWarning>{formatDate(blog.published_at)}</span>
            {readTime && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>{readTime}</span>
              </>
            )}
          </p>
        </div>
      </article>
    );
  }

  if (variant === "text") {
    return (
      <article className="group relative border-b border-border py-2.5 transition-colors hover:bg-muted/30">
        <h3 className="!font-serif line-clamp-2 text-sm font-bold leading-snug sm:text-base">
          <Link
            to={`/blog/${blog.slug}`}
            className="transition-colors after:absolute after:inset-0 after:z-0 after:content-[''] group-hover:text-primary focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
          >
            {blog.title}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span suppressHydrationWarning>{formatDate(blog.published_at)}</span>
          {readTime && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{readTime}</span>
            </>
          )}
        </p>
      </article>
    );
  }

  return (
    <article className="group relative flex h-full flex-col">
      <div className="mb-3 aspect-video overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5">
        <CoverImage
          src={blog.cover_image}
          alt=""
          title={blog.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {topic && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">{topic.name}</p>}

      <h3 className="!font-serif mb-1.5 line-clamp-2 text-lg font-bold leading-snug">
        <Link
          to={`/blog/${blog.slug}`}
          className="transition-colors after:absolute after:inset-0 after:z-0 after:content-[''] group-hover:text-primary focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:rounded-xl"
        >
          {blog.title}
        </Link>
      </h3>

      {blog.excerpt && <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{blog.excerpt}</p>}

      <p className="mt-auto flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span suppressHydrationWarning>{formatDate(blog.published_at)}</span>
        {readTime && (
          <>
            <span aria-hidden="true">&middot;</span>
            <span>{readTime}</span>
          </>
        )}
      </p>

      {book && (
        <Link
          to={`/story/${book.slug}`}
          className="relative z-10 mt-2.5 inline-flex max-w-full items-center gap-1.5 self-start rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">Read the book: {book.title}</span>
        </Link>
      )}
    </article>
  );
};

export default BlogCard;
