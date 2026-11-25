export type BlogImageSize = "small" | "wide" | "full";
export type BlogImageAlign = "left" | "center";

export interface BuildFigureOptions {
  url: string;
  alt: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
  size?: BlogImageSize;
  align?: BlogImageAlign;
}

export interface FigureMeta {
  src: string;
  alt: string;
  caption: string;
  size: BlogImageSize;
  align: BlogImageAlign;
  width: number | null;
  height: number | null;
}

export const MAX_BLOG_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const SIZE_CLASSES: Record<BlogImageSize, string> = {
  small: "ws-size-small",
  wide: "ws-size-wide",
  full: "ws-size-full",
};

const ALIGN_CLASSES: Record<BlogImageAlign, string> = {
  left: "ws-align-left",
  center: "ws-align-center",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildFigureHtml(opts: BuildFigureOptions): string {
  const size: BlogImageSize = opts.size ?? "wide";
  const align: BlogImageAlign = opts.align ?? "center";
  const classes = ["ws-fig", SIZE_CLASSES[size], ALIGN_CLASSES[align]].join(" ");
  const src = escapeHtml(opts.url.trim());
  const alt = escapeHtml(opts.alt.trim());
  const widthAttr =
    typeof opts.width === "number" && Number.isFinite(opts.width) && opts.width > 0
      ? ` width="${Math.round(opts.width)}"`
      : "";
  const heightAttr =
    typeof opts.height === "number" && Number.isFinite(opts.height) && opts.height > 0
      ? ` height="${Math.round(opts.height)}"`
      : "";
  const captionText = (opts.caption ?? "").trim();
  const figcaptionHtml = captionText ? `<figcaption>${escapeHtml(captionText)}</figcaption>` : "";

  return `<figure class="${classes}"><img src="${src}" alt="${alt}"${widthAttr}${heightAttr} loading="lazy" decoding="async" />${figcaptionHtml}</figure>`;
}

export function setFigureSize(figure: HTMLElement, size: BlogImageSize): void {
  figure.classList.add("ws-fig");
  figure.classList.remove("ws-size-small", "ws-size-wide", "ws-size-full");
  figure.classList.add(SIZE_CLASSES[size]);
}

export function setFigureAlign(figure: HTMLElement, align: BlogImageAlign): void {
  figure.classList.add("ws-fig");
  figure.classList.remove("ws-align-left", "ws-align-center");
  figure.classList.add(ALIGN_CLASSES[align]);
}

export function setFigureAlt(figure: HTMLElement, alt: string): void {
  const img = figure.querySelector("img");
  if (!img) return;
  img.setAttribute("alt", alt.trim());
}

export function setFigureCaption(figure: HTMLElement, caption: string): void {
  const trimmed = caption.trim();
  const existing = figure.querySelector("figcaption");
  if (!trimmed) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.textContent = trimmed;
    return;
  }
  const doc = figure.ownerDocument || document;
  const cap = doc.createElement("figcaption");
  cap.textContent = trimmed;
  figure.appendChild(cap);
}

export function getFigureMeta(figure: HTMLElement): FigureMeta {
  const img = figure.querySelector("img");
  const cap = figure.querySelector("figcaption");
  const size: BlogImageSize = figure.classList.contains("ws-size-small")
    ? "small"
    : figure.classList.contains("ws-size-full")
      ? "full"
      : "wide";
  const align: BlogImageAlign = figure.classList.contains("ws-align-left") ? "left" : "center";
  const rawW = img?.getAttribute("width");
  const rawH = img?.getAttribute("height");
  const width = rawW ? Number(rawW) : null;
  const height = rawH ? Number(rawH) : null;
  return {
    src: img?.getAttribute("src") ?? "",
    alt: img?.getAttribute("alt") ?? "",
    caption: cap?.textContent?.trim() ?? "",
    size,
    align,
    width: width && Number.isFinite(width) ? width : null,
    height: height && Number.isFinite(height) ? height : null,
  };
}

export function countImagesMissingAlt(html: string): number {
  if (!html) return 0;
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    let count = 0;
    doc.querySelectorAll("img").forEach((img) => {
      if (img.closest('[data-uploading="true"], [data-upload-id]')) return;
      const alt = img.getAttribute("alt");
      if (!alt || !alt.trim()) count += 1;
    });
    return count;
  }

  // Fallback for non-DOM environments: inspect <img ...> tags outside uploading figures.
  const withoutUploading = html.replace(/<figure\b[^>]*\bdata-upload(?:ing|(?:-id))[^>]*>[\s\S]*?<\/figure>/gi, "");
  const imgMatches = withoutUploading.match(/<img\b[^>]*>/gi) ?? [];
  let missing = 0;
  for (const tag of imgMatches) {
    const altMatch = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const altVal = altMatch ? (altMatch[1] ?? altMatch[2] ?? altMatch[3] ?? "") : "";
    if (!altVal.trim()) missing += 1;
  }
  return missing;
}

export function findUploadingPlaceholders(root: ParentNode | null | undefined): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>('[data-upload-id], [data-uploading="true"]'));
}

export function validateBlogImageFile(file: File): string | null {
  if (!file) return "Please choose an image file to upload.";
  if (file.type && !ALLOWED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
    return "Unsupported image format. Please upload a JPG, PNG, WebP, or GIF image.";
  }
  if (!file.type) {
    const lower = file.name.toLowerCase();
    if (!/\.(jpe?g|png|webp|gif)$/.test(lower)) {
      return "Unsupported image format. Please upload a JPG, PNG, WebP, or GIF image.";
    }
  }
  if (file.size > MAX_BLOG_IMAGE_BYTES) {
    return "Image is too large. Maximum file size is 8 MB.";
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isValidImageUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
