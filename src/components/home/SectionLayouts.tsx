import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { bentoSpan, effectiveLayout } from "@/lib/homeLayouts";
import type { HomeSectionCardStyle, HomeSectionData } from "@/api/types";

// Tailwind only emits classes it can see as whole strings, so the column
// counts an admin can pick are spelled out here rather than interpolated.
export const COLS_MOBILE: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };
export const COLS_MD: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-3",
  5: "md:grid-cols-3",
  6: "md:grid-cols-3",
};
export const COLS_LG: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};
export const BASIS_MOBILE: Record<number, string> = { 1: "basis-full", 2: "basis-1/2", 3: "basis-1/3" };
export const BASIS_LG: Record<number, string> = {
  2: "lg:basis-1/2",
  3: "lg:basis-1/3",
  4: "lg:basis-1/4",
  5: "lg:basis-1/5",
  6: "lg:basis-1/6",
};

export type SectionLayoutSection = Pick<
  HomeSectionData,
  "title" | "section_type" | "layout" | "columns_mobile" | "columns_desktop" | "card_style"
>;

export interface SectionLayoutProps<T> {
  section: SectionLayoutSection;
  items: T[];
  variant: HomeSectionCardStyle;
  render: (item: T, cardVariant: HomeSectionCardStyle) => ReactNode;
  keyOf: (item: T) => number;
  renderCover?: (item: T) => ReactNode;
}

function PagedCarousel<T>({ section, items, variant, render, keyOf }: Omit<SectionLayoutProps<T>, "renderCover">) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedSnap, setSelectedSnap] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setSnapCount(api.scrollSnapList().length);
      setSelectedSnap(api.selectedScrollSnap());
    };
    sync();
    api.on("reInit", sync);
    api.on("select", sync);
    return () => {
      api.off("reInit", sync);
      api.off("select", sync);
    };
  }, [api]);

  const fallbackPages = Math.max(1, Math.ceil(items.length / Math.max(1, section.columns_desktop)));
  const pageCount = snapCount > 0 ? snapCount : fallbackPages;

  return (
    <div className="w-full min-w-0">
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: false, slidesToScroll: "auto" }}
        aria-label={section.title || "Section carousel"}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {items.map((item) => (
            <CarouselItem
              key={keyOf(item)}
              className={`pl-3 ${BASIS_MOBILE[section.columns_mobile] ?? "basis-1/2"} ${BASIS_LG[section.columns_desktop] ?? "lg:basis-1/4"}`}
            >
              {render(item, variant)}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 flex" aria-label="Previous page" />
        <CarouselNext className="right-2 flex" aria-label="Next page" />
      </Carousel>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="group" aria-label="Carousel pages">
          {Array.from({ length: pageCount }).map((_, index) => {
            const active = index === selectedSnap;
            return (
              <button
                key={index}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to page ${index + 1}`}
                aria-current={active ? "true" : undefined}
                className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  active ? "w-6 bg-primary" : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Lays out any content section's items according to its effective layout and
 * card style. Used both on the public homepage and inside the admin editor's
 * Layout tab live preview.
 */
export function SectionLayout<T>({ section, items, variant, render, keyOf, renderCover }: SectionLayoutProps<T>) {
  const layout = effectiveLayout(section.layout, items.length, section.columns_desktop, section.section_type);

  if (layout === "rail") {
    return (
      <Carousel opts={{ align: "start", loop: items.length > section.columns_desktop }} className="w-full">
        <CarouselContent className="-ml-3">
          {items.map((item) => (
            <CarouselItem
              key={keyOf(item)}
              className={`pl-3 ${BASIS_MOBILE[section.columns_mobile] ?? "basis-1/2"} ${BASIS_LG[section.columns_desktop] ?? "lg:basis-1/4"}`}
            >
              {render(item, variant)}
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 hidden sm:flex" />
        <CarouselNext className="right-2 hidden sm:flex" />
      </Carousel>
    );
  }

  if (layout === "carousel") {
    return <PagedCarousel section={section} items={items} variant={variant} render={render} keyOf={keyOf} />;
  }

  if (layout === "featured") {
    const desktopCols = Math.max(3, Math.min(6, section.columns_desktop));
    return (
      <div
        className={`grid gap-3 sm:gap-4 ${COLS_MOBILE[section.columns_mobile] ?? "grid-cols-2"} ${COLS_LG[desktopCols] ?? "lg:grid-cols-4"}`}
      >
        {items.map((item, index) => (
          <div
            key={keyOf(item)}
            className={index === 0 ? "col-span-full min-w-0 lg:col-span-2 lg:row-span-2" : "min-w-0"}
          >
            {render(item, index === 0 ? "overlay" : variant)}
          </div>
        ))}
      </div>
    );
  }

  if (layout === "bento") {
    const desktopCols = Math.max(3, Math.min(6, section.columns_desktop));
    return (
      <div className={`grid grid-flow-dense grid-cols-2 gap-3 sm:gap-4 ${COLS_LG[desktopCols] ?? "lg:grid-cols-4"}`}>
        {items.map((item, index) => {
          const span = bentoSpan(index);
          const isLarge = span.colSpan === 2;
          const mobileSpan = index === 0 ? "col-span-2" : "col-span-1";
          const desktopSpan =
            span.colSpan === 2 && span.rowSpan === 2
              ? "lg:col-span-2 lg:row-span-2"
              : span.colSpan === 2
                ? "lg:col-span-2 lg:row-span-1"
                : "lg:col-span-1 lg:row-span-1";
          return (
            <div key={keyOf(item)} className={`min-w-0 ${mobileSpan} ${desktopSpan}`}>
              {render(item, isLarge ? "overlay" : variant)}
            </div>
          );
        })}
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
        {items.map((item) => (
          <div key={keyOf(item)} className="min-w-0">
            {render(item, "wide")}
          </div>
        ))}
      </div>
    );
  }

  if (layout === "tworow") {
    const style = {
      "--cols-m": String(Math.max(1, Math.min(3, section.columns_mobile || 2))),
      "--cols-d": String(Math.max(2, Math.min(6, section.columns_desktop || 4))),
    } as CSSProperties;
    return (
      <div
        tabIndex={0}
        role="region"
        aria-label={`${section.title || "Section"} two-row rail`}
        style={style}
        className="grid snap-x snap-mandatory grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-1 auto-cols-[calc((100%-(var(--cols-m)-1)*0.75rem)/var(--cols-m))] [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-4 lg:auto-cols-[calc((100%-(var(--cols-d)-1)*1rem)/var(--cols-d))] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div key={keyOf(item)} className="min-w-0 snap-start">
            {render(item, variant)}
          </div>
        ))}
      </div>
    );
  }

  if (layout === "covers" && renderCover) {
    return (
      <div
        tabIndex={0}
        role="region"
        aria-label={`${section.title || "Stories"} cover shelf`}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div key={keyOf(item)} className="w-[112px] shrink-0 snap-start lg:w-[140px]">
            {renderCover(item)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 sm:gap-4 ${COLS_MOBILE[section.columns_mobile] ?? "grid-cols-2"} ${COLS_MD[section.columns_desktop] ?? ""} ${COLS_LG[section.columns_desktop] ?? "lg:grid-cols-4"}`}
    >
      {items.map((item) => (
        <div key={keyOf(item)} className="min-w-0">
          {render(item, variant)}
        </div>
      ))}
    </div>
  );
}
