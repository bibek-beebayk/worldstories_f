import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight, MapPin } from "lucide-react";
import AdSpace from "@/components/AdSpace";
import BlogCard from "@/components/BlogCard";
import ContinueListeningSection from "@/components/ContinueListeningSection";
import ContinueReadingSection from "@/components/ContinueReadingSection";
import NewEntriesSection from "@/components/NewEntriesSection";
import QuickReadSection from "@/components/QuickReadSection";
import ReadingJourneyCard from "@/components/ReadingJourneyCard";
import RecommendedForYouSection from "@/components/RecommendedForYouSection";
import StoryCard from "@/components/StoryCard";
import StoryJourneysBanner from "@/components/StoryJourneysBanner";
import VideoCard from "@/components/VideoCard";
import { OriginalsRail } from "@/components/OriginalsRail";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { sectionIcon } from "@/components/home/sectionIcons";
import { useContinueListening } from "@/hooks/useContinueListening";
import { useContinueReading } from "@/hooks/useContinueReading";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useRecommendations } from "@/hooks/useRecommendations";
import { createRailDeduplicator } from "@/lib/railDeduplication";
import type { Blog, HomeSectionData, PublicVideo, Story } from "@/api/types";

// Tailwind only emits classes it can see as whole strings, so the column
// counts an admin can pick are spelled out here rather than interpolated.
const COLS_MOBILE: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };
const COLS_MD: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-3",
  5: "md:grid-cols-3",
  6: "md:grid-cols-3",
};
const COLS_LG: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};
const BASIS_MOBILE: Record<number, string> = { 1: "basis-full", 2: "basis-1/2", 3: "basis-1/3" };
const BASIS_LG: Record<number, string> = {
  2: "lg:basis-1/2",
  3: "lg:basis-1/3",
  4: "lg:basis-1/4",
  5: "lg:basis-1/5",
  6: "lg:basis-1/6",
};

const BANNER_THEMES: Record<string, string> = {
  ocean: "[--banner-from:#0891b2] [--banner-via:#2563eb] [--banner-to:#0d9488]",
  violet: "[--banner-from:#7c3aed] [--banner-via:#9333ea] [--banner-to:#4f46e5]",
  rose: "[--banner-from:#e11d48] [--banner-via:#db2777] [--banner-to:#f97316]",
  amber: "[--banner-from:#d97706] [--banner-via:#ea580c] [--banner-to:#dc2626]",
  emerald: "[--banner-from:#059669] [--banner-via:#0d9488] [--banner-to:#0891b2]",
};

const SectionHeader = ({ section }: { section: HomeSectionData }) => {
  const Icon = sectionIcon(section.icon);
  return (
    <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
      <div>
        <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />}
          {section.title}
        </h2>
        {section.subtitle && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{section.subtitle}</p>}
      </div>
      {section.see_all_url && (
        <Link
          to={section.see_all_url}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm"
        >
          {section.see_all_label}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
};

/** Lays any list of cards out as the grid or scrolling rail the section asks for. */
function CardLayout<T>({
  section,
  items,
  render,
  keyOf,
}: {
  section: HomeSectionData;
  items: T[];
  render: (item: T) => ReactNode;
  keyOf: (item: T) => number;
}) {
  if (section.layout === "rail") {
    return (
      <Carousel opts={{ align: "start", loop: items.length > section.columns_desktop }} className="w-full">
        <CarouselContent className="-ml-3">
          {items.map((item) => (
            <CarouselItem
              key={keyOf(item)}
              className={`pl-3 ${BASIS_MOBILE[section.columns_mobile] ?? "basis-1/2"} ${BASIS_LG[section.columns_desktop] ?? "lg:basis-1/4"}`}
            >
              {render(item)}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 hidden sm:flex" />
        <CarouselNext className="right-2 hidden sm:flex" />
      </Carousel>
    );
  }
  return (
    <div
      className={`grid gap-3 sm:gap-4 ${COLS_MOBILE[section.columns_mobile] ?? "grid-cols-2"} ${COLS_MD[section.columns_desktop] ?? ""} ${COLS_LG[section.columns_desktop] ?? "lg:grid-cols-4"}`}
    >
      {items.map((item) => (
        <div key={keyOf(item)} className="min-w-0">
          {render(item)}
        </div>
      ))}
    </div>
  );
}

const HomeBanner = ({ section }: { section: HomeSectionData }) => {
  const Icon = sectionIcon(section.icon) ?? MapPin;
  const config = section.config as { button_label?: string; button_url?: string; theme?: string };
  const theme = BANNER_THEMES[config.theme ?? "ocean"] ?? BANNER_THEMES.ocean;
  return (
    <section className={`relative overflow-hidden rounded-sm themed-banner ${theme} p-5 shadow-lg sm:p-6`}>
      <Icon className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 text-white/10 [animation:spin_30s_linear_infinite]" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold sm:text-xl">{section.title}</h2>
            {section.subtitle && <p className="mt-1 text-xs opacity-80 sm:text-sm">{section.subtitle}</p>}
          </div>
        </div>
        {config.button_label && config.button_url && (
          <Link
            to={config.button_url}
            className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-white/25 sm:text-sm"
          >
            {config.button_label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
};

interface HomeSectionsProps {
  sections: HomeSectionData[];
  /** Stories already on screen above the sections (the featured band). */
  reservedStories: { id: number }[];
}

/**
 * The homepage body, rendered from the admin-managed section list. Sections
 * appear in the order the server sent; stories are de-duplicated top to
 * bottom (the reader's own shelves first), except in sections that allow repeats.
 */
const HomeSections = ({ sections, reservedStories }: HomeSectionsProps) => {
  const isLoggedIn = useIsLoggedIn();
  const needsContinue = sections.some((s) => s.section_type === "continue_shelf");
  const needsRecommended = sections.some((s) => s.section_type === "recommended");
  const reading = useContinueReading(isLoggedIn && needsContinue);
  const listening = useContinueListening(isLoggedIn && needsContinue);
  const recommendations = useRecommendations(isLoggedIn && needsRecommended);

  const rails = createRailDeduplicator();
  // The reader's own queue is claimed in full first: a story sixth in
  // Continue Reading is still theirs, not a fresh suggestion further down.
  rails.reserve(reading.data?.results.map((item) => item.story));
  rails.reserve(listening.data?.results.map((item) => item.story));
  rails.reserve(reservedStories);

  const body = sections.map((section) => {
    const key = section.id;

    switch (section.section_type) {
      case "continue_shelf": {
        if (!isLoggedIn) return null;
        const readingItems = reading.data?.results ?? [];
        const listeningItems = listening.data?.results ?? [];
        if (readingItems.length === 0 && listeningItems.length === 0) return null;
        return (
          <div key={key} className="grid gap-4 sm:grid-cols-2">
            {!reading.isLoading && !reading.isError && readingItems.length > 0 && (
              <ContinueReadingSection items={readingItems} isLoading={false} isError={false} />
            )}
            {!listening.isLoading && !listening.isError && listeningItems.length > 0 && (
              <ContinueListeningSection items={listeningItems} isLoading={false} isError={false} />
            )}
          </div>
        );
      }
      case "reading_journey":
        return isLoggedIn ? <ReadingJourneyCard key={key} enabled /> : null;
      case "recommended": {
        if (!isLoggedIn || recommendations.isLoading || recommendations.isError) return null;
        const stories = section.allow_repeats
          ? (recommendations.data ?? []).slice(0, section.item_limit)
          : rails.claim(recommendations.data, section.item_limit);
        if (stories.length === 0) return null;
        return <RecommendedForYouSection key={key} stories={stories} isLoading={false} isError={false} />;
      }
      case "journeys_banner":
        return <StoryJourneysBanner key={key} enabled />;
      case "new_entries":
        return <NewEntriesSection key={key} title={section.title} icon={sectionIcon(section.icon)} />;
      case "ad_slot":
        return (
          <AdSpace
            key={key}
            size={((section.config as { ad_size?: string }).ad_size as "banner" | "square" | "rectangle") ?? "banner"}
            contentType="home"
          />
        );
      case "banner":
        return <HomeBanner key={key} section={section} />;
      case "videos": {
        const videos = section.items as PublicVideo[];
        return (
          <section key={key}>
            <SectionHeader section={section} />
            <CardLayout section={section} items={videos} keyOf={(v) => v.id} render={(v) => <VideoCard video={v} />} />
          </section>
        );
      }
      case "blogs": {
        const blogs = section.items as Blog[];
        return (
          <section key={key}>
            <SectionHeader section={section} />
            <CardLayout section={section} items={blogs} keyOf={(b) => b.id} render={(b) => <BlogCard blog={b} />} />
          </section>
        );
      }
      case "stories_query":
      case "stories_manual": {
        const all = section.items as Story[];
        const stories = section.allow_repeats
          ? all.slice(0, section.item_limit)
          : rails.claim(all, section.item_limit);
        if (stories.length === 0) return null;
        if (section.variant === "quick_read") {
          return (
            <QuickReadSection
              key={key}
              stories={stories}
              title={section.title}
              icon={sectionIcon(section.icon)}
              seeAllHref={section.see_all_url}
              seeAllLabel={section.see_all_label}
              limit={section.item_limit}
            />
          );
        }
        if (section.variant === "originals") {
          return (
            <OriginalsRail
              key={key}
              stories={stories}
              title={section.title}
              description={section.subtitle}
              seeAllHref={section.see_all_url}
              seeAllLabel={section.see_all_label}
            />
          );
        }
        return (
          <section key={key}>
            <SectionHeader section={section} />
            <CardLayout
              section={section}
              items={stories}
              keyOf={(s) => s.id}
              render={(s) => <StoryCard {...s} compact={section.card_style === "compact"} />}
            />
          </section>
        );
      }
      default:
        // A section type from a newer backend than this build knows — skip it.
        return null;
    }
  });

  return <>{body}</>;
};

export default HomeSections;
