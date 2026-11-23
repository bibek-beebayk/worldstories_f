import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Monitor, Smartphone } from "lucide-react";
import { storyApi } from "@/api/story";
import type {
  AdminHomeSectionPreviewPayload,
  Blog,
  HomeSectionCardStyle,
  HomeSectionTypesMeta,
  PublicVideo,
  Story,
} from "@/api/types";
import BlogCard from "@/components/BlogCard";
import StoryCard from "@/components/StoryCard";
import TrendingList from "@/components/TrendingList";
import VideoCard from "@/components/VideoCard";
import { SectionHeader, StoryCoverTile } from "@/components/home/HomeSections";
import { SectionFrame } from "@/components/home/SectionFrame";
import { SectionLayout } from "@/components/home/SectionLayouts";
import { cardShowFlagsFromDisplay, isInvertedSurface, normalizeDisplay } from "@/lib/homeDisplay";
import { effectiveCardStyle, effectiveLayout } from "@/lib/homeLayouts";
import { SettingGroup } from "./controls";
import type { HomeSectionEditorDraft as Draft } from "./types";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

interface SectionLivePreviewProps {
  draft: Draft;
  meta: HomeSectionTypesMeta;
  previewPayload: AdminHomeSectionPreviewPayload | null;
  validationError: string | null;
  title?: string;
  note?: string;
}

export function SectionLivePreview({
  draft,
  meta,
  previewPayload,
  validationError,
  title = "Live preview",
  note = "Updates immediately when you change layout, card details, or appearance.",
}: SectionLivePreviewProps) {
  const [viewport, setViewport] = useState<"desktop" | "phone">("desktop");
  const typeMeta = meta.types.find((t) => t.value === draft.section_type);
  const debouncedPayload = useDebouncedValue(previewPayload, 400);

  const preview = useQuery({
    queryKey: ["admin-home-section-preview", debouncedPayload],
    queryFn: () => storyApi.previewAdminHomeSection(debouncedPayload!),
    enabled: debouncedPayload !== null && validationError === null,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const display = normalizeDisplay(draft.display);
  const show = cardShowFlagsFromDisplay(display);
  const inverted = isInvertedSurface(display.background);
  const hiddenOnViewport =
    (viewport === "desktop" && draft.device === "mobile") || (viewport === "phone" && draft.device === "desktop");

  const previewItems = (preview.data?.items ?? []).slice(0, draft.item_limit);
  const previewSection = {
    title: draft.title || "Untitled section",
    subtitle: draft.subtitle,
    icon: draft.icon,
    see_all_url: draft.show_see_all ? draft.see_all_url || "/library" : "",
    see_all_label: draft.see_all_label || "See all",
    display,
    section_type: draft.section_type,
    layout: draft.layout,
    columns_mobile: draft.columns_mobile,
    columns_desktop: draft.columns_desktop,
    card_style: draft.card_style,
  };
  const resolvedVariant = effectiveCardStyle(draft.card_style, draft.section_type);
  const resolvedLayout = effectiveLayout(draft.layout, previewItems.length, draft.columns_desktop, draft.section_type);
  const mediaVariant = (v: HomeSectionCardStyle) => (v === "compact" ? "default" : v);
  const previewErrorMessage = preview.error instanceof Error ? preview.error.message : "Could not load the preview.";

  return (
    <SettingGroup title={title} note={note}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          {typeMeta?.content && preview.data && preview.data.total_matching > 0 ? (
            <>
              <span>
                Showing {previewItems.length} of {preview.data.total_matching} matching
              </span>
              {resolvedLayout !== draft.layout && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Preview falling back to {resolvedLayout} (not enough items)
                </span>
              )}
            </>
          ) : null}
          {hiddenOnViewport && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              Hidden on this device
            </span>
          )}
        </div>
        <div role="group" aria-label="Preview viewport" className="inline-flex rounded-md border p-0.5">
          <button
            type="button"
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              viewport === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
            Desktop
          </button>
          <button
            type="button"
            aria-pressed={viewport === "phone"}
            onClick={() => setViewport("phone")}
            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              viewport === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
            Phone
          </button>
        </div>
      </div>

      <div
        className={`relative overflow-x-hidden transition-opacity ${hiddenOnViewport ? "opacity-50" : ""} ${
          viewport === "phone"
            ? "mx-auto w-[390px] max-w-full rounded-xl border-2 border-border bg-background p-3 shadow-sm"
            : "w-full rounded-lg border bg-background p-4"
        }`}
      >
        {!typeMeta?.content ? (
          <SectionFrame display={display} device="all">
            <SectionHeader section={previewSection} />
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              {typeMeta?.label ?? draft.section_type} content renders inside this frame on the homepage.
            </p>
          </SectionFrame>
        ) : validationError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {validationError}
          </p>
        ) : preview.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Loading preview">
            {Array.from({ length: Math.min(draft.item_limit, 6) }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="aspect-[3/4] animate-pulse rounded-md bg-muted" />
                <div className="h-4 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : preview.isError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {previewErrorMessage}
          </p>
        ) : preview.data?.total_matching === 0 || previewItems.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing matches these rules. Loosen one.
          </p>
        ) : (
          <SectionFrame display={display} device="all">
            <SectionHeader section={previewSection} />
            {draft.section_type === "stories_query" || draft.section_type === "stories_manual" ? (
              draft.layout === "trending" ? (
                <div
                  className={`rounded-sm border border-border bg-card p-4 shadow-sm sm:p-5 ${
                    inverted
                      ? "text-card-foreground [--foreground:var(--card-foreground)] [--muted-foreground:220_9%_46%] [&_h3]:text-card-foreground"
                      : ""
                  }`}
                >
                  <TrendingList stories={previewItems as Story[]} />
                </div>
              ) : (
                <SectionLayout
                  section={previewSection}
                  items={previewItems as Story[]}
                  variant={resolvedVariant}
                  keyOf={(s) => s.id}
                  render={(s, cardVariant) => (
                    <StoryCard {...s} variant={cardVariant} compact={cardVariant === "compact"} show={show} />
                  )}
                  renderCover={(s) => <StoryCoverTile story={s} />}
                />
              )
            ) : draft.section_type === "videos" ? (
              <SectionLayout
                section={previewSection}
                items={previewItems as PublicVideo[]}
                variant={resolvedVariant}
                keyOf={(v) => v.id}
                render={(v, cardVariant) => <VideoCard video={v} variant={mediaVariant(cardVariant)} show={show} />}
              />
            ) : (
              <SectionLayout
                section={previewSection}
                items={previewItems as Blog[]}
                variant={resolvedVariant}
                keyOf={(b) => b.id}
                render={(b, cardVariant) => <BlogCard blog={b} variant={mediaVariant(cardVariant)} show={show} />}
              />
            )}
          </SectionFrame>
        )}
      </div>
    </SettingGroup>
  );
}
