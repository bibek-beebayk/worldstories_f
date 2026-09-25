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
    <section>
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
          <Wand2 className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
          Recommended for You
        </h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border border-border/60 bg-background/70 p-2">
              <div className="mb-2 aspect-[4/5] rounded-lg bg-muted" />
              <div className="mb-1.5 h-2.5 rounded bg-muted" />
              <div className="h-2.5 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
          {stories.map((story) => (
            <StoryCard key={story.id} {...story} compact />
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendedForYouSection;
