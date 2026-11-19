// The blog list's state lives in the URL: `topic`, `sort`, `q` and `page`.
// `page` is how many pages of posts are showing (Load more raises it), so a
// pasted `?page=3` reproduces the same three pages.

export type BlogSort = "newest" | "popular";

export interface BlogListState {
  topic: string;
  sort: BlogSort;
  q: string;
  page: number;
}

export const DEFAULT_BLOG_STATE: BlogListState = { topic: "", sort: "newest", q: "", page: 1 };
const MAX_PAGE = 50;

export function parseBlogParams(params: URLSearchParams): BlogListState {
  const page = Number.parseInt(params.get("page") ?? "", 10);
  const sort = params.get("sort");
  return {
    topic: (params.get("topic") ?? "").trim(),
    // The old "oldest first" link degrades to the default rather than an empty page.
    sort: sort === "popular" ? "popular" : "newest",
    q: (params.get("q") ?? "").trim(),
    page: Number.isFinite(page) && page > 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

/** Defaults are left out, so the bare blog URL stays /blog. */
export function buildBlogParams(state: BlogListState): URLSearchParams {
  const out = new URLSearchParams();
  if (state.topic) out.set("topic", state.topic);
  if (state.sort !== "newest") out.set("sort", state.sort);
  if (state.q) out.set("q", state.q);
  if (state.page > 1) out.set("page", String(state.page));
  return out;
}

/** The featured row (featured post + most read) is the blog's front page: hidden once a topic or search narrows it. */
export const isBlogFiltered = (state: BlogListState) => Boolean(state.topic || state.q);

/** "N reads" / "1 read". */
export const formatReads = (count: number) => `${count.toLocaleString()} ${count === 1 ? "read" : "reads"}`;

/** "8 min read", or null when the length is unknown. */
export const formatBlogReadTime = (minutes: number | null | undefined) =>
  typeof minutes === "number" && minutes > 0 ? `${minutes} min read` : null;
