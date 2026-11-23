import type { ReactNode } from "react";
import type { HomeSectionDevice, HomeSectionDisplay } from "@/api/types";
import { normalizeDisplay, sectionFrameClasses } from "@/lib/homeDisplay";

export interface SectionFrameProps {
  display?: Partial<HomeSectionDisplay> | null;
  device?: HomeSectionDevice;
  anchorId?: string | null;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a homepage section with its configured background surface, spacing,
 * width bleed, device visibility, and optional anchor id. Renders transparently
 * when all settings are at their defaults so existing sections stay unchanged.
 */
export function SectionFrame({ display, device = "all", anchorId, className, children }: SectionFrameProps) {
  const normalized = normalizeDisplay(display);
  const frameClass = sectionFrameClasses(normalized, device);
  const cleanAnchor = (anchorId ?? "").trim() || undefined;

  if (!frameClass && !cleanAnchor && !className) {
    return <>{children}</>;
  }

  const combined = [cleanAnchor ? "scroll-mt-20" : "", frameClass, className].filter(Boolean).join(" ");
  return (
    <div id={cleanAnchor} className={combined || undefined}>
      {children}
    </div>
  );
}
