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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { storyApi } from "@/api/story";
import { useBlog } from "@/hooks/useBlog";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useQuery } from "@tanstack/react-query";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import { plainText } from "@/lib/plainText";
import { sanitizeBlogContent } from "@/lib/sanitizeHtml";
import { shareToFacebook, shareToTwitter, copyShareLink } from "@/lib/share";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Facebook,
  Link2,
  Maximize2,
  Newspaper,
  Share2,
  Twitter,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

// Shared between the inline article and the expanded dialog, so the two
// never drift apart into two slightly different textures.
//
// The noise layer was the source of visible scroll jank: with no explicit
// size, the SVG's feTurbulence filter got rasterized at the full height of
// the (potentially very long) article on every layout — expensive, and
// on some browsers re-rasterized on scroll instead of staying a cached
// bitmap. Giving it a small fixed tile + explicit background-size/repeat
// makes it a tiny raster generated once and tiled, not a page-sized one.
const PARCHMENT_STYLE: CSSProperties = {
  backgroundColor: "#f2e8d0",
  backgroundImage:
    // Layered radial gradients give a mottled, aged look; the SVG
    // fractal-noise layer on top adds paper grain — both generated in
    // CSS/SVG so no image asset to host.
    "radial-gradient(circle at 15% 20%, rgba(139,111,71,0.12), transparent 45%)," +
    "radial-gradient(circle at 85% 15%, rgba(139,111,71,0.10), transparent 40%)," +
    "radial-gradient(circle at 75% 85%, rgba(139,111,71,0.12), transparent 45%)," +
    "radial-gradient(circle at 10% 90%, rgba(139,111,71,0.10), transparent 40%)," +
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
  backgroundSize: "cover, cover, cover, cover, 150px 150px",
  backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat, repeat",
  boxShadow: "inset 0 0 60px rgba(139,111,71,0.25)",
  // Promotes this to its own compositing layer so the browser reuses the
  // already-painted bitmap while scrolling instead of repainting it.
  transform: "translateZ(0)",
};

const PROSE_STYLE: CSSProperties = { fontFamily: "'Literata', Georgia, serif" };

const BLOG_PROGRESS_SAVE_DELAY_MS = 800;

const BlogDetail = ({ loaderData }: Route.ComponentProps) => {
  const { slug } = useParams();
  const { data: blog, isLoading, isError } = useBlog(slug!, loaderData || undefined);
  const isAuthenticated = useIsLoggedIn();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Fills the sidebar with something worth clicking even when this post has
  // no explicit "related posts" set — otherwise a post without them leaves
  // the sidebar as just an ad and a lot of empty space below it.
  const { data: recentBlogsData } = useQuery({
    queryKey: ["blog-detail-recent", blog.slug],
    queryFn: () => storyApi.getBlogs(1, "", "newest"),
    staleTime: 60_000,
  });
  const recentBlogs = useMemo(
    () => (recentBlogsData?.results || []).filter((post) => post.slug !== blog.slug).slice(0, 5),
    [recentBlogsData, blog.slug]
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pb-8 pt-0 sm:pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Same info-card treatment as the story details / Quick Read
                pages — a primary-tinted card, edge-to-edge on mobile. */}
            <div className="relative -mx-4 mb-8 overflow-hidden border-y border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-card p-4 shadow-sm sm:mx-0 sm:rounded-sm sm:border-x sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-primary/10 blur-3xl sm:block" />

              <div className="relative aspect-video overflow-hidden rounded-sm shadow-lg">
                <CoverImage src={blog.cover_image} alt={blog.title} className="h-full w-full object-cover" />
              </div>

              <h1 className="relative mt-5 text-3xl font-bold">{blog.title}</h1>
              <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                  {blog.author_name && (
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <User className="h-3.5 w-3.5" />
                      {blog.author_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground" suppressHydrationWarning>
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(blog.published_at)}
                  </span>
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
            </div>

            <AdSpace size="banner" className="mb-8" contentType="blog" />

            {/* Content card — same treatment as the Quick Read page's
                "Summary" card: plain on mobile, bordered/shadowed from sm up. */}
            <Card className="-mx-4 rounded-none border-x-0 border-b-0 shadow-none sm:mx-0 sm:rounded-lg sm:border sm:shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-4 py-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                    <Newspaper className="h-4 w-4 text-primary" />
                    Article
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden h-7 gap-1.5 px-2 text-xs sm:inline-flex"
                    onClick={() => setIsExpanded(true)}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Expand
                  </Button>
                </div>
                <div className="relative p-4 sm:p-8" style={PARCHMENT_STYLE}>
                  <div
                    ref={contentRef}
                    className="prose prose-lg relative max-w-none text-justify leading-8 text-neutral-800 prose-headings:text-neutral-900"
                    style={PROSE_STYLE}
                    dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(blog.content) }}
                  />
                </div>
              </CardContent>
            </Card>

            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
              {/* Covers the full viewport (default DialogContent is a
                  centered box, not a full-screen one) with its own
                  scroll container, so the parchment card can sit centered
                  within it rather than being the whole screen itself. */}
              <DialogContent
                className="max-w-none gap-0 rounded-none border-0 bg-black/70 text-white"
                style={{
                  position: "fixed",
                  inset: 0,
                  top: 0,
                  left: 0,
                  transform: "none",
                  width: "100vw",
                  height: "100dvh",
                  overflowY: "auto",
                  display: "block",
                  padding: "1rem",
                }}
              >
                <DialogTitle className="sr-only">{blog.title}</DialogTitle>
                <div
                  className="mx-auto max-w-3xl rounded-sm shadow-2xl sm:my-8"
                  style={{ ...PARCHMENT_STYLE, transform: undefined }}
                >
                  <div className="p-6 sm:p-10">
                    <h2 className="mb-6 text-2xl font-bold text-neutral-900 sm:text-3xl" style={PROSE_STYLE}>
                      {blog.title}
                    </h2>
                    <div
                      className="prose prose-lg max-w-none text-justify leading-8 text-neutral-800 prose-headings:text-neutral-900"
                      style={PROSE_STYLE}
                      dangerouslySetInnerHTML={{ __html: sanitizeBlogContent(blog.content) }}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {linkedStories.length > 0 && (
              <section className="mt-8" aria-labelledby="linked-stories-heading">
                <h2
                  id="linked-stories-heading"
                  className="mb-4 flex items-center gap-2.5 text-xl font-bold tracking-tight"
                >
                  <BookOpen className="h-5 w-5 text-primary" />
                  Related Stories
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {linkedStories.map((story) => (
                    <Link
                      key={story.id}
                      to={`/read/${story.slug}`}
                      className="group flex gap-4 rounded-sm border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-sm">
                        <CoverImage
                          src={story.cover_image}
                          alt={story.title}
                          author={story.author}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                          {story.story_type || "Story"}
                        </p>
                        <p className="mt-1 line-clamp-2 font-semibold group-hover:text-primary">{story.title}</p>
                        {story.author && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">by {story.author}</p>
                        )}
                        <span className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
                          Read Story <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <AdSpace size="rectangle" contentType="blog" />

            {(linkedBlogs.length > 0 ? linkedBlogs : recentBlogs).length > 0 && (
              <section className="rounded-sm border border-border bg-card p-4 shadow-sm" aria-labelledby="linked-blogs-heading">
                <h2 id="linked-blogs-heading" className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                  <Newspaper className="h-4 w-4 text-primary" />
                  {linkedBlogs.length > 0 ? "Related Posts" : "Recent Posts"}
                </h2>
                <div className="space-y-4">
                  {(linkedBlogs.length > 0 ? linkedBlogs : recentBlogs).map((relatedBlog) => (
                    <Link key={relatedBlog.id} to={`/blog/${relatedBlog.slug}`} className="group block">
                      <div className="aspect-video overflow-hidden rounded-sm">
                        <CoverImage
                          src={relatedBlog.cover_image}
                          alt={relatedBlog.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-sm font-semibold group-hover:text-primary">{relatedBlog.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground" suppressHydrationWarning>
                        {relatedBlog.author_name ? `${relatedBlog.author_name} · ` : ""}
                        {formatDate(relatedBlog.published_at)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BlogDetail;
