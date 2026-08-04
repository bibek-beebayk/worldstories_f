import { Link } from "react-router-dom";
import AdSpace from "@/components/AdSpace";
import FullScreenLoader from "@/components/FullScreenLoader";
import { useDiscoverData } from "@/hooks/useDiscoverData";
import { formatRelativeDate, formatViews } from "@/lib/utils";
import { Compass, Eye, Gem, Sparkles, Star, Tag } from "lucide-react";
import Seo, { SITE_URL } from "@/components/Seo";
import CoverImage from "@/components/CoverImage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const Discover = () => {
  const { data, isLoading, isError } = useDiscoverData();

  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load discover content.</div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_50%),linear-gradient(to_bottom,#f8fafc,transparent_280px)]">
      <Seo
        title="Discover — New Releases & Hidden Gems | WorldStories"
        description="Find new releases, hidden gems, and stories matched to your taste. Browse by genre and discover your next favorite read on WorldStories."
        path="/discover"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Discover — WorldStories",
          url: `${SITE_URL}/discover`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: data.new_releases.slice(0, 20).map((story, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${SITE_URL}/story/${story.slug}`,
              name: story.title,
            })),
          },
        }}
      />
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-6 rounded-2xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 p-5 sm:p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
            <Compass className="h-3.5 w-3.5" />
            Discover
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Discover</h1>
          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            Browse by genre, catch what's fresh, and dig up stories most readers miss.
          </p>
        </div>

        {/* Genre browsing — the primary entry point into this page. Clicking a genre hands
            off to the Library's full filtering experience rather than duplicating it here. */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Browse by Genre</h2>
          </div>
          <Carousel opts={{ align: "start" }} className="px-1">
            <CarouselContent>
              {data.genres.map((genre) => (
                <CarouselItem key={genre.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                  <Link
                    to={`/library?genre=${genre.id}`}
                    className="group flex min-h-28 h-full flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Sparkles className="h-4 w-4 text-primary/70 transition-colors group-hover:text-primary" />
                    <div className="mt-3">
                      <p className="text-sm font-semibold leading-tight">{genre.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatViews(genre.stories_count)} {genre.stories_count === 1 ? "story" : "stories"}
                      </p>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        {/* New Releases — a horizontal shelf emphasizing recency, not another grid-in-a-box. */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">New Releases</h2>
          </div>
          <Carousel opts={{ align: "start" }} className="px-1">
            <CarouselContent>
              {data.new_releases.map((story) => (
                <CarouselItem key={story.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                  <Link to={`/story/${story.slug}`} className="group block">
                    <div className="relative mb-2 aspect-[3/4] overflow-hidden rounded-lg bg-muted shadow-sm">
                      <CoverImage
                        src={story.cover_image}
                        alt={story.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {story.site_published_date && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                          {formatRelativeDate(story.site_published_date)}
                        </span>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-xs font-semibold transition-colors group-hover:text-primary sm:text-sm">
                      {story.title}
                    </h3>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>

        <AdSpace size="banner" className="mb-8" />

        {/* Hidden Gems — a list, not a grid, so the rating (the whole point of this section)
            reads as the headline rather than competing visually with cover art. */}
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Gem className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold sm:text-xl">Hidden Gems</h2>
            <span className="text-xs text-muted-foreground">Highly rated, quietly read</span>
          </div>
          <div className="space-y-2">
            {data.hidden_gems.map((story) => (
              <Link
                key={story.id}
                to={`/story/${story.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/50 sm:gap-4"
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:h-20 sm:w-14">
                  <CoverImage
                    src={story.cover_image}
                    alt={story.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary sm:text-base">
                    {story.title}
                  </h3>
                  {(story.genres?.length ?? 0) > 0 && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{story.genres!.join(" · ")}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                  <div className="flex items-center gap-1 font-semibold text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {story.rating.toFixed(1)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {formatViews(story.views)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Discover;
