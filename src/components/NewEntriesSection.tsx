import { useQuery } from "@tanstack/react-query";
import { BookMarked, Captions, Headphones, Rss, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import StoryCard from "@/components/StoryCard";
import { storyApi } from "@/api/story";
import type { Story } from "@/api/types";

interface EntryType {
  key: string;
  label: string;
  icon: LucideIcon;
  linkTo: (slug: string) => string;
  /** Per-type color identity — same palette Discover's "New X" rails use
   *  (ContentTypeSection's SECTION_THEMES), so the coding stays consistent
   *  across the app rather than inventing a new one here. */
  labelClass: string;
}

const ENTRY_TYPES: EntryType[] = [
  {
    key: "read",
    label: "Read",
    icon: BookMarked,
    linkTo: (slug) => `/read/${slug}`,
    labelClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    key: "listen",
    label: "Listen",
    icon: Headphones,
    linkTo: (slug) => `/listen/${slug}`,
    labelClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    key: "read-along",
    label: "Read Along",
    icon: Captions,
    linkTo: (slug) => `/read-along/${slug}`,
    labelClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    key: "watch",
    label: "Watch",
    icon: Youtube,
    linkTo: (slug) => `/watch/${slug}`,
    labelClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
];

/**
 * One latest item per content type (text, audio, read-along, video) — a
 * quick "what's new across every format" snapshot, distinct from the
 * type-scoped "New X" rails on the Discover page (which show several items
 * per type). Mirrors the query shape Discover already uses for the same
 * newest-first-by-type data.
 */
const NewEntriesSection = () => {
  const { data: readData } = useQuery({
    queryKey: ["home-new-entry", "read"],
    queryFn: () => storyApi.getStories(1, [], "recent", "all"),
    staleTime: 60_000,
  });
  const { data: listenData } = useQuery({
    queryKey: ["home-new-entry", "listen"],
    queryFn: () => storyApi.getStories(1, [], "recent", "all", "", "all", "all", [], true),
    staleTime: 60_000,
  });
  const { data: readAlongData } = useQuery({
    queryKey: ["home-new-entry", "read-along"],
    queryFn: () =>
      storyApi.getStories(1, [], "recent", "all", "", "all", "all", [], false, false, "all", false, [], true),
    staleTime: 60_000,
  });
  const { data: watchData } = useQuery({
    queryKey: ["home-new-entry", "watch"],
    queryFn: () => storyApi.getStories(1, [], "recent", "all", "", "all", "all", [], false, false, "all", true),
    staleTime: 60_000,
  });

  const resultsByType: Record<string, Story[] | undefined> = {
    read: readData?.results,
    listen: listenData?.results,
    "read-along": readAlongData?.results,
    watch: watchData?.results,
  };

  const entries = ENTRY_TYPES.map((type) => ({
    type,
    story: resultsByType[type.key]?.[0],
  })).filter((entry) => entry.story);

  if (entries.length === 0) return null;

  return (
    <section>
      <h2 className="mb-5 flex items-center gap-2.5 text-xl font-bold tracking-tight sm:mb-6 sm:text-2xl">
        <Rss className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
        New Entries
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {entries.map(({ type, story }) => (
          <div key={type.key} className="mx-auto w-full max-w-[180px]">
            <div className={`relative z-30 mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${type.labelClass}`}>
              <type.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{type.label}</span>
            </div>
            <StoryCard {...story!} compact linkTo={type.linkTo(story!.slug)} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default NewEntriesSection;
