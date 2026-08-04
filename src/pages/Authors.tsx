import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { storyApi } from "@/api/story";
import AuthorPortrait from "@/components/AuthorPortrait";
import FullScreenLoader from "@/components/FullScreenLoader";
import Seo, { SITE_URL } from "@/components/Seo";
import { Button } from "@/components/ui/button";

export default function Authors() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["authors", page],
    queryFn: () => storyApi.getAuthors(page),
    placeholderData: (previous) => previous,
  });

  if (isLoading && !data) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.09),transparent_45%)]">
      <Seo
        title="Authors — Discover Writers | WorldStories"
        description="Meet the authors behind WorldStories and explore every story available from each writer."
        path="/authors"
        structuredData={data ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Authors — WorldStories",
          url: `${SITE_URL}/authors`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: data.results.map((author, index) => ({
              "@type": "ListItem",
              position: (page - 1) * data.pagination.size + index + 1,
              url: `${SITE_URL}/authors/${author.id}`,
              name: author.name,
            })),
          },
        } : undefined}
      />

      <div className="border-b border-violet-200/60 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-sky-50">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <UsersRound className="h-3.5 w-3.5" />
            Our storytellers
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Authors</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
            Meet the voices behind the stories and discover more of their work.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 sm:py-10">
        {isError ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            Failed to load authors. Please try again.
          </div>
        ) : data?.results.length ? (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {data.results.map((author) => (
                <Link key={author.id} to={`/authors/${author.id}`} className="group min-w-0">
                  <AuthorPortrait
                    src={author.image}
                    name={author.name}
                    className="aspect-[3/4] rounded-xl border shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg"
                    imageClassName="transition-transform duration-300 group-hover:scale-105"
                  />
                  <h2 className="mt-3 line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary sm:text-base">
                    {author.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    {author.stories_count} {author.stories_count === 1 ? "title" : "titles"}
                  </p>
                </Link>
              ))}
            </div>

            {data.pagination.pages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Author pages">
                <Button variant="outline" size="sm" disabled={!data.pagination.previous} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {data.pagination.page} of {data.pagination.pages}</span>
                <Button variant="outline" size="sm" disabled={!data.pagination.next} onClick={() => setPage((value) => value + 1)}>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </nav>
            )}
          </>
        ) : (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No authors are available yet.</div>
        )}
      </main>
    </div>
  );
}
