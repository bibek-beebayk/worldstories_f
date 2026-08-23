import { Story } from "@/api/types";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Clock3, Headphones, Wand2 } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import { Link } from "react-router";

interface RecommendedQuickReadsSectionProps {
  stories: Story[];
}

// Personalized Quick Read picks, shown at the end of a Quick Read page —
// same carousel-of-cards shape as the homepage's QuickReadSection, but
// driven by recommend_stories_for(require_summary=True) instead of "any
// story with a summary", and excludes the story currently being viewed.
// Renders nothing at all (not an empty state) when there's no personalized
// signal yet — matches QuickReadSection's own "don't nag" convention.
const RecommendedQuickReadsSection = ({ stories }: RecommendedQuickReadsSectionProps) => {
  if (stories.length === 0) return null;

  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Wand2 className="h-3.5 w-3.5" />
            <span>Recommended Quick Reads</span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Picked for you, based on your interests and reading habits.
          </p>
        </div>
      </div>

      <Carousel opts={{ align: "start" }} className="px-1">
        <CarouselContent>
          {stories.map((story) => (
            <CarouselItem key={story.id} className="basis-[170px] sm:basis-[185px]">
              <article className="h-full rounded-lg border border-border/70 bg-background/70 p-3">
                <Link to={`/quick-read/${story.slug}`} className="group block w-full text-left">
                  <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-muted shadow-sm">
                    <CoverImage
                      src={story.cover_image}
                      alt={story.title}
                      author={story.author}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {story.has_audio && (
                      <div className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-[3px] opacity-80">
                        <Headphones className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                </Link>

                <div className="space-y-2">
                  <Link to={`/quick-read/${story.slug}`} className="group/title block w-full text-left">
                    <h3 className="line-clamp-2 text-xs font-semibold transition-colors group-hover/title:text-primary">
                      {story.title}
                    </h3>
                  </Link>
                  {story.author && (
                    <p className="line-clamp-1 text-[11px] text-muted-foreground">by {story.author}</p>
                  )}
                  {story.summary_reading_minutes != null && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      <span>{story.summary_reading_minutes} min read</span>
                    </div>
                  )}
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
};

export default RecommendedQuickReadsSection;
