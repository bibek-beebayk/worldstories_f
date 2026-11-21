import type { BlogLinkedStory } from "@/api/types";
import CoverImage from "@/components/CoverImage";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

interface BlogStoryCtaProps {
  story: BlogLinkedStory;
  variant?: "compact" | "sidebar" | "closing";
  id?: string;
}

export default function BlogStoryCta({ story, variant = "compact", id }: BlogStoryCtaProps) {
  if (variant === "compact") {
    return (
      <aside id={id} className="mt-5 flex items-center gap-3 rounded-sm border border-primary/20 bg-primary/5 p-3">
        <div className="h-16 w-12 shrink-0 overflow-hidden rounded-sm">
          <CoverImage
            src={story.cover_image}
            alt={story.title}
            author={story.author}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {story.story_type || "Story"} · Free to read
          </p>
          <p className="truncate font-semibold">{story.title}</p>
          {story.author && <p className="truncate text-xs text-muted-foreground">by {story.author}</p>}
        </div>
        <Link
          to={`/story/${story.slug}`}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          Read<span className="hidden sm:inline">&nbsp;{story.title}</span>&nbsp;→
        </Link>
      </aside>
    );
  }
  return (
    <aside
      id={id}
      className={`rounded-sm border border-primary/20 bg-primary/5 ${variant === "closing" ? "mt-8 p-5" : "p-4"}`}
      aria-label="Featured story"
    >
      <div className={`flex ${variant === "closing" ? "items-center gap-5" : "flex-col gap-3"}`}>
        <div
          className={`${variant === "closing" ? "h-28 w-20" : "aspect-[3/2] w-full"} shrink-0 overflow-hidden rounded-sm`}
        >
          <CoverImage
            src={story.cover_image}
            alt={story.title}
            author={story.author}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {story.story_type || "Story"} · Free to read
          </p>
          <h2 className="mt-1 font-bold">{story.title}</h2>
          {story.author && <p className="mt-1 text-sm text-muted-foreground">by {story.author}</p>}
          <Link
            to={`/story/${story.slug}`}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground"
          >
            Read {story.title} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
