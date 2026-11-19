import { BookOpenText, Captions, Headphones, Youtube, Zap } from "lucide-react";
import type { ComponentType } from "react";

// The five ways to take a story in, named once: the Library's format tabs, the
// story card's badges and the list view's icons all read from here, so a format
// has one label, one icon and one colour everywhere.
export type StoryFormat = "read" | "listen" | "read_along" | "watch" | "quick_read";

export const FORMAT_META: Record<
  StoryFormat,
  { label: string; icon: ComponentType<{ className?: string }>; badgeClass: string; route: (slug: string) => string }
> = {
  read: { label: "Read", icon: BookOpenText, badgeClass: "bg-emerald-600", route: (slug) => `/read/${slug}` },
  listen: { label: "Listen", icon: Headphones, badgeClass: "bg-rose-600", route: (slug) => `/listen/${slug}` },
  read_along: { label: "Read Along", icon: Captions, badgeClass: "bg-sky-600", route: (slug) => `/read-along/${slug}` },
  watch: { label: "Watch", icon: Youtube, badgeClass: "bg-indigo-600", route: (slug) => `/watch/${slug}` },
  quick_read: { label: "Quick Read", icon: Zap, badgeClass: "bg-amber-600", route: (slug) => `/quick-read/${slug}` },
};

export interface FormatSource {
  has_text?: boolean | null;
  has_audio?: boolean;
  has_read_along?: boolean;
  has_video?: boolean;
  summary_reading_minutes?: number | null;
}

/** The formats a story is available in, in a stable order. "Read" shows only
 *  where the API says so (`has_text === true`, the Library list). */
export function availableFormats(story: FormatSource): StoryFormat[] {
  const formats: StoryFormat[] = [];
  if (story.has_text === true) formats.push("read");
  if (story.has_audio) formats.push("listen");
  if (story.has_read_along) formats.push("read_along");
  if (story.has_video) formats.push("watch");
  if (story.summary_reading_minutes != null) formats.push("quick_read");
  return formats;
}

export const NEW_STORY_DAYS = 14;

/** Published within the last two weeks. */
export function isNewStory(publishedAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!publishedAt) return false;
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return false;
  const age = now - published;
  return age >= 0 && age <= NEW_STORY_DAYS * 24 * 60 * 60 * 1000;
}

/** "12 min", or "3 hr" / "1.5 hr" from an hour up. Null when the length is unknown. */
export function formatStoryLength(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = rounded / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
}
