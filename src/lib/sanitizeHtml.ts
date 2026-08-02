import DOMPurify from "dompurify";

export function sanitizeHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html || "", {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"],
  });
}
