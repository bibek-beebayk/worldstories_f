import { ArrowRight, Check, Clock3, Headphones } from "lucide-react";
import type { Story } from "@/api/types";
import AuthGatedLink from "@/components/AuthGatedLink";
import CoverImage from "@/components/CoverImage";

export interface QuickReadCardProps {
  story: Story;
}

export function QuickReadCard({ story }: QuickReadCardProps) {
  const progress = story.quick_read_progress;
  const isFinished = typeof progress === "number" && progress >= 0.9;
  const isInProgress = typeof progress === "number" && progress > 0 && progress < 0.9;
  const progressPercent = isInProgress ? Math.max(1, Math.min(99, Math.round(progress * 100))) : 0;

  return (
    <AuthGatedLink
      to={`/quick-read/${story.slug}`}
      className="group relative z-0 block rounded-lg transition-transform duration-200 ease-out hover:z-20 hover:scale-[1.04] focus-visible:z-20 focus-visible:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45309] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted shadow-md transition-shadow duration-200 group-hover:shadow-xl group-focus-visible:shadow-xl">
        <CoverImage
          src={story.cover_image}
          alt=""
          title={story.title}
          author={story.author}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-all duration-200 ${
            isFinished ? "brightness-90 saturate-75" : ""
          }`}
        />

        {isFinished && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            <Check className="h-3 w-3" aria-hidden="true" />
            Read
          </span>
        )}

        {story.has_audio && (
          <span
            aria-label="Audio available"
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-slate-900 shadow"
          >
            <Headphones className="h-3 w-3 text-[#B45309]" aria-hidden="true" />
            Listen
          </span>
        )}

        {isInProgress && (
          <div
            className="absolute inset-x-0 bottom-0 h-1.5 bg-black/35"
            role="progressbar"
            aria-label={`${progressPercent}% read`}
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-amber-500" style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-[#B45309]/95 px-2.5 py-2 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        >
          <span>Read now</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-[#92400E]">
          {story.title}
        </h3>
        {story.author && <p className="truncate text-xs text-muted-foreground">{story.author}</p>}
        {story.summary_reading_minutes != null && (
          <p className="flex items-center gap-1 pt-0.5 text-xs font-medium text-[#92400E] dark:text-amber-300">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{story.summary_reading_minutes} min read</span>
          </p>
        )}
      </div>
    </AuthGatedLink>
  );
}
