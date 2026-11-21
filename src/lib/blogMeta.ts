import type { Blog } from "@/api/types";
import { SITE_URL } from "@/lib/buildMeta";
import { plainText } from "@/lib/plainText";

export function buildBlogStructuredData(blog: Blog) {
  const blogPath = `/blog/${blog.slug}`;
  const topicNames = (blog.topics ?? []).map((topic) => topic.name);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: blog.title,
        datePublished: blog.published_at,
        dateModified: blog.updated_at,
        author: blog.author_name ? { "@type": "Person", name: blog.author_name } : undefined,
        image: blog.cover_image || undefined,
        url: `${SITE_URL}${blogPath}`,
        articleBody: plainText(blog.content).slice(0, 5000),
        articleSection: topicNames[0] || undefined,
        keywords: topicNames.length ? topicNames.join(", ") : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE_URL}/blog` },
          {
            "@type": "ListItem",
            position: 2,
            name: blog.title,
            item: `${SITE_URL}${blogPath}`,
          },
        ],
      },
    ],
  };
}
