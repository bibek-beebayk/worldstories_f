import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Tag as TagIcon } from "lucide-react";
import { data, Link, useParams } from "react-router";
import { storyApi } from "@/api/story";
import FullScreenLoader from "@/components/FullScreenLoader";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import StoryCard from "@/components/StoryCard";
import type { Route } from "./+types/TagDetail";

// Fetched here purely to supply meta() with real data server-side — mirrors
// AuthorDetail.tsx; the component below still fetches independently via
// useQuery, seeded with this as initialData.
export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug;
  if (!slug) {
    return data(null, { status: 404 });
  }
  try {
    return await storyApi.getTag(slug);
  } catch {
    return data(null, { status: 404 });
  }
}

export function meta({ data: tag, params }: Route.MetaArgs) {
  if (!tag) {
    return buildMeta({
      title: "Tag Not Found | WorldStories",
      description: "The requested tag could not be found.",
      path: `/tag/${params.slug || ""}`,
      noIndex: true,
    });
  }

  const description =
    tag.description?.trim() || `Browse ${tag.name} stories on WorldStories.`;

  return buildMeta({
    title: `${tag.name} — WorldStories`,
    description: description.slice(0, 160),
    path: `/tag/${tag.slug}`,
    // Thin collections stay reachable but out of the index until they hold a
    // real set of stories (matches the sitemap threshold in core/urls.py).
    noIndex: (tag.stories_count ?? 0) < 10,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: tag.name,
      description,
      url: `${SITE_URL}/tag/${tag.slug}`,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: tag.stories.map((story, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/story/${story.slug}`,
        })),
      },
    },
  });
}

export default function TagDetail({ loaderData }: Route.ComponentProps) {
  const { slug } = useParams();
  const { data: tag, isLoading, isError } = useQuery({
    queryKey: ["tag", slug],
    queryFn: () => storyApi.getTag(slug as string),
    enabled: Boolean(slug),
    retry: false,
    initialData: loaderData || undefined,
  });

  if (isLoading) return <FullScreenLoader />;
  if (isError || !tag) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Tag not found</h1>
        <Link to="/library" className="mt-4 inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Browse the library
        </Link>
      </div>
    );
  }

  const description = tag.description?.trim() || `Browse ${tag.name} stories on WorldStories.`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.10),transparent_38%)]">
      <main className="container mx-auto px-4 py-6 sm:py-10">
        <Link to="/library" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>

        <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-50 via-card to-sky-50 p-5 shadow-sm sm:p-8">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <TagIcon className="h-3.5 w-3.5" /> Tag
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{tag.name}</h1>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            {tag.stories_count} {tag.stories_count === 1 ? "story" : "stories"}
          </p>
          <div className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground sm:mx-0 sm:text-base">
            {description}
          </div>
        </section>

        <section className="py-10">
          {tag.stories.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {tag.stories.map((story) => <StoryCard key={story.id} {...story} />)}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No published stories are tagged with {tag.name} yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}
