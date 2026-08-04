import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { storyApi } from "@/api/story";
import AuthorPortrait from "@/components/AuthorPortrait";
import FullScreenLoader from "@/components/FullScreenLoader";
import Seo, { SITE_URL } from "@/components/Seo";
import StoryCard from "@/components/StoryCard";

export default function AuthorDetail() {
  const { id } = useParams();
  const authorId = Number(id);
  const { data: author, isLoading, isError } = useQuery({
    queryKey: ["author", authorId],
    queryFn: () => storyApi.getAuthor(authorId),
    enabled: Number.isInteger(authorId) && authorId > 0,
    retry: false,
  });

  if (isLoading) return <FullScreenLoader />;
  if (isError || !author) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Seo title="Author Not Found | WorldStories" description="The requested author could not be found." path={`/authors/${id || ""}`} noIndex />
        <h1 className="text-2xl font-bold">Author not found</h1>
        <Link to="/authors" className="mt-4 inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Browse all authors
        </Link>
      </div>
    );
  }

  const description = author.bio?.trim() || `Explore stories by ${author.name} on WorldStories.`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.10),transparent_38%)]">
      <Seo
        title={`${author.name} — Author | WorldStories`}
        description={description.slice(0, 160)}
        path={`/authors/${author.id}`}
        image={author.image}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: author.name,
          description,
          image: author.image || undefined,
          url: `${SITE_URL}/authors/${author.id}`,
          mainEntityOfPage: author.stories.map((story) => `${SITE_URL}/story/${story.slug}`),
        }}
      />

      <main className="container mx-auto px-4 py-6 sm:py-10">
        <Link to="/authors" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> All authors
        </Link>

        <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-50 via-card to-sky-50 shadow-sm">
          <div className="grid gap-6 p-5 sm:grid-cols-[180px_1fr] sm:items-center sm:p-8 lg:grid-cols-[220px_1fr]">
            <AuthorPortrait src={author.image} name={author.name} className="mx-auto aspect-[3/4] w-36 rounded-xl border shadow-md sm:mx-0 sm:w-full" />
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Author</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{author.name}</h1>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                {author.stories_count} {author.stories_count === 1 ? "available title" : "available titles"}
              </p>
              <div className="mx-auto mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground sm:mx-0 sm:text-base">
                {author.bio?.trim() || "No biography is available for this author yet."}
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="mb-5 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold sm:text-2xl">Books by {author.name}</h2>
          </div>
          {author.stories.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {author.stories.map((story) => <StoryCard key={story.id} {...story} />)}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No published books are available from this author.</div>
          )}
        </section>
      </main>
    </div>
  );
}
