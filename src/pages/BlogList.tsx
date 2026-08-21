import BlogCard from "@/components/BlogCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfiniteBlogs } from "@/hooks/useInfiniteBlogs";
import { buildMeta } from "@/lib/buildMeta";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

export function meta() {
  return buildMeta({
    title: "Blog | WorldStories",
    description: "Reading recommendations, author spotlights, and news from the WorldStories team.",
    path: "/blog",
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Blog</h1>
        <p className="text-muted-foreground">
          Reading recommendations, author spotlights, and news from the WorldStories team.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts"
            className="pl-8"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
        <Select value={linkedFilter} onValueChange={(value) => setLinkedFilter(value as LinkedFilter)}>
          <SelectTrigger className="w-[200px]">
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
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {blogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex justify-center py-8">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
};

export default BlogList;
