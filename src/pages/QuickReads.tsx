import FullScreenLoader from "@/components/FullScreenLoader";
import CoverImage from "@/components/CoverImage";
import AuthGatedLink from "@/components/AuthGatedLink";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInfiniteStories } from "@/hooks/useInfiniteStories";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { formatViews } from "@/lib/utils";
import { Clock3, Headphones, Loader2, Search, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildMeta } from "@/lib/buildMeta";

// Login-gated — an anonymous crawler only ever sees the login prompt, never
// this content, so indexing this URL would just offer Google a page with
// nothing on it.
export function meta() {
  return buildMeta({
    title: "Quick Reads — Story Summaries | WorldStories",
    description:
      "Browse every Quick Read on WorldStories — short summaries for busy readers, with a straight line into the full story when you want more.",
    path: "/quick-reads",
    noIndex: true,
  });
}

// Catalogue of every story with a Quick Read summary. Cards go straight to
// /quick-read/:slug via the "Read" button — deliberately not through
// StoryDetail, same as the homepage Quick Read carousel and every other
// Quick Read entry point in the app.
const QuickReads = () => {
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const [sort, setSort] = useState("popular");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: storiesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteStories([], sort, "all", searchQuery, "all", "all", isAuthenticated, [], false, true);

  const stories = useMemo(() => storiesData?.pages.flatMap((page) => page.results) || [], [storiesData]);
  const totalCount = storiesData?.pages[0]?.pagination?.count || 0;

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm border-amber-200 text-center">
          <CardContent className="p-8">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white">
              <Zap className="h-6 w-6" />
            </span>
            <h2 className="mb-1 font-display text-lg font-bold">Quick Reads</h2>
            <p className="text-sm text-muted-foreground">
              <button type="button" onClick={openLoginModal} className="text-primary hover:underline">
                Login
              </button>{" "}
              to browse Quick Read summaries.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        {/* Decorative only — a big flickering bolt plus a couple of small
            drifting sparks, echoing the "quick/energetic" theme the way
            Explore by Country's globe/pins echo its own. */}
        <Zap className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 animate-flicker text-white/10" style={{ animationDuration: "2.5s" }} />
        <Zap className="pointer-events-none absolute bottom-5 left-[16%] h-6 w-6 animate-float text-white/25" style={{ animationDuration: "4s" }} />
        <Zap className="pointer-events-none absolute right-[26%] top-8 h-5 w-5 animate-float text-white/20" style={{ animationDelay: "1s", animationDuration: "5s" }} />

        <div className="container relative mx-auto px-3 py-8 sm:px-4 sm:py-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Zap className="h-3.5 w-3.5" />
            Quick Read
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Quick Reads</h1>
          <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">
            Short summaries for when you're short on time — every story on WorldStories with a Quick Read.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-2 text-xs sm:gap-2 sm:text-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold">{formatViews(totalCount)}</span>
            <span className="hidden text-muted-foreground sm:inline">quick reads</span>
          </div>

          <form
            className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[220px]"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch();
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search quick reads..."
                className="h-9 pl-8 text-sm"
              />
            </div>
          </form>

          <div className="w-full sm:w-auto sm:min-w-[160px]">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger type="button" className="h-9 text-sm">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="views">Most Viewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <section className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {stories.map((story) => (
            <AuthGatedLink
              key={story.id}
              to={`/quick-read/${story.slug}`}
              className="group relative z-0 block transition-transform duration-300 ease-out hover:z-20 hover:scale-105"
            >
              <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-lg shadow-md group-hover:shadow-2xl">
                <CoverImage
                  src={story.cover_image}
                  alt={story.title}
                  author={story.author}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                {story.has_audio && (
                  <div className="absolute right-2 top-2 h-5 w-5 rounded-full bg-red-600 p-1 opacity-80">
                    <Headphones className="h-3 w-3 text-white" />
                  </div>
                )}
                {story.summary_reading_minutes != null && (
                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                    <Clock3 className="h-3 w-3" />
                    <span>{story.summary_reading_minutes} min read</span>
                  </div>
                )}
              </div>

              <h3 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">
                {story.title}
              </h3>
            </AuthGatedLink>
          ))}
        </section>

        {stories.length === 0 && (
          <div className="mt-6 rounded-lg border border-border p-6 text-center text-muted-foreground">
            {searchQuery ? "No quick reads match your search." : "No quick reads available yet."}
          </div>
        )}

        <div ref={sentinelRef} className="mt-8 flex items-center justify-center py-4">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more quick reads...
            </div>
          )}
          {!hasNextPage && stories.length > 0 && (
            <p className="text-sm text-muted-foreground">You've reached the end of the quick reads.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuickReads;
