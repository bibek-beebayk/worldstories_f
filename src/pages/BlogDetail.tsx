import AdSpace from "@/components/AdSpace";
import CoverImage from "@/components/CoverImage";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { storyApi } from "@/api/story";
import { useBlog } from "@/hooks/useBlog";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import { plainText } from "@/lib/plainText";
import { sanitizeBlogContent } from "@/lib/sanitizeHtml";
import { shareToFacebook, shareToTwitter, copyShareLink } from "@/lib/share";
import { ArrowRight, BookOpen, Facebook, Link2, Newspaper, Share2, Twitter } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Link, data, useParams } from "react-router";
import type { Route } from "./+types/BlogDetail";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getBlog(params.slug!);
  } catch {
    return data(null, { status: 404 });
  }
}

export function meta({ data: loaderData, params }: Route.MetaArgs) {
  if (!loaderData) {
    return buildMeta({
      title: "Post Not Found | WorldStories",
      description: "The requested blog post could not be found.",
      path: `/blog/${params.slug}`,
      noIndex: true,
    });
  }

  const blogPath = `/blog/${loaderData.slug}`;
  const plainContent = plainText(loaderData.content);
  const description = (loaderData.excerpt || plainContent).slice(0, 160);

  return buildMeta({
    title: `${loaderData.title} | WorldStories Blog`,
    description,
    path: blogPath,
    image: loaderData.cover_image,
    type: "article",
    article: {
      publishedTime: loaderData.published_at,
      modifiedTime: loaderData.updated_at,
      author: loaderData.author_name || undefined,
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: loaderData.title,
      datePublished: loaderData.published_at,
      dateModified: loaderData.updated_at,
      author: loaderData.author_name ? { "@type": "Person", name: loaderData.author_name } : undefined,
      image: loaderData.cover_image || undefined,
      url: `${SITE_URL}${blogPath}`,
      articleBody: plainContent.slice(0, 5000),
    },
  });
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

const BLOG_PROGRESS_SAVE_DELAY_MS = 800;

const BlogDetail = ({ loaderData }: Route.ComponentProps) => {
  const { slug } = useParams();
  const { data: blog, isLoading, isError } = useBlog(slug!, loaderData || undefined);
  const isAuthenticated = useIsLoggedIn();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  useContentSessionAnalytics(
    "reading_session",
    blog?.slug ? { blogSlug: blog.slug } : undefined,
    true,
    { format: "blog" }
  );

  // Scroll-depth analytics: authenticated readers only, mirroring
  // ReadingProgress's own limitation for stories — anonymous readers still
  // count toward page opens/reading sessions (useContentSessionAnalytics
  // above), just not toward "how far did they get".
  const queueSaveBlogProgress = useCallback(
    (progress: number) => {
      const blogSlug = blog?.slug;
      if (!isAuthenticated || !blogSlug) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        storyApi.saveBlogReadingProgress(blogSlug, progress).catch(() => undefined);
      }, BLOG_PROGRESS_SAVE_DELAY_MS);
    },
    [isAuthenticated, blog?.slug]
  );

  useEffect(() => {
    if (!isAuthenticated || !blog?.slug) return;
    const contentEl = contentRef.current;
    if (!contentEl) return;

    // Blog posts render in normal document flow (no custom scroll
    // container like the story chapter reader), so progress is measured
    // against window scroll position and the content element's own
    // height, rather than a container's scrollTop.
    const handleScroll = () => {
      const contentTop = contentEl.getBoundingClientRect().top + window.scrollY;
      const contentHeight = contentEl.offsetHeight;
      if (contentHeight === 0) return;
      const viewportBottom = window.scrollY + window.innerHeight;
      const scrolled = Math.min(Math.max(viewportBottom - contentTop, 0), contentHeight);
      queueSaveBlogProgress(scrolled / contentHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const initialTimer = window.setTimeout(handleScroll, 300);
    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isAuthenticated, blog?.slug, queueSaveBlogProgress]);

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isError || !blog) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Post Not Found</h1>
        <p className="text-muted-foreground">This blog post doesn't exist or has been removed.</p>
      </div>
    );
  }

  const blogPath = `/blog/${blog.slug}`;
  const linkedStories = blog.linked_stories || (blog.linked_story ? [blog.linked_story] : []);
  const linkedBlogs = blog.linked_blogs || [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="relative mb-6 aspect-video overflow-hidden rounded-lg shadow-md">
        <CoverImage src={blog.cover_image} alt={blog.title} className="h-full w-full object-cover" />
      </div>

      <h1 className="mb-3 text-3xl font-bold">{blog.title}</h1>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {blog.author_name && <span>{blog.author_name}</span>}
          {blog.author_name && <span aria-hidden="true">&middot;</span>}
          <span suppressHydrationWarning>{formatDate(blog.published_at)}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" aria-label="Share this blog post">
              <Share2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => shareToFacebook(blogPath)}>
              <Facebook className="h-4 w-4" />
              Share on Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => shareToTwitter(blogPath, blog.title)}>
              <Twitter className="h-4 w-4" />
              Share on X (Twitter)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyShareLink(blogPath)}>
              <Link2 className="h-4 w-4" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AdSpace size="banner" className="mb-8" contentType="blog" />

      <div
        ref={contentRef}
        className="prose prose-sm md:prose-base max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(blog.content) }}
      />

      <AdSpace size="rectangle" className="my-8" contentType="blog" />

      {linkedStories.length > 0 && (
        <section className="mt-10" aria-labelledby="linked-stories-heading">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 id="linked-stories-heading" className="text-xl font-bold">Related Stories</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {linkedStories.map((story) => (
              <Card key={story.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="flex gap-4 p-4">
                  <Link to={`/story/${story.slug}`} className="aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md">
                    <CoverImage
                      src={story.cover_image}
                      alt={story.title}
                      author={story.author}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      {story.story_type || "Story"}
                    </p>
                    <Link to={`/story/${story.slug}`} className="mt-1 line-clamp-2 font-semibold hover:text-primary">
                      {story.title}
                    </Link>
                    {story.author && <p className="mt-1 truncate text-xs text-muted-foreground">by {story.author}</p>}
                    <Link
                      to={`/story/${story.slug}`}
                      className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Read Story <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {linkedBlogs.length > 0 && (
        <section className="mt-10" aria-labelledby="linked-blogs-heading">
          <div className="mb-4 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 id="linked-blogs-heading" className="text-xl font-bold">Related Posts</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {linkedBlogs.map((relatedBlog) => (
              <Link key={relatedBlog.id} to={`/blog/${relatedBlog.slug}`} className="group block">
                <div className="aspect-video overflow-hidden rounded-lg shadow-sm">
                  <CoverImage
                    src={relatedBlog.cover_image}
                    alt={relatedBlog.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-3 line-clamp-2 font-semibold group-hover:text-primary">{relatedBlog.title}</h3>
                {relatedBlog.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{relatedBlog.excerpt}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground" suppressHydrationWarning>
                  {relatedBlog.author_name ? `${relatedBlog.author_name} · ` : ""}
                  {formatDate(relatedBlog.published_at)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BlogDetail;
