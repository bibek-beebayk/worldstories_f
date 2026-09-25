import BlogCard from "@/components/BlogCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { storyApi } from "@/api/story";
import { useInfiniteBlogs } from "@/hooks/useInfiniteBlogs";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import { Loader2, Newspaper, PenLine, Search } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/BlogList";

// Fetched here purely to supply meta() with real data (for the Blog/
// blogPost structured data) server-side — the component below still fetches
// independently via useInfiniteBlogs, same "loader feeds meta only" pattern
// used on the homepage and story detail page.
export async function loader() {
  try {
    return await storyApi.getBlogs(1, "", "newest");
  } catch {
    return undefined;
  }
}

export function meta({ data }: Route.MetaArgs) {
  const posts = data?.results || [];
  return buildMeta({
    title: "Blog | WorldStories",
    description: "Reading recommendations, author spotlights, and news from the WorldStories team.",
    path: "/blog",
    structuredData:
      posts.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "WorldStories Blog",
            url: `${SITE_URL}/blog`,
            blogPost: posts.map((post) => ({
              "@type": "BlogPosting",
              headline: post.title,
              url: `${SITE_URL}/blog/${post.slug}`,
              datePublished: post.published_at,
              dateModified: post.updated_at,
              image: post.cover_image || undefined,
            })),
          }
        : undefined,
  });
}

const LINKED_FILTER_VALUES = ["all", "linked", "general"] as const;
type LinkedFilter = (typeof LINKED_FILTER_VALUES)[number];

const BlogList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") || "");
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "newest");
  const [linkedFilter, setLinkedFilter] = useState<LinkedFilter>(() => {
    const value = searchParams.get("linked");
    return value === "linked" || value === "general" ? value : "all";
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set("q", searchQuery);
    if (sort !== "newest") next.set("sort", sort);
    if (linkedFilter !== "all") next.set("linked", linkedFilter);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sort, linkedFilter]);

  const linkedToStory = linkedFilter === "all" ? undefined : linkedFilter === "linked";

  const {
    data: blogsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteBlogs(searchQuery, sort, linkedToStory);

  const blogs = useMemo(() => blogsData?.pages.flatMap((page) => page.results) || [], [blogsData]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-900 text-white">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        {/* Decorative only — a big flickering newspaper watermark plus small
            drifting pen-line icons, echoing the "editorial" theme the way
            Quick Reads' bolt echoes "fast". */}
        <Newspaper className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 animate-flicker text-white/10" style={{ animationDuration: "3.5s" }} />
        <PenLine className="pointer-events-none absolute bottom-5 left-[16%] h-6 w-6 animate-float text-white/25" style={{ animationDuration: "4.5s" }} />
        <PenLine className="pointer-events-none absolute right-[26%] top-8 h-5 w-5 animate-float text-white/20" style={{ animationDelay: "1s", animationDuration: "5.5s" }} />

        <div className="container relative mx-auto px-4 py-8 sm:py-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Newspaper className="h-3.5 w-3.5" />
            The WorldStories Blog
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Blog</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
            Reading recommendations, author spotlights, and news from the WorldStories team.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-2 sm:flex-wrap sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts"
            className="h-9 pl-8 text-sm sm:h-10 sm:text-base"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-[104px] shrink-0 px-2 text-xs sm:h-10 sm:w-[160px] sm:px-3 sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
        <Select value={linkedFilter} onValueChange={(value) => setLinkedFilter(value as LinkedFilter)}>
          <SelectTrigger className="h-9 w-[112px] shrink-0 px-2 text-xs sm:h-10 sm:w-[200px] sm:px-3 sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="linked">Linked to a Story</SelectItem>
            <SelectItem value="general">General Posts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <FullScreenLoader />
      ) : blogs.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No posts match your filters yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {blogs.map((blog, index) => (
            <Fragment key={blog.id}>
              {index > 0 && <div className="h-px bg-border sm:hidden" aria-hidden="true" />}
              <BlogCard blog={blog} />
            </Fragment>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex justify-center py-8">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
      </div>
    </div>
  );
};

export default BlogList;
