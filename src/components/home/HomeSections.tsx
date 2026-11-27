import { Link } from "react-router";
import { ArrowRight, MapPin } from "lucide-react";
import AdSpace from "@/components/AdSpace";
import BlogCard from "@/components/BlogCard";
import CoverImage from "@/components/CoverImage";
import NewEntriesSection from "@/components/NewEntriesSection";
import QuickReadSection from "@/components/QuickReadSection";
import RecommendedForYouSection from "@/components/RecommendedForYouSection";
import StoryCard from "@/components/StoryCard";
import StoryJourneysBanner from "@/components/StoryJourneysBanner";
import TrendingList from "@/components/TrendingList";
import VideoCard from "@/components/VideoCard";
import ContinueShelf from "@/components/home/ContinueShelf";
import ExploreTiles from "@/components/home/ExploreTiles";
import SectionClickTracker from "@/components/home/SectionClickTracker";
import { SectionFrame } from "@/components/home/SectionFrame";
import { SectionLayout } from "@/components/home/SectionLayouts";
import { OriginalsRail } from "@/components/OriginalsRail";
import { sectionIcon } from "@/components/home/sectionIcons";
import { useAudiobooksOverview } from "@/hooks/useAudiobooks";
import { useContinueReading } from "@/hooks/useContinueReading";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useRecommendations } from "@/hooks/useRecommendations";
import { mergeContinueItems } from "@/lib/continueShelf";
import type { ClickableItem } from "@/lib/homeClicks";
import { cardShowFlagsFromDisplay, isInvertedSurface, normalizeDisplay } from "@/lib/homeDisplay";
import { effectiveCardStyle } from "@/lib/homeLayouts";
import { createRailDeduplicator, storiesBehindVideos } from "@/lib/railDeduplication";
import type {
  Blog,
  ContinueListeningItem,
  HomeSectionCardStyle,
  HomeSectionData,
  PublicVideo,
  Story,
} from "@/api/types";

const BANNER_THEMES: Record<string, string> = {
  ocean: "[--banner-from:#0891b2] [--banner-via:#2563eb] [--banner-to:#0d9488]",
  violet: "[--banner-from:#7c3aed] [--banner-via:#9333ea] [--banner-to:#4f46e5]",
  rose: "[--banner-from:#e11d48] [--banner-via:#db2777] [--banner-to:#f97316]",
  amber: "[--banner-from:#d97706] [--banner-via:#ea580c] [--banner-to:#dc2626]",
  emerald: "[--banner-from:#059669] [--banner-via:#0d9488] [--banner-to:#0891b2]",
};

export type SectionHeaderSection = Pick<
  HomeSectionData,
  "title" | "subtitle" | "icon" | "see_all_url" | "see_all_label" | "display"
>;

export const SectionHeader = ({
  section,
  headingId,
  inverted,
}: {
  section: SectionHeaderSection;
  headingId?: string;
  inverted?: boolean;
}) => {
  const Icon = sectionIcon(section.icon);
  const display = normalizeDisplay(section.display);
  const isCentered = display.heading_align === "center";
  const hideTitle = display.hide_title;
  const isInverted = inverted ?? isInvertedSurface(display.background);
  const seeAllClass = isInverted
    ? "inline-flex shrink-0 items-center gap-1 rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-white hover:text-slate-900 sm:text-sm"
    : "inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground sm:text-sm";

  if (hideTitle) {
    return (
      <div className={section.see_all_url ? "mb-4 flex items-center justify-end" : ""}>
        <div className="sr-only">
          <h2 id={headingId}>{section.title}</h2>
          {section.subtitle && <p>{section.subtitle}</p>}
        </div>
        {section.see_all_url && (
          <Link to={section.see_all_url} className={seeAllClass}>
            {section.see_all_label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className={
        isCentered
          ? "mb-5 flex flex-col items-center gap-2 text-center sm:mb-6"
          : "mb-5 flex items-center justify-between gap-3 sm:mb-6"
      }
    >
      <div>
        <h2
          id={headingId}
          className={`flex items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl ${isCentered ? "justify-center" : ""}`}
        >
          {Icon && <Icon className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${isInverted ? "text-white" : "text-primary"}`} />}
          {section.title}
        </h2>
        {section.subtitle && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{section.subtitle}</p>}
      </div>
      {section.see_all_url && (
        <Link to={section.see_all_url} className={seeAllClass}>
          {section.see_all_label}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
};

export const StoryCoverTile = ({ story }: { story: Story }) => (
  <Link
    to={`/story/${story.slug}`}
    aria-label={story.author ? `${story.title} by ${story.author}` : story.title}
    title={story.title}
    className="group block overflow-hidden rounded-sm shadow-sm transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100"
  >
    <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
      <CoverImage
        src={story.cover_image}
        alt=""
        title={story.title}
        author={story.author}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  </Link>
);

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

/** What a click inside a section can resolve to (see lib/homeClicks.ts). */
const clickItemsFor = (section: HomeSectionData, recommended: Story[] | undefined): ClickableItem[] => {
  const withSlug = (rows: unknown[], type: ClickableItem["type"]): ClickableItem[] =>
    (rows as { id: number; slug?: string }[]).map((row) => ({ id: row.id, slug: row.slug, type }));
  switch (section.section_type) {
    case "stories_query":
    case "stories_manual":
      return withSlug(section.items, "story");
    case "videos":
      return withSlug(section.items, "video");
    case "blogs":
      return withSlug(section.items, "blog");
    case "recommended":
      return withSlug(recommended ?? [], "story");
    default:
      return [];
  }
};

interface HomeSectionsProps {
  sections: HomeSectionData[];
  /** Stories already on screen above the sections (the featured band, including
   *  the stories behind featured videos). */
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
  const audiobookOverview = useAudiobooksOverview(isLoggedIn && needsContinue, { alwaysFresh: true });
  const listeningItems: ContinueListeningItem[] = (
    audiobookOverview.data?.continue_listening ?? []
  ).map((item) => ({
    story: {
      id: item.audiobook.story?.id ?? item.audiobook.id,
      title: item.audiobook.title,
      slug: item.audiobook.slug,
      author: item.audiobook.author ?? "",
      cover_image: item.audiobook.cover_image ?? "",
      genres: item.audiobook.genres,
      rating: 0,
      views: 0,
      has_audio: true,
    } as Story,
    audio_slug: item.track_slug,
    audio_title: item.track_title,
    audio_progress: item.progress_percent / 100,
    position_seconds: item.position_seconds ?? 0,
    duration_seconds: item.audiobook.total_duration_seconds ?? 0,
    overall_progress: item.progress_percent / 100,
    remaining_minutes: null,
    updated_at: item.updated_at,
  }));
  const recommendations = useRecommendations(isLoggedIn && needsRecommended);

  const rails = createRailDeduplicator();
  // The reader's own queue is claimed in full first: a story sixth in
  // Continue Reading is still theirs, not a fresh suggestion further down.
  rails.reserve(reading.data?.results.map((item) => item.story));
  rails.reserve(listeningItems.map((item) => item.story));
  rails.reserve(reservedStories);

  const renderSection = (section: HomeSectionData) => {
    const key = section.id;

    switch (section.section_type) {
      case "continue_shelf": {
        if (!isLoggedIn) return null;
        // Reading and listening in one row, newest first; the streak is a chip
        // in the row header (so there is no separate streak banner).
        const entries = mergeContinueItems(reading.data?.results, listeningItems);
        if (entries.length === 0) return null;
        return <ContinueShelf key={key} entries={entries} title={section.title || undefined} />;
      }
      case "reading_journey":
        // Folded into the Continue row as a streak chip. The type stays valid
        // so existing layouts keep loading; it just draws nothing now.
        return null;
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
      case "explore_tiles":
        return <ExploreTiles key={key} title={section.title || undefined} />;
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
        // A video's story is on screen here, so rails further down must not
        // offer it again as a story.
        rails.reserve(storiesBehindVideos(videos));
        const variant = effectiveCardStyle(section.card_style, section.section_type);
        const mediaVariant = (v: HomeSectionCardStyle) => (v === "compact" ? "default" : v);
        const display = normalizeDisplay(section.display);
        const show = cardShowFlagsFromDisplay(display);
        const headingId = `home-section-heading-${section.id}`;
        return (
          <section key={key} aria-labelledby={headingId}>
            <SectionHeader section={section} headingId={headingId} />
            <SectionLayout
              section={section}
              items={videos}
              variant={variant}
              keyOf={(v) => v.id}
              render={(v, cardVariant) => <VideoCard video={v} variant={mediaVariant(cardVariant)} show={show} />}
            />
          </section>
        );
      }
      case "blogs": {
        const blogs = section.items as Blog[];
        const variant = effectiveCardStyle(section.card_style, section.section_type);
        const mediaVariant = (v: HomeSectionCardStyle) => (v === "compact" ? "default" : v);
        const display = normalizeDisplay(section.display);
        const show = cardShowFlagsFromDisplay(display);
        const headingId = `home-section-heading-${section.id}`;
        return (
          <section key={key} aria-labelledby={headingId}>
            <SectionHeader section={section} headingId={headingId} />
            <SectionLayout
              section={section}
              items={blogs}
              variant={variant}
              keyOf={(b) => b.id}
              render={(b, cardVariant) => <BlogCard blog={b} variant={mediaVariant(cardVariant)} show={show} />}
            />
          </section>
        );
      }
      case "stories_query":
      case "stories_manual": {
        const all = section.items as Story[];
        const stories = section.allow_repeats ? all.slice(0, section.item_limit) : rails.claim(all, section.item_limit);
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
        const display = normalizeDisplay(section.display);
        const headingId = `home-section-heading-${section.id}`;
        if (section.layout === "trending") {
          const inverted = isInvertedSurface(display.background);
          return (
            <section key={key} aria-labelledby={headingId}>
              <SectionHeader section={section} headingId={headingId} />
              <div
                className={`rounded-sm border border-border bg-card p-4 shadow-sm sm:p-5 ${
                  inverted
                    ? "text-card-foreground [--foreground:var(--card-foreground)] [--muted-foreground:220_9%_46%] [&_h3]:text-card-foreground"
                    : ""
                }`}
              >
                <TrendingList stories={stories} />
              </div>
            </section>
          );
        }
        const variant = effectiveCardStyle(section.card_style, section.section_type);
        const show = cardShowFlagsFromDisplay(display);
        return (
          <section key={key} aria-labelledby={headingId}>
            <SectionHeader section={section} headingId={headingId} />
            <SectionLayout
              section={section}
              items={stories}
              variant={variant}
              keyOf={(s) => s.id}
              render={(s, cardVariant) => (
                <StoryCard {...s} variant={cardVariant} compact={cardVariant === "compact"} show={show} />
              )}
              renderCover={(s) => <StoryCoverTile story={s} />}
            />
          </section>
        );
      }
      default:
        // A section type from a newer backend than this build knows — skip it.
        return null;
    }
  };

  const body = sections.map((section, index) => {
    const node = renderSection(section);
    if (!node) return null;
    return (
      <SectionClickTracker
        key={section.id}
        sectionId={section.id}
        sectionType={section.section_type}
        position={index + 1}
        items={clickItemsFor(section, recommendations.data)}
      >
        <SectionFrame display={section.display} device={section.device} anchorId={section.anchor_id}>
          {node}
        </SectionFrame>
      </SectionClickTracker>
    );
  });

  return <>{body}</>;
};

export default HomeSections;
