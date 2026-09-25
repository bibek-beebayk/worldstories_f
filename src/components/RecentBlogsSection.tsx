import { storyApi } from "@/api/story";
import BlogCard from "@/components/BlogCard";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Newspaper } from "lucide-react";
import { Link } from "react-router";

// Fetches its own data (unlike QuickReadSection, which reads from the
// aggregated home-data payload) — blog posts aren't part of that endpoint,
// and this stays self-contained so Index.tsx doesn't need to know about it.
// Renders nothing at all (not an empty state) when there are no posts yet,
// same reasoning as QuickReadSection.
const RecentBlogsSection = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["home-recent-blogs"],
    queryFn: () => storyApi.getBlogs(1, "", "newest"),
  });
  const blogs = (data?.results || []).slice(0, 4);

  if (!isLoading && blogs.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
          <Newspaper className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
          From the Blog
        </h2>
        <Link
          to="/blog"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
        >
          See all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-sm bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {blogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentBlogsSection;
