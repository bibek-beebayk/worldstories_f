import { storyApi } from "@/api/story";
import BlogCard from "@/components/BlogCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
  const blogs = data?.results || [];

  if (!isLoading && blogs.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Newspaper className="h-3.5 w-3.5" />
            <span>From the Blog</span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Reading recommendations and news from the WorldStories team.
          </p>
        </div>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          See all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-video w-[220px] shrink-0 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <Carousel opts={{ align: "start" }} className="px-1">
          <CarouselContent>
            {blogs.map((blog) => (
              <CarouselItem key={blog.id} className="basis-[220px] sm:basis-[240px]">
                <BlogCard blog={blog} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )}
    </section>
  );
};

export default RecentBlogsSection;
