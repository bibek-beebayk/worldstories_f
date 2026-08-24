import { BookOpen, FileText, UsersRound } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import AuthorPortrait from "@/components/AuthorPortrait";
import CoverImage from "@/components/CoverImage";
import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { useSearchStories } from "@/hooks/useSearchStories";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { buildMeta } from "@/lib/buildMeta";

export function meta() {
  return buildMeta({
    title: "Search | WorldStories",
    description: "Search titles, authors, and chapters on WorldStories.",
    path: "/search",
    noIndex: true,
  });
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const authorPage = Math.max(1, parseInt(searchParams.get("author_page") || "1", 10) || 1);
  const chapterPage = Math.max(1, parseInt(searchParams.get("chapter_page") || "1", 10) || 1);
  const sort = (searchParams.get("sort") || "popular").toLowerCase();
  const language = (searchParams.get("language") || "all").toLowerCase();

  const { data, isLoading, isError } = useSearchStories(q, page, sort, language, authorPage, chapterPage);

  const setParam = (next: {
    page?: number;
    authorPage?: number;
    chapterPage?: number;
    sort?: string;
    q?: string;
    language?: string;
  }) => {
    const params = new URLSearchParams(searchParams);
    if (next.q !== undefined) params.set("q", next.q);
    if (next.sort !== undefined) params.set("sort", next.sort);
    if (next.language !== undefined) params.set("language", next.language);
    if (next.page !== undefined) params.set("page", String(next.page));
    if (next.authorPage !== undefined) params.set("author_page", String(next.authorPage));
    if (next.chapterPage !== undefined) params.set("chapter_page", String(next.chapterPage));
    setSearchParams(params);
  };

  if (!q) {
    return (
      <div className="container mx-auto px-4 py-8">Enter a name or keyword to search titles, authors, and chapters.</div>
    );
  }

  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) {
    return (
      <div className="container mx-auto px-4 py-8">Failed to load search results.</div>
    );
  }

  const titles = data.titles.results;
  const authors = data.authors.results;
  const chapters = data.chapters.results;
  const totalResults =
    data.titles.pagination.count + data.authors.pagination.count + data.chapters.pagination.count;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.07),transparent_38%)]">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Search Results</h1>
          <p className="mt-1 text-muted-foreground">
            {totalResults} {totalResults === 1 ? "result" : "results"} for &quot;{q}&quot;
          </p>
        </div>

        {totalResults === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
            No matching titles, authors, or chapters were found.
          </div>
        ) : (
          <div className="space-y-12">
            <section aria-labelledby="author-results-heading">
              <div className="mb-5 flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-primary" />
                <h2 id="author-results-heading" className="text-xl font-bold sm:text-2xl">Authors</h2>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {data.authors.pagination.count}
                </span>
              </div>

              {authors.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {authors.map((author) => (
                      <Link
                        key={author.id}
                        to={`/authors/${author.id}`}
                        className="group flex items-center gap-4 rounded-xl border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        <AuthorPortrait src={author.image} name={author.name} className="h-24 w-20 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 font-semibold transition-colors group-hover:text-primary">{author.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {author.stories_count} {author.stories_count === 1 ? "available title" : "available titles"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {data.authors.pagination.pages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <Button variant="outline" disabled={authorPage <= 1} onClick={() => setParam({ authorPage: authorPage - 1 })}>
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {data.authors.pagination.page} of {data.authors.pagination.pages}
                      </span>
                      <Button disabled={authorPage >= data.authors.pagination.pages} onClick={() => setParam({ authorPage: authorPage + 1 })}>
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No authors matched this search.</div>
              )}
            </section>

            <section className="border-t pt-9" aria-labelledby="title-results-heading">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 id="title-results-heading" className="text-xl font-bold sm:text-2xl">Titles</h2>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {data.titles.pagination.count}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="w-full sm:w-52">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort titles</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={sort}
                      onChange={(event) => setParam({ sort: event.target.value, page: 1 })}
                    >
                      <option value="popular">Most Popular</option>
                      <option value="recent">Most Recent</option>
                      <option value="rating">Highest Rated</option>
                      <option value="views">Most Viewed</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-52">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Title language</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={language}
                      onChange={(event) => setParam({ language: event.target.value, page: 1 })}
                    >
                      <option value="all">All Languages</option>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {titles.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {titles.map((story) => <StoryCard key={story.id} {...story} />)}
                  </div>

                  {data.titles.pagination.pages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-3">
                      <Button variant="outline" disabled={page <= 1} onClick={() => setParam({ page: page - 1 })}>
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {data.titles.pagination.page} of {data.titles.pagination.pages}
                      </span>
                      <Button disabled={page >= data.titles.pagination.pages} onClick={() => setParam({ page: page + 1 })}>
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No titles matched this search.</div>
              )}
            </section>

            <section className="border-t pt-9" aria-labelledby="chapter-results-heading">
              <div className="mb-5 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 id="chapter-results-heading" className="text-xl font-bold sm:text-2xl">Chapters</h2>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {data.chapters.pagination.count}
                </span>
              </div>

              {chapters.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {chapters.map((chapter) => (
                      <Link
                        key={`${chapter.story_slug}-${chapter.chapter_slug}`}
                        to={`/read/${chapter.story_slug}/${chapter.chapter_slug}`}
                        className="group flex items-center gap-4 rounded-xl border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        <CoverImage
                          src={chapter.story_cover_image}
                          alt={chapter.story_title}
                          className="h-20 w-16 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold transition-colors group-hover:text-primary">
                            {chapter.chapter_title}
                          </h3>
                          <p className="text-xs text-muted-foreground">{chapter.story_title}</p>
                          {chapter.excerpt && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{chapter.excerpt}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {data.chapters.pagination.pages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        disabled={chapterPage <= 1}
                        onClick={() => setParam({ chapterPage: chapterPage - 1 })}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {data.chapters.pagination.page} of {data.chapters.pagination.pages}
                      </span>
                      <Button
                        disabled={chapterPage >= data.chapters.pagination.pages}
                        onClick={() => setParam({ chapterPage: chapterPage + 1 })}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No chapters matched this search.</div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
