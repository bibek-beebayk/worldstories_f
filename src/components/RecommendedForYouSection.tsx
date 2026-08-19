import { Story } from "@/api/types";
import StoryCard from "@/components/StoryCard";
import { Wand2 } from "lucide-react";

interface RecommendedForYouSectionProps {
  stories: Story[];
  isLoading: boolean;
  isError: boolean;
}

const RecommendedForYouSection = ({ stories, isLoading, isError }: RecommendedForYouSectionProps) => {
  if (isError) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:rounded-2xl sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5 sm:gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Wand2 className="h-3.5 w-3.5" />
            <span>Recommended for You</span>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Based on the genres you picked when you joined.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border border-border/60 bg-background/70 p-3">
              <div className="mb-3 aspect-[3/4] rounded-lg bg-muted" />
              <div className="mb-2 h-3 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {stories.map((story) => (
            <StoryCard key={story.id} {...story} compact />
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendedForYouSection;
