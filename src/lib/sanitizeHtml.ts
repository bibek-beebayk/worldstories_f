// Plain `dompurify` needs a real `window`/`document` and throws under SSR
// (Node has neither) — this wraps it with jsdom so the exact same
// sanitization actually runs server-side too, now that chapter/story body
// content renders there (see subtask 5).
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html || "", {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"],
  });
}
