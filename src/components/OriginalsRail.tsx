import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import StoryCard from "@/components/StoryCard";
import { useOriginals } from "@/hooks/useOriginals";
import type { Story } from "@/api/types";

interface OriginalsRailProps {
  /** Supply the stories directly (e.g. from the home payload) to skip the fetch. */
  stories?: Story[];
  className?: string;
}

/**
 * The distinct deep-indigo "WorldStories Originals" band, featured at the top of
 * the homepage, library and discover pages. Renders nothing until there is at
 * least one flagged story.
 */
export function OriginalsRail({ stories, className }: OriginalsRailProps) {
  const query = useOriginals({ enabled: !stories });
  const list = stories ?? query.data?.results ?? [];

  if (list.length === 0) return null;

  return (
    <section
      className={`rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-card to-blue-50 p-4 sm:p-6 ${className ?? ""}`}
      aria-labelledby="originals-rail-heading"
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
            <Sparkles className="h-3.5 w-3.5" /> WorldStories Originals
          </p>
          <p id="originals-rail-heading" className="text-xs text-muted-foreground sm:text-sm">
            Exclusive stories published in-house for the WorldStories community.
          </p>
        </div>
        <Link
          to="/originals"
          className="mb-1 flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 hover:underline sm:text-sm"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <Carousel opts={{ align: "start", loop: list.length > 4 }} className="w-full">
        <CarouselContent className="-ml-3">
          {list.map((story) => (
            <CarouselItem
              key={story.id}
              className="basis-1/2 pl-3 sm:basis-1/3 md:basis-1/4 lg:basis-1/6"
            >
              <StoryCard {...story} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 hidden sm:flex" />
        <CarouselNext className="right-2 hidden sm:flex" />
      </Carousel>
    </section>
  );
}
