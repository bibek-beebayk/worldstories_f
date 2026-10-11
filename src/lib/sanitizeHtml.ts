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

// `style` is stripped (above), but pasted rich text often carries its bold/
// italic formatting *only* in inline styles — Google Docs wraps a whole paste
// in `<b style="font-weight:normal">`, and copying from a web page gives
// `<span style="font-weight: bolder">`. The admin editor renders those styles,
// the reader (without them) would not, so the same chapter looked different
// in each — e.g. entirely bold in the reader. Before the style is dropped,
// its formatting is turned into the equivalent tag so both agree.
const BOLD_WEIGHT = /^(bold|bolder|[6-9]00)$/;
const NORMAL_WEIGHT = /^(normal|lighter|[1-5]00)$/;

const styleValue = (style: string | undefined, property: string) => {
  const match = style?.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;!]+)`, "i"));
  return match ? match[1].trim().toLowerCase() : null;
};

// Bold/italic tags whose style switches the formatting back off render as
// plain text; any other tag whose style turns formatting on becomes the
// matching tag. One tag per element, so bold wins over italic when a single
// element sets both.
const styleToSemanticTag: sanitizeHtmlLib.Transformer = (tagName, attribs) => {
  const weight = styleValue(attribs.style, "font-weight");
  const fontStyle = styleValue(attribs.style, "font-style");
  const isBoldTag = tagName === "b" || tagName === "strong";
  const isItalicTag = tagName === "i" || tagName === "em";

  if (isBoldTag && weight && NORMAL_WEIGHT.test(weight)) return { tagName: "span", attribs };
  if (isItalicTag && fontStyle === "normal") return { tagName: "span", attribs };
  if (tagName === "span" || tagName === "font") {
    if (weight && BOLD_WEIGHT.test(weight)) return { tagName: "strong", attribs };
    if (fontStyle === "italic" || fontStyle === "oblique") return { tagName: "em", attribs };
  }
  return { tagName, attribs };
};

const STYLE_TRANSFORMS: Record<string, sanitizeHtmlLib.Transformer> = {
  b: styleToSemanticTag,
  strong: styleToSemanticTag,
  i: styleToSemanticTag,
  em: styleToSemanticTag,
  span: styleToSemanticTag,
  font: styleToSemanticTag,
};

export function sanitizeHtml(html: string | null | undefined): string {
  return sanitizeHtmlLib(html || "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // Default safe schemes (http/https/mailto/tel/etc.) — blocks
    // javascript: URLs the same way DOMPurify does.
    allowedSchemes: sanitizeHtmlLib.defaults.allowedSchemes,
    disallowedTagsMode: "discard",
    transformTags: STYLE_TRANSFORMS,
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
      ...STYLE_TRANSFORMS,
      h1: "h2",
    },
  });
}
