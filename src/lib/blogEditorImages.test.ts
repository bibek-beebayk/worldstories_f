// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeBlogContent, sanitizeHtml } from "@/lib/sanitizeHtml";
import {
  buildFigureHtml,
  countImagesMissingAlt,
  findUploadingPlaceholders,
  setFigureAlign,
  setFigureAlt,
  setFigureCaption,
  setFigureSize,
  validateBlogImageFile,
} from "@/lib/blogEditorImages";

describe("sanitizeHtml & sanitizeBlogContent for blog figures", () => {
  it("preserves figure, img with alt/dimensions/loading/decoding, and figcaption", () => {
    const raw =
      '<figure class="ws-fig ws-size-wide ws-align-center"><img src="https://cdn.example.com/pic.webp" alt="Reading nook" width="1200" height="800" loading="lazy" decoding="async" /><figcaption>A quiet corner</figcaption></figure>';
    const cleaned = sanitizeBlogContent(raw);
    expect(cleaned).toContain('<figure class="ws-fig ws-size-wide ws-align-center">');
    expect(cleaned).toContain('src="https://cdn.example.com/pic.webp"');
    expect(cleaned).toContain('alt="Reading nook"');
    expect(cleaned).toContain('width="1200"');
    expect(cleaned).toContain('height="800"');
    expect(cleaned).toContain('loading="lazy"');
    expect(cleaned).toContain('decoding="async"');
    expect(cleaned).toContain("<figcaption>A quiet corner</figcaption>");
  });

  it("preserves relative image URLs", () => {
    const cleaned = sanitizeHtml('<img src="/media/blog_images/2026/11/a.webp" alt="Local" loading="eager" />');
    expect(cleaned).toContain('src="/media/blog_images/2026/11/a.webp"');
    expect(cleaned).toContain('loading="eager"');
  });

  it("strips onerror, javascript: src, data: src, and invalid loading attribute", () => {
    const bad =
      '<figure class="ws-fig"><img src="javascript:alert(1)" onerror="alert(2)" loading="bogus" alt="x" /><img src="data:image/png;base64,AAAA" alt="y" /></figure>';
    const cleaned = sanitizeBlogContent(bad);
    expect(cleaned).not.toContain("onerror");
    expect(cleaned).not.toContain("javascript:");
    expect(cleaned).not.toContain("data:");
    expect(cleaned).not.toContain("bogus");
  });
});

describe("blogEditorImages pure helpers", () => {
  it("buildFigureHtml escapes special characters and omits empty figcaption", () => {
    const noCap = buildFigureHtml({
      url: "https://cdn.example.com/a.webp",
      alt: 'Book "Quotes" <test>',
      caption: "   ",
      width: 1200,
      height: 800,
      size: "small",
      align: "left",
    });
    expect(noCap).toContain('class="ws-fig ws-size-small ws-align-left"');
    expect(noCap).toContain('alt="Book &quot;Quotes&quot; &lt;test&gt;"');
    expect(noCap).not.toContain("<figcaption>");

    const withCap = buildFigureHtml({
      url: "https://cdn.example.com/a.webp",
      alt: "Cover",
      caption: "Photo & credit <script>",
    });
    expect(withCap).toContain("<figcaption>Photo &amp; credit &lt;script&gt;</figcaption>");
  });

  it("updates size, align, alt, and caption on an existing figure element", () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildFigureHtml({
      url: "https://cdn.example.com/a.webp",
      alt: "Initial",
      caption: "First caption",
    });
    const fig = wrapper.querySelector("figure")!;

    setFigureSize(fig, "full");
    expect(fig.classList.contains("ws-size-full")).toBe(true);
    expect(fig.classList.contains("ws-size-wide")).toBe(false);

    setFigureAlign(fig, "left");
    expect(fig.classList.contains("ws-align-left")).toBe(true);
    expect(fig.classList.contains("ws-align-center")).toBe(false);

    setFigureAlt(fig, "Updated alt");
    expect(fig.querySelector("img")?.getAttribute("alt")).toBe("Updated alt");

    setFigureCaption(fig, "New caption");
    expect(fig.querySelector("figcaption")?.textContent).toBe("New caption");

    setFigureCaption(fig, "   ");
    expect(fig.querySelector("figcaption")).toBeNull();
  });

  it("counts images missing alt text and ignores uploading placeholders", () => {
    const html = [
      '<figure class="ws-fig"><img src="https://x.com/1.webp" alt="Has alt" /></figure>',
      '<figure class="ws-fig"><img src="https://x.com/2.webp" alt="" /></figure>',
      '<figure class="ws-fig"><img src="https://x.com/3.webp" /></figure>',
      '<figure class="ws-fig" data-upload-id="u1" data-uploading="true"><img src="blob:123" alt="" /></figure>',
    ].join("");
    expect(countImagesMissingAlt(html)).toBe(2);
  });

  it("finds uploading placeholders inside a container", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<p>Hi</p><figure data-upload-id="up-1" data-uploading="true"></figure><figure class="ws-fig"><img src="/a.webp" alt="ok" /></figure>';
    expect(findUploadingPlaceholders(root)).toHaveLength(1);
  });

  it("validates image file type and size", () => {
    const ok = new File([new Uint8Array(100)], "a.jpg", { type: "image/jpeg" });
    expect(validateBlogImageFile(ok)).toBeNull();

    const badType = new File([new Uint8Array(100)], "a.pdf", { type: "application/pdf" });
    expect(validateBlogImageFile(badType)).toMatch(/Unsupported image format/i);

    const tooBig = new File([new Uint8Array(10)], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(tooBig, "size", { value: 9 * 1024 * 1024 });
    expect(validateBlogImageFile(tooBig)).toMatch(/8 MB/i);
  });
});
