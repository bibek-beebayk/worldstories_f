import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FeaturedStory } from "@/api/types";
import { formatViews } from "@/lib/utils";

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
    <section
      className="relative overflow-hidden bg-gradient-to-br from-hero-gradient-start via-hero-dark to-hero-gradient-end"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="container px-4 py-10 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div key={`text-${story?.id ?? "empty"}`} className="animate-in fade-in-0 duration-500 space-y-4">
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
              <Link to={story ? `/story/${story.slug}/` : "/catalogue"}>
                {story ? "Read Featured Story" : "Explore"}
              </Link>
            </Button>
          </div>

          <div className="relative hidden md:block">
            <div className="relative mx-auto aspect-[16/10] max-w-md overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <img
                key={story?.id ?? "empty"}
                src={
                  story?.cover_image ||
                  "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600&h=800&fit=crop"
                }
                alt={story?.title || "Featured Story"}
                loading="eager"
                decoding="async"
                fetchpriority="high"
                className="h-full w-full animate-in fade-in-0 object-cover duration-500"
              />
              <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg bg-black/45 px-3 py-2 backdrop-blur-sm">
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
