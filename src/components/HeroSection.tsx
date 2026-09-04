import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, Globe2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import type { DailyStory, FeaturedStory } from "@/api/types";
import { formatViews } from "@/lib/utils";
import { getCountryLabel } from "@/lib/countries";
import { formatReadingMinutes } from "@/lib/readingTime";
import { markDailyStoryStarted, trackAnalyticsEvent } from "@/lib/analytics";
import CoverImage from "@/components/CoverImage";

interface HeroSectionProps {
  featuredStories?: FeaturedStory[];
  dailyStory?: DailyStory | null;
}

const AUTOPLAY_INTERVAL = 6000;

const HeroSection = ({ featuredStories = [], dailyStory }: HeroSectionProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const configuredDaily = dailyStory?.configured ? dailyStory : null;
  const displayStories = useMemo(
    () => configuredDaily ? [configuredDaily.story] : featuredStories,
    [configuredDaily, featuredStories]
  );
  const hasStories = displayStories.length > 0;
  const story = hasStories ? displayStories[activeIndex] : undefined;
  const countryLabel = story?.country ? getCountryLabel(story.country) : null;
  const readingTime = formatReadingMinutes(story?.reading_time_minutes);

  const goTo = useCallback(
    (index: number) => {
      if (!hasStories) return;
      const total = displayStories.length;
      setActiveIndex(((index % total) + total) % total);
    },
    [displayStories.length, hasStories]
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
    if (!hasStories || displayStories.length < 2 || isPaused) return;
    const timer = window.setInterval(goNext, AUTOPLAY_INTERVAL);
    return () => window.clearInterval(timer);
  }, [hasStories, displayStories.length, isPaused, goNext]);

  useEffect(() => {
    if (activeIndex >= displayStories.length) setActiveIndex(0);
  }, [displayStories.length, activeIndex]);

  useEffect(() => {
    if (displayStories.length < 2) return;
    const nextStory = displayStories[(activeIndex + 1) % displayStories.length];
    if (!nextStory?.cover_image) return;
    const preloadImage = new Image();
    preloadImage.src = nextStory.cover_image;
  }, [activeIndex, displayStories]);

  useEffect(() => {
    if (!configuredDaily) return;
    trackAnalyticsEvent({
      event_type: "daily_story_viewed",
      story_slug: configuredDaily.story.slug,
      metadata: { date: configuredDaily.date },
    });
  }, [configuredDaily]);

  const trackDailyStart = (action: "read_story" | "quick_read") => {
    if (!configuredDaily) return;
    markDailyStoryStarted(configuredDaily.story.slug, configuredDaily.date, action);
  };

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
        onTouchStart={hasStories && displayStories.length > 1 ? handleTouchStart : undefined}
        onTouchEnd={hasStories && displayStories.length > 1 ? handleTouchEnd : undefined}
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
                {configuredDaily ? "Daily Story" : "Featured Story"}
              </span>
              {hasStories && displayStories.length > 1 && (
                <span className="text-xs font-medium tabular-nums text-white/50">
                  {String(activeIndex + 1).padStart(2, "0")} / {String(displayStories.length).padStart(2, "0")}
                </span>
              )}
            </div>

            <p className="hidden text-sm font-medium uppercase tracking-wide text-white/60 lg:block">
              WorldStories — read and publish free stories, novels, poetry, and audiobooks from writers around the world.
            </p>

            <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {story?.title || "Welcome to WorldStories!"}
            </h1>

            {configuredDaily && (
              <>
                {configuredDaily.featured_reason && (
                  <p className="text-sm font-medium text-white/90">{configuredDaily.featured_reason}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/75 sm:text-sm">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Today</span>
                  {countryLabel && <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> {countryLabel}</span>}
                  {readingTime && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {readingTime}</span>}
                </div>
              </>
            )}

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

            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="px-7 text-sm md:text-base" asChild>
                <Link to={story ? `/story/${story.slug}` : "/library"} onClick={() => trackDailyStart("read_story")}>
                  {story ? (configuredDaily ? "Read Story" : "Read Featured Story") : "Explore"}
                </Link>
              </Button>
              {configuredDaily && story?.summary_reading_minutes && (
                <Button size="lg" variant="outline" className="border-white/40 bg-white/10 px-7 text-sm text-white hover:bg-white/20 hover:text-white md:text-base" asChild>
                  <Link to={`/quick-read/${story.slug}`} onClick={() => trackDailyStart("quick_read")}>Quick Read</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="relative mx-auto hidden w-fit max-w-md lg:block">
            {story ? (
              <CoverImage
                key={`desktop-cover-${story.id}`}
                src={story.cover_image}
                alt={story.title}
                author={story.author}
                loading="eager"
                decoding="async"
                fetchpriority="high"
                className="mx-auto h-[440px] w-auto max-w-full animate-in fade-in-0 rounded-2xl object-contain duration-500 xl:h-[480px]"
              />
            ) : (
              <div className="flex h-[440px] w-64 items-center justify-center rounded-2xl bg-white/5 xl:h-[480px]">
                <BookOpen className="h-16 w-16 text-white/30" />
              </div>
            )}

            {hasStories && displayStories.length > 1 && (
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
                  {displayStories.map((featuredStory, index) => (
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

        {hasStories && displayStories.length > 1 && (
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
              {displayStories.map((s, index) => (
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
