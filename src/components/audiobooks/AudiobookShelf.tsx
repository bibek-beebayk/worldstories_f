import { ArrowRight } from "lucide-react";
import type { Story } from "@/api/types";
import { AudiobookCard } from "./AudiobookCard";

export interface AudiobookShelfProps {
  title: string;
  subtitle: string;
  stories: Story[];
  progressBySlug?: Map<string, number>;
  onSeeAll: () => void;
}

export function AudiobookShelf({ title, subtitle, stories, progressBySlug, onSeeAll }: AudiobookShelfProps) {
  if (stories.length < 3) {
    return null;
  }

  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onSeeAll}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#A71B36] transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92F4C] dark:text-rose-300 dark:hover:bg-rose-950/40 sm:text-sm"
        >
          See all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        {stories.slice(0, 6).map((story) => (
          <div key={story.id} className="w-[42vw] max-w-[190px] shrink-0 snap-start md:w-auto md:max-w-none">
            <AudiobookCard story={story} progressPercent={progressBySlug?.get(story.slug)} />
          </div>
        ))}
      </div>
    </section>
  );
}
