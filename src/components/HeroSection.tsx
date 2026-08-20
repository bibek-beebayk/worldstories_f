import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import { FeaturedStory } from "@/api/types";
import { formatViews } from "@/lib/utils";
import CoverImage from "@/components/CoverImage";

interface HeroSectionProps {
  featuredStories?: FeaturedStory[];
}

const AUTOPLAY_INTERVAL = 6000;

const HeroSection = ({ featuredStories = [] }: HeroSectionProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const hasStories = featuredStories.length > 0;
  const story = hasStories ? featuredStories[activeIndex] : undefined;

  const goTo = useCallback(
    (index: number) => {
      if (!hasStories) return;
      const total = featuredStories.length;
      setActiveIndex(((index % total) + total) % total);
    },
    [featuredStories.length, hasStories]
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 40;

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX < 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  useEffect(() => {
    if (!hasStories || featuredStories.length < 2 || isPaused) return;
    const timer = window.setInterval(goNext, AUTOPLAY_INTERVAL);
    return () => window.clearInterval(timer);
  }, [hasStories, featuredStories.length, isPaused, goNext]);

  useEffect(() => {
    if (activeIndex >= featuredStories.length) setActiveIndex(0);
  }, [featuredStories.length, activeIndex]);

  useEffect(() => {
    if (featuredStories.length < 2) return;
    const nextStory = featuredStories[(activeIndex + 1) % featuredStories.length];
    if (!nextStory?.cover_image) return;
    const preloadImage = new Image();
    preloadImage.src = nextStory.cover_image;
  }, [activeIndex, featuredStories]);

  return (
    <>
      {/* Always-visible, load-state-independent statement of what WorldStories
          is, kept in its own minimal strip so the site's purpose is never
          fully dependent on which story happens to be featured below. */}
      <div className="bg-hero-dark px-4 py-1.5 text-center lg:hidden">
        <p className="text-[10px] font-medium uppercase tracking-wide text-white/60 sm:text-xs">
          WorldStories — read and publish free stories, novels, poetry, and audiobooks from writers around the world.
        </p>
      </div>

      <section
        className="relative isolate overflow-hidden bg-gradient-to-br from-hero-gradient-start via-hero-dark to-hero-gradient-end"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={hasStories && featuredStories.length > 1 ? handleTouchStart : undefined}
        onTouchEnd={hasStories && featuredStories.length > 1 ? handleTouchEnd : undefined}
      >
        {/* Background: the featured story's cover image, full-bleed */}
        <div className="absolute inset-0 lg:hidden">
          {story ? (
            <CoverImage
              key={story.id}
              src={story.cover_image}
              alt=""
              title={story.title}
              author={story.author}
              loading="eager"
              decoding="async"
              fetchpriority="high"
              className="h-full w-full animate-in fade-in-0 object-cover duration-700"
            />
          ) : (
            <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          )}
          {/* Dark overlay — layered vertical + horizontal gradients so the
              overlaid text stays legible no matter how light or busy the
              underlying cover image is. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
        </div>

        <div className="relative z-10 container flex min-h-[440px] items-end px-4 py-10 sm:min-h-[480px] md:min-h-[560px] md:py-14 lg:grid lg:min-h-0 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6 lg:py-12">
          <div key={`text-${story?.id ?? "empty"}`} className="max-w-2xl animate-in fade-in-0 space-y-4 duration-500">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/90">
                Featured Story
              </span>
              {hasStories && featuredStories.length > 1 && (
                <span className="text-xs font-medium tabular-nums text-white/50">
                  {String(activeIndex + 1).padStart(2, "0")} / {String(featuredStories.length).padStart(2, "0")}
                </span>
              )}
            </div>

            <p className="hidden text-sm font-medium uppercase tracking-wide text-white/60 lg:block">
              WorldStories — read and publish free stories, novels, poetry, and audiobooks from writers around the world.
            </p>

            <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {story?.title || "Welcome to WorldStories!"}
            </h1>

            {hasStories && (story?.genres?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {story!.genres!.map((genre) => (
                  <Badge
                    key={genre}
                    className="border-0 bg-white/10 text-xs font-normal text-white/85 hover:bg-white/15"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            <p className="max-w-2xl text-sm text-white/85 md:text-base line-clamp-2">
              {story?.about ||
                (story
                  ? "Featured this week. Dive into one of our most-read stories."
                  : "WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres.")}
            </p>

            {hasStories && (
              <div className="flex items-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{story!.rating}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{formatViews(story!.views)} reads</span>
                </div>
              </div>
            )}

            <Button size="lg" className="px-7 text-sm md:text-base" asChild>
              <Link to={story ? `/story/${story.slug}` : "/library"}>
                {story ? "Read Featured Story" : "Explore"}
              </Link>
            </Button>
          </div>

          <div className="relative mx-auto hidden w-full max-w-md lg:block">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              {story ? (
                <CoverImage
                  key={`desktop-cover-${story.id}`}
                  src={story.cover_image}
                  alt={story.title}
                  author={story.author}
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  className="h-full w-full animate-in fade-in-0 object-cover duration-500"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                  <BookOpen className="h-16 w-16 text-white/30" />
                </div>
              )}
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 rounded-lg bg-black/45 px-3 py-2 backdrop-blur-sm">
                <p className="line-clamp-1 text-sm font-medium text-white">
                  {story?.title || "Welcome to WorldStories!"}
                </p>
              </div>
            </div>

            {hasStories && featuredStories.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous featured story"
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next featured story"
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="mt-4 flex items-center justify-center gap-2">
                  {featuredStories.map((featuredStory, index) => (
                    <button
                      key={featuredStory.id}
                      type="button"
                      onClick={() => goTo(index)}
                      aria-label={`Go to featured story ${index + 1}`}
                      aria-current={index === activeIndex}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {!story?.cover_image && !hasStories && (
          <div className="pointer-events-none absolute right-10 top-10 z-[5] hidden md:block lg:hidden">
            <BookOpen className="h-24 w-24 text-white/10" />
          </div>
        )}

        {hasStories && featuredStories.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous featured story"
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70 sm:left-5 lg:hidden"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next featured story"
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70 sm:right-5 lg:hidden"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 lg:hidden">
              {featuredStories.map((s, index) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Go to featured story ${index + 1}`}
                  aria-current={index === activeIndex}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default HeroSection;
