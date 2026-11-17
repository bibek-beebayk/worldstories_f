import type { MouseEvent, ReactNode } from "react";
import { trackHomeSectionClick, type ClickableItem } from "@/lib/homeClicks";

/**
 * Wraps one homepage section and reports clicks on any link inside it.
 *
 * A plain block div (not `display: contents`): the page spaces its sections
 * with `space-y-*`, which only applies to elements that generate a box.
 * Capture phase, so a card that stops propagation still counts.
 */
const SectionClickTracker = ({
  sectionId,
  sectionType,
  position,
  items,
  children,
}: {
  sectionId: number;
  sectionType: string;
  position: number;
  items: ClickableItem[];
  children: ReactNode;
}) => {
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    const anchor = target?.closest?.("a[href]");
    if (!anchor) return;
    trackHomeSectionClick({
      sectionId,
      sectionType,
      position,
      href: anchor.getAttribute("href"),
      items,
    });
  };

  return (
    <div onClickCapture={onClickCapture}>
      {children}
    </div>
  );
};

export default SectionClickTracker;
