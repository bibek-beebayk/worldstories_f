import { formatDistanceToNow } from "date-fns";
import type { AdminBlog, AdminBlogListParams } from "@/api/types";

export type BlogStatus = "published" | "draft" | "scheduled";
export type BlogStatusFilter = "all" | BlogStatus;
export type BlogSort = "newest" | "oldest" | "updated" | "title_asc" | "title_desc";
export type BlogNeed = "excerpt" | "topics" | "cover" | "linked_stories";

export const BLOG_SORTS: { value: BlogSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Recently updated" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
];

export const BLOG_NEEDS: { key: Exclude<BlogNeed, "linked_stories">; label: string }[] = [
  { key: "excerpt", label: "No excerpt" },
  { key: "topics", label: "No topics" },
  { key: "cover", label: "No cover" },
];

const ALL_NEEDS: BlogNeed[] = ["excerpt", "topics", "cover", "linked_stories"];

export const BLOG_NEED_PARAM: Record<BlogNeed, "has_excerpt" | "has_topics" | "has_cover" | "has_linked_stories"> = {
  excerpt: "has_excerpt",
  topics: "has_topics",
  cover: "has_cover",
  linked_stories: "has_linked_stories",
};

export function blogStatus(blog: Pick<AdminBlog, "is_published" | "publish_at">, now: number = Date.now()): BlogStatus {
  if (!blog.is_published) return "draft";
  if (blog.publish_at) {
    const ts = new Date(blog.publish_at).getTime();
    if (!Number.isNaN(ts) && ts > now) return "scheduled";
  }
  return "published";
}

export function missingBlogParts(
  blog: Pick<AdminBlog, "excerpt" | "topics" | "topic_details" | "cover_image_url">,
): string[] {
  const missing: string[] = [];
  if (!(blog.excerpt ?? "").trim()) missing.push("excerpt");
  const topicCount = blog.topic_details ? blog.topic_details.length : (blog.topics ?? []).length;
  if (topicCount === 0) missing.push("topics");
  if (!blog.cover_image_url) missing.push("cover");
  return missing;
}

export function formatScheduledDate(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export interface BlogListState {
  page: number;
  q: string;
  status: BlogStatusFilter;
  needs: BlogNeed[];
  topic: number | null;
  sort: BlogSort;
}

export const DEFAULT_BLOG_LIST: BlogListState = {
  page: 1,
  q: "",
  status: "all",
  needs: [],
  topic: null,
  sort: "newest",
};

const STATUSES: BlogStatusFilter[] = ["all", "published", "draft", "scheduled"];
const SORTS = BLOG_SORTS.map((sort) => sort.value);

export function parseBlogListParams(params: URLSearchParams): BlogListState {
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const status = params.get("status") as BlogStatusFilter | null;
  const sort = params.get("sort") as BlogSort | null;
  const rawTopic = params.get("topic");
  const parsedTopic = rawTopic && /^\d+$/.test(rawTopic) ? Number(rawTopic) : null;
  const needs = (params.get("needs") ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token): token is BlogNeed => ALL_NEEDS.includes(token as BlogNeed));

  return {
    page,
    q: (params.get("q") ?? "").trim(),
    status: status && STATUSES.includes(status) ? status : "all",
    needs: Array.from(new Set(needs)),
    topic: parsedTopic,
    sort: sort && SORTS.includes(sort) ? sort : "newest",
  };
}

export function buildBlogListParams(
  state: BlogListState,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const out = new URLSearchParams(base);
  for (const key of ["page", "q", "status", "needs", "topic", "sort"]) out.delete(key);
  if (state.page > 1) out.set("page", String(state.page));
  if (state.q) out.set("q", state.q);
  if (state.status !== "all") out.set("status", state.status);
  if (state.needs.length > 0) out.set("needs", state.needs.join(","));
  if (state.topic !== null) out.set("topic", String(state.topic));
  if (state.sort !== "newest") out.set("sort", state.sort);
  return out;
}

export function hasActiveBlogFilters(state: BlogListState): boolean {
  return Boolean(
    state.q || state.status !== "all" || state.needs.length > 0 || state.topic !== null || state.sort !== "newest",
  );
}

export function toBlogApiParams(state: BlogListState): AdminBlogListParams {
  const params: AdminBlogListParams = {
    page: state.page,
  };
  if (state.q) params.search = state.q;
  if (state.status !== "all") params.status = state.status;
  for (const need of state.needs) {
    params[BLOG_NEED_PARAM[need]] = false;
  }
  if (state.topic !== null) params.topic = state.topic;
  if (state.sort !== "newest") params.sort = state.sort;
  return params;
}
