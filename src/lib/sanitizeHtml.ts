// Was `isomorphic-dompurify` (DOMPurify + jsdom) — replaced because jsdom's
// CSS color parsing (cssstyle -> @asamuzakjp/css-color) requires an
// ESM-only package (@csstools/css-calc) from a CommonJS entry point, which
// Node cannot do. Every jsdom version pulls this in, so no version pin
// avoids it; it crashed the deployed SSR function on every request that
// rendered chapter content. `sanitize-html` has no DOM dependency at all,
// so this whole class of bug can't recur here.
import sanitizeHtmlLib from "sanitize-html";

// A broad, non-dangerous body-content tag set — deliberately permissive
// (matches DOMPurify's USE_PROFILES: { html: true } baseline) since chapter
// content is real prose with headings/images/tables/etc., not a narrow
// comment-box use case. script/style/iframe/object/embed/form are excluded
// on purpose, mirroring the previous FORBID_TAGS list.
const ALLOWED_TAGS = [
  "a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote",
  "br", "caption", "cite", "code", "col", "colgroup", "data", "dd", "del",
  "details", "dfn", "div", "dl", "dt", "em", "figcaption", "figure", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "i", "img", "ins",
  "kbd", "li", "main", "mark", "nav", "ol", "p", "pre", "q", "rp", "rt",
  "ruby", "s", "samp", "section", "small", "span", "strong", "sub", "summary",
  "sup", "table", "tbody", "td", "tfoot", "th", "thead", "time", "tr", "u",
  "ul", "var", "wbr",
];

// `style` is deliberately excluded (mirrors the previous FORBID_ATTR), and
// no `on*` event-handler attribute is ever included here on purpose.
const ALLOWED_ATTRIBUTES: sanitizeHtmlLib.IOptions["allowedAttributes"] = {
  "*": ["class", "id", "title", "lang", "dir"],
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  time: ["datetime"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["start", "type"],
};

export function sanitizeHtml(html: string | null | undefined): string {
  return sanitizeHtmlLib(html || "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // Default safe schemes (http/https/mailto/tel/etc.) — blocks
    // javascript: URLs the same way DOMPurify does.
    allowedSchemes: sanitizeHtmlLib.defaults.allowedSchemes,
    disallowedTagsMode: "discard",
  });
}

// Blog post bodies render inside a page that already has its own <h1> (the
// post title, set separately from this content) — an admin authoring a post
// in the rich-text editor can still put an <h1> in the body itself, which
// would give the rendered page two, muddying the heading hierarchy signal
// search engines use. Demoting it to <h2> here (render time only — the
// stored content is left exactly as authored) fixes that without touching
// what the admin sees while editing.
export function sanitizeBlogContent(html: string | null | undefined): string {
  return sanitizeHtmlLib(html || "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: sanitizeHtmlLib.defaults.allowedSchemes,
    disallowedTagsMode: "discard",
    transformTags: {
      h1: "h2",
    },
  });
}
