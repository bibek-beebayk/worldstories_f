// Builds a complete React Router `meta()` descriptor array — the SSR
// replacement for the old client-only <Seo> component (still used by pages
// not yet converted). React Router replaces rather than merges meta() across
// matched routes, so this always returns a full, self-contained tag set;
// there's no parent meta to inherit from.
const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://worldstories.net").replace(
  /\/+$/,
  ""
);
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface AlternateLanguage {
  language: string;
  path: string;
}

interface ArticleMeta {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

export interface BuildMetaOptions {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: "website" | "article" | "book";
  noIndex?: boolean;
  structuredData?: Record<string, unknown>;
  alternateLanguages?: AlternateLanguage[];
  // Emits the article: namespace OG tags (only meaningful — and only
  // rendered — alongside type: "article").
  article?: ArticleMeta;
}

export function buildMeta({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noIndex = false,
  structuredData,
  alternateLanguages,
  article,
}: BuildMetaOptions) {
  const canonicalUrl = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const socialImage = image || DEFAULT_IMAGE;

  const tags: Record<string, unknown>[] = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: noIndex ? "noindex, nofollow" : "index, follow" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:site_name", content: "WorldStories" },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: socialImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: socialImage },
    { tagName: "link", rel: "canonical", href: canonicalUrl },
  ];

  if (type === "article" && article) {
    if (article.publishedTime) {
      tags.push({ property: "article:published_time", content: article.publishedTime });
    }
    if (article.modifiedTime) {
      tags.push({ property: "article:modified_time", content: article.modifiedTime });
    }
    if (article.author) {
      tags.push({ property: "article:author", content: article.author });
    }
  }

  for (const alt of alternateLanguages || []) {
    tags.push({
      tagName: "link",
      rel: "alternate",
      hrefLang: alt.language,
      href: `${SITE_URL}${alt.path.startsWith("/") ? alt.path : `/${alt.path}`}`,
    });
  }

  if (structuredData) {
    tags.push({ "script:ld+json": structuredData });
  }

  return tags;
}

export { SITE_URL };
