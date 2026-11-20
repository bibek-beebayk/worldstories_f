import { Sparkles } from "lucide-react";
import type { Story } from "@/api/types";
import StoryCard from "@/components/StoryCard";

interface SimilarTitlesProps {
  stories: Story[];
  linkTo: (story: Story) => string;
  title?: string;
  description?: string;
}

const SimilarTitles = ({
  stories,
  linkTo,
  title = "Similar Titles",
  description = "More stories selected from shared genres and related story traits.",
}: SimilarTitlesProps) => {
  if (stories.length === 0) return null;

  return (
    <section className="mt-12 border-t pt-8" aria-labelledby="similar-titles-heading">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 id="similar-titles-heading" className="text-xl font-bold sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {stories.map((story) => (
          <StoryCard key={story.id} {...story} linkTo={linkTo(story)} />
        ))}
      </div>
    </section>
  );
};

export default SimilarTitles;
