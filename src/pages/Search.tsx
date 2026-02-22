import FullScreenLoader from "@/components/FullScreenLoader";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { useSearchStories } from "@/hooks/useSearchStories";
import { useSearchParams } from "react-router-dom";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const sort = (searchParams.get("sort") || "popular").toLowerCase();

  const { data, isLoading, isError } = useSearchStories(q, page, sort);

  const setParam = (next: { page?: number; sort?: string; q?: string }) => {
    const params = new URLSearchParams(searchParams);
    if (next.q !== undefined) params.set("q", next.q);
    if (next.sort !== undefined) params.set("sort", next.sort);
    if (next.page !== undefined) params.set("page", String(next.page));
    setSearchParams(params);
  };

  if (!q) {
    return <div className="container mx-auto px-4 py-8">Enter a keyword to search stories.</div>;
  }

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <div className="container mx-auto px-4 py-8">Failed to load search results.</div>;

  const results = data?.results || [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Search Results</h1>
            <p className="text-muted-foreground">
              {pagination?.count || 0} result(s) for &quot;{q}&quot;
            </p>
          </div>
          <div className="w-full md:w-56">
            <label className="mb-1 block text-sm font-medium">Sort</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={sort}
              onChange={(e) => setParam({ sort: e.target.value, page: 1 })}
            >
              <option value="popular">Most Popular</option>
              <option value="recent">Most Recent</option>
              <option value="rating">Highest Rated</option>
              <option value="views">Most Viewed</option>
            </select>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            No stories found for this query.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {results.map((story) => (
                <StoryCard key={story.id} {...story} />
              ))}
            </div>

            {pagination && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setParam({ page: page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  disabled={page >= pagination.pages}
                  onClick={() => setParam({ page: page + 1 })}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Search;
