import { ArrowRight } from "lucide-react";
import type { Story } from "@/api/types";
import { QuickReadCard } from "./QuickReadCard";

export interface QuickReadShelfProps {
  title: string;
  subtitle: string;
  stories: Story[];
  onSeeAll: () => void;
}

export function QuickReadShelf({ title, subtitle, stories, onSeeAll }: QuickReadShelfProps) {
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
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#92400E] transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] dark:text-amber-300 dark:hover:bg-amber-950/40 sm:min-h-0 sm:py-1 sm:text-sm"
        >
          See all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        {stories.slice(0, 6).map((story) => (
          <div key={story.id} className="w-[150px] shrink-0 snap-start md:w-auto">
            <QuickReadCard story={story} />
          </div>
        ))}
      </div>
    </section>
  );
}
