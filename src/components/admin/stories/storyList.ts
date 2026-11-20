// Pure helpers behind the admin Stories page: what a story's status is, what it
// is missing, how ready it is to publish, and how the list's filters live in the URL.

export type StoryStatus = "published" | "draft" | "scheduled";
export type StatusFilter = "all" | StoryStatus;
export type StorySort = "newest" | "oldest" | "title_asc" | "title_desc";
export type StoryNeed = "summary" | "retro" | "cover" | "chapters";

export const STORY_SORTS: { value: StorySort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
];

export const STORY_NEEDS: { key: StoryNeed; label: string }[] = [
  { key: "summary", label: "No summary" },
  { key: "retro", label: "No retro" },
  { key: "cover", label: "No cover" },
  { key: "chapters", label: "No chapters" },
];

/** The API param each "Needs" chip turns on (all of them mean "false"). */
export const NEED_PARAM: Record<StoryNeed, "has_summary" | "has_retrospective" | "has_cover" | "has_chapters"> = {
  summary: "has_summary",
  retro: "has_retrospective",
  cover: "has_cover",
  chapters: "has_chapters",
};

/** The three states the list badges show: Scheduled is published with a future publish_at. */
export function storyStatus(
  story: { is_published: boolean; publish_at: string | null },
  now: number = Date.now(),
): StoryStatus {
  if (!story.is_published) return "draft";
  return story.publish_at && new Date(story.publish_at).getTime() > now ? "scheduled" : "published";
}

export const STATUS_LABEL: Record<StoryStatus, string> = {
  published: "Published",
  draft: "Draft",
  scheduled: "Scheduled",
};

export interface MissingSource {
  chapter_count: number;
  summary: string | null;
  retrospective: string | null;
  cover_image_url?: string | null;
}

/** Only what is actually missing, in a stable order. */
export function missingParts(story: MissingSource): string[] {
  const missing: string[] = [];
  if (!story.chapter_count) missing.push("chapters");
  if (!(story.summary ?? "").trim()) missing.push("summary");
  if (!(story.retrospective ?? "").trim()) missing.push("retro");
  if (!story.cover_image_url) missing.push("cover");
  return missing;
}

export type ReadyKey = "cover" | "about" | "author" | "genre" | "summary" | "chapters";

export interface ReadySource {
  cover_image_url?: string | null;
  about: string | null;
  author: number | null;
  genres: number[];
  summary: string | null;
  chapter_count: number;
}

export interface ReadyItem {
  key: ReadyKey;
  label: string;
  done: boolean;
}

/** The "Ready to publish" checklist, in display order. */
export function readyChecklist(story: ReadySource): ReadyItem[] {
  return [
    { key: "cover", label: "Cover image", done: Boolean(story.cover_image_url) },
    { key: "about", label: "About text", done: Boolean((story.about ?? "").trim()) },
    { key: "author", label: "Author", done: story.author !== null && story.author !== undefined },
    { key: "genre", label: "Genre", done: (story.genres ?? []).length > 0 },
    { key: "summary", label: "Summary", done: Boolean((story.summary ?? "").trim()) },
    { key: "chapters", label: "Chapters", done: story.chapter_count > 0 },
  ];
}

// --- the list's filters, kept in the URL -------------------------------------

export interface StoryListState {
  q: string;
  status: StatusFilter;
  needs: StoryNeed[];
  sort: StorySort;
}

export const DEFAULT_STORY_LIST: StoryListState = { q: "", status: "all", needs: [], sort: "newest" };

const STATUSES: StatusFilter[] = ["all", "published", "draft", "scheduled"];
const SORTS = STORY_SORTS.map((sort) => sort.value);

export function parseStoryListParams(params: URLSearchParams): StoryListState {
  const status = params.get("status") as StatusFilter | null;
  const sort = params.get("sort") as StorySort | null;
  const needs = (params.get("needs") ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token): token is StoryNeed => STORY_NEEDS.some((need) => need.key === token));
  return {
    q: (params.get("q") ?? "").trim(),
    status: status && STATUSES.includes(status) ? status : "all",
    needs: Array.from(new Set(needs)),
    sort: sort && SORTS.includes(sort) ? sort : "newest",
  };
}

/** Writes the list state onto `base`, keeping every other param (such as `storyId`); defaults are left out. */
export function buildStoryListParams(
  state: StoryListState,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const out = new URLSearchParams(base);
  for (const key of ["q", "status", "needs", "sort"]) out.delete(key);
  if (state.q) out.set("q", state.q);
  if (state.status !== "all") out.set("status", state.status);
  if (state.needs.length) out.set("needs", state.needs.join(","));
  if (state.sort !== "newest") out.set("sort", state.sort);
  return out;
}

export const hasActiveListFilters = (state: StoryListState) =>
  Boolean(state.q || state.status !== "all" || state.needs.length);

/** The API filters for a list state (see getAdminStories). */
export function toApiFilters(state: StoryListState) {
  const filters: {
    status?: StoryStatus;
    has_summary?: boolean;
    has_retrospective?: boolean;
    has_cover?: boolean;
    has_chapters?: boolean;
    sort?: StorySort;
  } = {};
  if (state.status !== "all") filters.status = state.status;
  for (const need of state.needs) filters[NEED_PARAM[need]] = false;
  if (state.sort !== "newest") filters.sort = state.sort;
  return filters;
}
