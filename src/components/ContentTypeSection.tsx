import { ArrowRight, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import StoryCard from "@/components/StoryCard";
import type { Story } from "@/api/types";

// One color theme per content type, echoing the palette each type's own
// full-list page already uses (Audiobooks=rose, Watch=indigo, QuickReads=
// amber) so the coding is consistent across the app (Library, Discover),
// not invented separately per page.
export const SECTION_THEMES = {
  emerald: {
    wrap: "border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-card to-teal-50",
    icon: "text-emerald-600",
    link: "text-emerald-700 hover:underline",
  },
  rose: {
    wrap: "border-rose-200/60 bg-gradient-to-br from-rose-50 via-card to-pink-50",
    icon: "text-rose-600",
    link: "text-rose-700 hover:underline",
  },
  sky: {
    wrap: "border-sky-200/60 bg-gradient-to-br from-sky-50 via-card to-cyan-50",
    icon: "text-sky-600",
    link: "text-sky-700 hover:underline",
  },
  indigo: {
    wrap: "border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-card to-violet-50",
    icon: "text-indigo-600",
    link: "text-indigo-700 hover:underline",
  },
  amber: {
    wrap: "border-amber-200/60 bg-gradient-to-br from-amber-50 via-card to-orange-50",
    icon: "text-amber-600",
    link: "text-amber-700 hover:underline",
  },
  slate: {
    wrap: "border-slate-200/60 bg-gradient-to-br from-slate-50 via-card to-zinc-100",
    icon: "text-slate-600",
    link: "text-slate-700 hover:underline",
  },
} as const;
export type SectionTheme = keyof typeof SECTION_THEMES;

// One of a content-type-scoped rail — used on both Library (6 sections
// browsed by type) and Discover (6 "New X" sections). Every card links via
// `linkTo` to that type's isolated, mode-scoped detail page, never the
// all-modes /story/:slug hub.
export function ContentTypeSection({
  title,
  icon: Icon,
  theme,
  subtitle,
  stories,
  isLoading,
  seeAllTo,
  linkTo,
}: {
  title: string;
  icon: LucideIcon;
  theme: SectionTheme;
  subtitle: string;
  stories: Story[];
  isLoading: boolean;
  seeAllTo: string;
  linkTo: (slug: string) => string;
}) {
  const colors = SECTION_THEMES[theme];
  return (
    <section className={`rounded-2xl border p-4 sm:p-6 ${colors.wrap}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
            <Icon className={`h-5 w-5 ${colors.icon}`} />
            {title}
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
        </div>
        <Link
          to={seeAllTo}
          className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium sm:text-sm ${colors.link}`}
        >
          See all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
          Nothing here yet.
        </div>
      ) : (
        <Carousel opts={{ align: "start" }} className="px-1">
          <CarouselContent>
            {stories.map((story) => (
              <CarouselItem key={story.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                <StoryCard {...story} compact linkTo={linkTo(story.slug)} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )}
    </section>
  );
}
