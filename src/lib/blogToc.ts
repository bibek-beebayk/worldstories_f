export interface BlogTocItem {
  id: string;
  label: string;
  level: 2;
}

export interface BlogTocResult {
  html: string;
  items: BlogTocItem[];
}

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));

const headingLabel = (html: string) =>
  decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();

const slugify = (label: string) =>
  label
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";

export function buildBlogToc(sanitizedHtml: string): BlogTocResult {
  const items: BlogTocItem[] = [];
  const used = new Set(Array.from(sanitizedHtml.matchAll(/<h2\b[^>]*\bid\s*=\s*(["'])(.*?)\1/gi), (match) => match[2]));
  const html = sanitizedHtml.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (heading, attributes: string, body: string) => {
    const label = headingLabel(body);
    if (!label) return heading;

    const existing = attributes.match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2];
    let id = existing || slugify(label);
    if (!existing) {
      const base = id;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
    }
    used.add(id);
    items.push({ id, label, level: 2 });

    return existing ? heading : `<h2${attributes} id="${id}">${body}</h2>`;
  });

  return { html, items };
}
