import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import BlogCard from "@/components/BlogCard";
import { BlogToolbar, BooksBand, FeaturedPost, MostRead } from "@/components/blog/BlogSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storyApi } from "@/api/story";
import { useInfiniteBlogs } from "@/hooks/useInfiniteBlogs";
import { buildBlogParams, isBlogFiltered, parseBlogParams, type BlogListState } from "@/lib/blogParams";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import type { Route } from "./+types/BlogList";

const SERIF_FONT_URL = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap";
const SEARCH_DEBOUNCE_MS = 350;

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
  const tags = buildMeta({
    title: "Blog | WorldStories",
    description: "Reading guides, author spotlights and deep dives into the stories on WorldStories.",
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
  // The serif the post titles are set in.
  return [...tags, { tagName: "link", rel: "stylesheet", href: SERIF_FONT_URL }];
}

const BlogList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseBlogParams(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<BlogListState>, options: { replace?: boolean } = {}) => {
      setSearchParams(buildBlogParams({ ...state, page: 1, ...patch }), { replace: options.replace });
    },
    [state, setSearchParams]
  );

  // --- search: typed locally, written to the URL after a pause ---
  const [searchInput, setSearchInput] = useState(state.q);
  useEffect(() => {
    setSearchInput(state.q);
  }, [state.q]);
  useEffect(() => {
    const next = searchInput.trim();
    if (next === state.q) return;
    const timer = window.setTimeout(() => update({ q: next }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, state.q, update]);

  // --- data ---
  const overview = useQuery({ queryKey: ["blog-overview"], queryFn: storyApi.getBlogOverview, staleTime: 5 * 60_000 });
  const posts = useInfiniteBlogs(state.q, state.sort, undefined, state.topic);
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = posts;
  const blogs = useMemo(() => posts.data?.pages.flatMap((page) => page.results) ?? [], [posts.data]);
  const loadedPages = posts.data?.pages.length ?? 0;
  const total = posts.data?.pages[0]?.pagination.count ?? 0;
  const remaining = Math.max(0, total - blogs.length);

  // A URL with ?page=3 should show three pages: fetch the missing ones once the first has loaded.
  useEffect(() => {
    if (loadedPages > 0 && loadedPages < state.page && hasNextPage && !isFetching) void fetchNextPage();
  }, [loadedPages, state.page, hasNextPage, isFetching, fetchNextPage]);

  const loadMore = async () => {
    await fetchNextPage();
    setSearchParams(buildBlogParams({ ...state, page: loadedPages + 1 }), { replace: true });
  };

  const filtered = isBlogFiltered(state);
  const data = overview.data;
  const topics = (data?.topics ?? []).filter((topic) => topic.post_count > 0);
  const activeTopicName = topics.find((topic) => topic.slug === state.topic)?.name;
  const heading = state.q ? `Results for “${state.q}”` : activeTopicName ?? "All posts";
  const clearAll = () => {
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 pb-12 pt-6 sm:px-4 sm:pt-8">
        {/* Compact header: title and one line on the left, search on the right. */}
        <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 className="!font-serif text-3xl font-bold tracking-tight sm:text-4xl">The WorldStories Blog</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground sm:text-base">
              Reading guides, author spotlights and deep dives into the stories you can read here.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search posts"
              aria-label="Search posts"
              className="h-10 pl-9 pr-9"
            />
            {searchInput && (
              <button type="button" aria-label="Clear search" onClick={() => setSearchInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {/* The front page: hidden once a topic or a search narrows the list. */}
        {!filtered && data && (data.featured || data.most_read.length > 0) && (
          <section className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]" aria-label="Featured">
            {data.featured && <FeaturedPost blog={data.featured} pinned={data.featured_is_pinned} />}
            <MostRead posts={data.most_read} />
          </section>
        )}

        <BlogToolbar
          heading={heading}
          sort={state.sort}
          onSort={(sort) => update({ sort, topic: state.topic, q: state.q })}
          topics={topics}
          totalPosts={data?.total_posts ?? null}
          activeTopic={state.topic}
          onTopic={(topic) => update({ topic, sort: state.sort, q: state.q })}
        />

        {posts.isLoading ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading posts">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="aspect-video animate-pulse rounded-xl bg-muted" />
                <div className="mt-3 h-3 w-1/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : posts.isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">We couldn't load the posts. Please try again.</p>
        ) : blogs.length === 0 ? (
          <div className="rounded-xl border p-10 text-center">
            <p className="font-medium">No posts match.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try another topic or a different search.</p>
            {filtered && (
              <Button className="mt-4" variant="outline" onClick={clearAll}>
                Show all posts
              </Button>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 ${posts.isPlaceholderData ? "opacity-60" : ""}`}>
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="mt-10 flex justify-center">
            <Button variant="outline" size="lg" className="rounded-full px-8" disabled={isFetchingNextPage} onClick={() => void loadMore()}>
              {isFetchingNextPage ? "Loading…" : `Load more posts (${remaining})`}
            </Button>
          </div>
        )}

        {data && <BooksBand books={data.linked_books} />}
      </div>
    </div>
  );
};

export default BlogList;
