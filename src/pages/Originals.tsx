import { useEffect, useRef } from "react";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { storyApi } from "@/api/story";
import StoryCard from "@/components/StoryCard";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useInfiniteOriginals } from "@/hooks/useInfiniteOriginals";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import type { Route } from "./+types/Originals";

export async function loader() {
  try {
    return await storyApi.getOriginals(1);
  } catch {
    return undefined;
  }
}

export function meta({ data }: Route.MetaArgs) {
  const stories = data?.results ?? [];
  const description =
    "Discover exclusive stories published in-house by WorldStories and created for readers around the world.";
  return buildMeta({
    title: "WorldStories Originals | WorldStories",
    description,
    path: "/originals",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "WorldStories Originals",
      description,
      url: `${SITE_URL}/originals`,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: stories.map((story, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/story/${story.slug}`,
        })),
      },
    },
  });
}

export default function Originals() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteOriginals();
  const stories = data?.pages.flatMap((page) => page.results) ?? [];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.10),transparent_40%)]">
      <main className="container mx-auto px-4 py-6 sm:py-10">
        <Link to="/library" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>

        <section className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-card to-blue-50 p-5 shadow-sm sm:p-8">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
            <Sparkles className="h-3.5 w-3.5" /> WorldStories Originals
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Stories made by WorldStories</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Explore exclusive stories published in-house and created especially for the WorldStories community.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700">
            <BookOpen className="h-4 w-4" /> {data?.pages[0]?.pagination.count ?? stories.length} originals
          </p>
        </section>

        <section className="py-10">
          {isError ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">We couldn't load WorldStories Originals. Please try again.</div>
          ) : stories.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {stories.map((story) => <StoryCard key={story.id} {...story} />)}
              </div>
              <div ref={sentinelRef} className="flex h-20 items-center justify-center">
                {isFetchingNextPage && <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />}
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No WorldStories Originals have been published yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}
