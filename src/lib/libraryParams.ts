// The Library's whole state lives in the URL. This module is the one place that
// knows the param names: it reads a URLSearchParams into a typed filter object
// (accepting the links that already exist in the wild), writes it back in its
// canonical short form, and translates it into the story-list API's own params.

export const FORMAT_KEYS = ["read", "listen", "read_along", "watch", "quick_read"] as const;
export type LibraryFormat = (typeof FORMAT_KEYS)[number];
export const LENGTH_KEYS = ["under_10", "10_60", "1_5h", "5h_plus"] as const;
export type LibraryLength = (typeof LENGTH_KEYS)[number];
export const SORT_KEYS = ["popular", "newest", "title", "shortest", "rating"] as const;
export type LibrarySort = (typeof SORT_KEYS)[number];
export type LibraryView = "grid" | "list";
export type LibraryStatus = "completed" | "ongoing";

export const DEFAULT_SORT: LibrarySort = "popular";
export const DEFAULT_VIEW: LibraryView = "grid";

export interface LibraryFilters {
  q: string;
  /** "" = All formats. */
  format: LibraryFormat | "";
  /** Slugs (or legacy numeric ids from old links). */
  genre: string[];
  category: string[];
  language: string;
  length: LibraryLength | "";
  /** At most this many minutes (the Discover finder's time chips). */
  maxMinutes: string;
  country: string;
  /** Story type id. */
  type: string;
  status: LibraryStatus | "";
  original: boolean;
  /** Mood slugs. */
  mood: string[];
  /** Author id, set by the featured-author collection. */
  author: string;
  sort: LibrarySort;
  view: LibraryView;
}

export const EMPTY_FILTERS: LibraryFilters = {
  q: "",
  format: "",
  genre: [],
  category: [],
  language: "",
  length: "",
  maxMinutes: "",
  country: "",
  type: "",
  status: "",
  original: false,
  mood: [],
  author: "",
  sort: DEFAULT_SORT,
  view: DEFAULT_VIEW,
};

const list = (raw: string | null) =>
  (raw ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | "" =>
  allowed.includes(value as T) ? (value as T) : "";

const normalizeFormat = (value: string | null): LibraryFormat | "" =>
  oneOf((value ?? "").trim().toLowerCase().replace(/-/g, "_"), FORMAT_KEYS);

// Sorts the old page, or a hand-edited URL, might carry.
const LEGACY_SORTS: Record<string, LibrarySort> = { recent: "newest", views: "popular", top_rated: "rating" };

/**
 * Reads the URL. Old links keep working: `mode=read` / `mode=read-along` become
 * the format tab, `moods` is `mood`, `story_type` is `type`, and a numeric
 * `genre` / `category` (an id, as the old page used) is kept as given — the API
 * accepts a slug or an id.
 */
export function parseLibraryParams(params: URLSearchParams): LibraryFilters {
  const legacyMode = params.get("mode");
  const format =
    normalizeFormat(params.get("format")) ||
    (legacyMode === "read" ? "read" : legacyMode === "read-along" ? "read_along" : "");
  const sortRaw = params.get("sort") ?? "";
  const sort = oneOf(sortRaw, SORT_KEYS) || LEGACY_SORTS[sortRaw] || DEFAULT_SORT;
  const status = params.get("status");

  return {
    q: (params.get("q") ?? "").trim(),
    format,
    genre: list(params.get("genre")),
    category: list(params.get("category")),
    language: params.get("language") && params.get("language") !== "all" ? (params.get("language") as string) : "",
    length: oneOf(params.get("length"), LENGTH_KEYS),
    maxMinutes: /^\d+$/.test(params.get("max_minutes") ?? "") ? (params.get("max_minutes") as string) : "",
    country: params.get("country") && params.get("country") !== "all" ? (params.get("country") as string).toUpperCase() : "",
    type: params.get("type") ?? (params.get("story_type") && params.get("story_type") !== "all" ? (params.get("story_type") as string) : ""),
    status: status === "completed" || status === "ongoing" ? status : "",
    original: params.get("original") === "true" || params.get("original") === "1",
    mood: list(params.get("mood") ?? params.get("moods")),
    author: params.get("author") ?? "",
    sort,
    view: params.get("view") === "list" ? "list" : DEFAULT_VIEW,
  };
}

/** The canonical, minimal query string for a state (defaults are left out). */
export function buildLibraryParams(filters: LibraryFilters): URLSearchParams {
  const out = new URLSearchParams();
  if (filters.q) out.set("q", filters.q);
  if (filters.format) out.set("format", filters.format);
  if (filters.genre.length) out.set("genre", filters.genre.join(","));
  if (filters.category.length) out.set("category", filters.category.join(","));
  if (filters.language) out.set("language", filters.language);
  if (filters.length) out.set("length", filters.length);
  if (filters.maxMinutes) out.set("max_minutes", filters.maxMinutes);
  if (filters.country) out.set("country", filters.country);
  if (filters.type) out.set("type", filters.type);
  if (filters.status) out.set("status", filters.status);
  if (filters.original) out.set("original", "true");
  if (filters.mood.length) out.set("mood", filters.mood.join(","));
  if (filters.author) out.set("author", filters.author);
  if (filters.sort !== DEFAULT_SORT) out.set("sort", filters.sort);
  if (filters.view !== DEFAULT_VIEW) out.set("view", filters.view);
  return out;
}

/** The params the story-list endpoint (and /stories/facets/) understand. */
export function toApiParams(filters: LibraryFilters, options: { includeFormat?: boolean } = {}): Record<string, string> {
  const { includeFormat = true } = options;
  const api: Record<string, string> = {};
  if (filters.q) api.q = filters.q;
  if (includeFormat && filters.format) api.format = filters.format;
  if (filters.genre.length) api.genre = filters.genre.join(",");
  if (filters.category.length) api.category = filters.category.join(",");
  if (filters.language) api.language = filters.language;
  if (filters.length) api.length = filters.length;
  if (filters.maxMinutes) api.max_minutes = filters.maxMinutes;
  if (filters.country) api.country = filters.country;
  if (filters.type) api.story_type = filters.type;
  if (filters.status) api.status = filters.status;
  if (filters.original) api.original = "true";
  if (filters.mood.length) api.moods = filters.mood.join(",");
  if (filters.author) api.author = filters.author;
  api.sort = filters.sort;
  return api;
}

/** How many facet-style filters are on (the "Filters (N)" badge). */
export function activeFilterCount(filters: LibraryFilters): number {
  return (
    filters.genre.length +
    filters.category.length +
    filters.mood.length +
    (filters.language ? 1 : 0) +
    (filters.length ? 1 : 0) +
    (filters.maxMinutes ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.original ? 1 : 0) +
    (filters.author ? 1 : 0)
  );
}

/**
 * Whether anything narrows the catalogue beyond the format tab — a search or
 * any facet. The collections strip is shown only when this is false. The format
 * tab is deliberately not counted: it is a lens on the whole library, not a filter.
 */
export function hasNarrowingFilters(filters: LibraryFilters): boolean {
  return activeFilterCount(filters) > 0 || filters.q.length > 0;
}

/** Applies a collection tile's params (API vocabulary) on top of a clean slate, keeping format, sort and view. */
export function applyCollectionParams(current: LibraryFilters, params: Record<string, string>): LibraryFilters {
  return {
    ...EMPTY_FILTERS,
    format: current.format,
    sort: current.sort,
    view: current.view,
    original: params.original === "true",
    language: params.language ?? "",
    length: oneOf(params.length ?? null, LENGTH_KEYS),
    country: params.country ?? "",
    author: params.author ?? "",
    genre: list(params.genre ?? null),
    category: list(params.category ?? null),
  };
}

/**
 * The URL a filtered view should declare as canonical: a single genre or
 * category (and nothing else) belongs to its own landing page; every other
 * filtered view is a variation of /library.
 */
export function canonicalPathFor(params: URLSearchParams, slugs: { genre?: string; category?: string } = {}): string {
  const filters = parseLibraryParams(params);
  const bare = { ...filters, sort: DEFAULT_SORT, view: DEFAULT_VIEW };
  const onlyGenre = bare.genre.length === 1 && buildLibraryParams({ ...bare, genre: [] }).toString() === "";
  const onlyCategory = bare.category.length === 1 && buildLibraryParams({ ...bare, category: [] }).toString() === "";
  if (onlyGenre && (slugs.genre ?? (/^\d+$/.test(bare.genre[0]) ? "" : bare.genre[0]))) {
    return `/genre/${slugs.genre ?? bare.genre[0]}`;
  }
  if (onlyCategory && (slugs.category ?? (/^\d+$/.test(bare.category[0]) ? "" : bare.category[0]))) {
    return `/category/${slugs.category ?? bare.category[0]}`;
  }
  return "/library";
}
