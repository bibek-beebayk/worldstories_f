import type { Blog } from "@/api/types";
import { buildBlogStructuredData } from "@/lib/blogMeta";
import { describe, expect, it } from "vitest";

const blog: Blog = {
  id: 1,
  slug: "a-post",
  title: "A Post",
  excerpt: null,
  content: "<p>Body</p>",
  cover_image: "",
  author_name: "Ada",
  topics: [{ name: "Folklore", slug: "folklore" }],
  published_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
};

describe("buildBlogStructuredData", () => {
  it("builds BlogPosting and breadcrumb graph entries with topic metadata", () => {
    const result = buildBlogStructuredData(blog);
    expect(result["@graph"].map((entry) => entry["@type"])).toEqual(["BlogPosting", "BreadcrumbList"]);
    expect(result["@graph"][0]).toMatchObject({
      headline: "A Post",
      datePublished: blog.published_at,
      dateModified: blog.updated_at,
      articleBody: "Body",
      articleSection: "Folklore",
      keywords: "Folklore",
    });
    expect(result["@graph"][1].itemListElement).toHaveLength(2);
  });
});
