import { useEffect } from "react";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://worldstories-f.netlify.app")
  .replace(/\/+$/, "");
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: "website" | "article" | "book";
  noIndex?: boolean;
  structuredData?: Record<string, unknown>;
}

function setMeta(selector: string, attribute: "name" | "property", value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, selector.match(/["'](.+)["']/)?.[1] || "");
    document.head.appendChild(element);
  }
  element.content = value;
}

export default function Seo({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noIndex = false,
  structuredData,
}: SeoProps) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
    const socialImage = image || DEFAULT_IMAGE;

    document.title = title;
    setMeta('meta[name="description"]', "name", description);
    setMeta(
      'meta[name="robots"]',
      "name",
      noIndex ? "noindex, nofollow" : "index, follow"
    );
    setMeta('meta[property="og:title"]', "property", title);
    setMeta('meta[property="og:description"]', "property", description);
    setMeta('meta[property="og:type"]', "property", type);
    setMeta('meta[property="og:url"]', "property", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", socialImage);
    setMeta('meta[name="twitter:card"]', "name", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", title);
    setMeta('meta[name="twitter:description"]', "name", description);
    setMeta('meta[name="twitter:image"]', "name", socialImage);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const scriptId = "worldstories-structured-data";
    document.getElementById(scriptId)?.remove();
    if (structuredData) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.text = JSON.stringify(structuredData).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [description, image, noIndex, path, structuredData, title, type]);

  return null;
}

export { SITE_URL };
