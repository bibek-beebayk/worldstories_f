import { useEffect, useMemo, useState, type RefObject } from "react";
import { Check } from "lucide-react";
import { Link } from "react-router";
import type { PassportCountryDetail } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import StoryCard from "@/components/StoryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pluralStories, sortByShortest } from "@/lib/passport";

export default function CountryDetail({
  detail,
  loading,
  onClose,
  panelRef,
  headingRef,
}: {
  detail: PassportCountryDetail | undefined;
  loading: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement>;
  headingRef: RefObject<HTMLHeadingElement>;
}) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => setShowAll(false), [detail?.code]);

  const remaining = useMemo(() => sortByShortest(detail?.continue_exploring || []), [detail?.continue_exploring]);
  const visibleRemaining = showAll ? remaining : remaining.slice(0, 6);

  return (
    <section
      ref={panelRef}
      className="mt-8 scroll-mt-24 rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
      id="country-detail"
    >
      {loading && !detail ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading…
        </p>
      ) : detail ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-primary/10 px-2 text-sm font-bold text-primary">
                  {detail.code}
                </span>
                <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none sm:text-2xl">
                  {detail.name}
                </h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {pluralStories(detail.stories_completed)} completed ·{" "}
                {Math.max(0, detail.stories_available - detail.stories_completed)} left to read
              </p>
              <div className="mt-3 h-1.5 max-w-xl overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${detail.stories_available > 0 ? Math.min(100, (detail.stories_completed / detail.stories_available) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={onClose}>
              Close
            </Button>
          </div>

          {detail.completed.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-base font-semibold">Completed</h3>
              <div className="divide-y rounded-xl border">
                {detail.completed.map((story) => (
                  <div key={story.id} className="flex items-center gap-3 p-3">
                    <Link
                      to={`/story/${story.slug}`}
                      className="h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-muted"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      <CoverImage
                        src={story.cover_image}
                        alt=""
                        title={story.title}
                        author={story.author}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/story/${story.slug}`} className="line-clamp-2 font-medium hover:text-primary">
                        {story.title}
                      </Link>
                      {story.author && <p className="mt-0.5 truncate text-sm text-muted-foreground">{story.author}</p>}
                    </div>
                    <Badge className="shrink-0 gap-1">
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Finished
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {remaining.length > 0 && (
            <div className="mt-7">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold">Continue exploring {detail.name}</h3>
                <span className="text-sm text-muted-foreground">Shortest first</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {visibleRemaining.map((story) => (
                  <StoryCard key={story.id} {...story} compact />
                ))}
              </div>
              {remaining.length > 6 && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 min-h-11"
                  onClick={() => setShowAll((current) => !current)}
                >
                  {showAll ? "Show fewer" : `Show all ${remaining.length} stories`}
                </Button>
              )}
            </div>
          )}

          {detail.stories_available === detail.stories_completed && (
            <p className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <span className="font-medium">You have read everything we have from {detail.name}.</span>{" "}
              <Link to="/story-map" className="text-primary hover:underline">
                Find somewhere new on the Story Map
              </Link>
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
