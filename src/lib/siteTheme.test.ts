import { describe, expect, it } from "vitest";
import type { PublicSiteTheme } from "@/api/types";
import { pickLook, SITE_THEME } from "@/components/pages/pageTheme";
import { pathMatches, pickSiteTheme, siteThemeCss } from "./siteTheme";

const theme = (id: number, overrides: Partial<PublicSiteTheme> = {}): PublicSiteTheme => ({
  ...pickLook(SITE_THEME),
  id,
  apply_to: "site",
  page_paths: [],
  ...overrides,
});

describe("pathMatches", () => {
  it("matches exact paths, ignoring a trailing slash", () => {
    expect(pathMatches("/library", "/library")).toBe(true);
    expect(pathMatches("/library", "/library/")).toBe(true);
    expect(pathMatches("/library", "/library/x")).toBe(false);
    expect(pathMatches("/", "/")).toBe(true);
    expect(pathMatches("/", "/library")).toBe(false);
  });

  it("matches everything under a * prefix", () => {
    expect(pathMatches("/story/*", "/story/the-raven")).toBe(true);
    expect(pathMatches("/story/*", "/story-map")).toBe(false);
    expect(pathMatches("/blog*", "/blog")).toBe(true);
    expect(pathMatches("/blog*", "/blog/a-post")).toBe(true);
  });
});

describe("pickSiteTheme", () => {
  // The API already sends them highest priority first.
  const halloweenPages = theme(1, { apply_to: "pages", page_paths: ["/pages/*", "/"] });
  const wholeSite = theme(2);

  it("uses the first live theme that covers the path", () => {
    expect(pickSiteTheme([halloweenPages, wholeSite], "/pages/halloween-tales")?.id).toBe(1);
    expect(pickSiteTheme([halloweenPages, wholeSite], "/")?.id).toBe(1);
    expect(pickSiteTheme([halloweenPages, wholeSite], "/library")?.id).toBe(2);
    expect(pickSiteTheme([halloweenPages], "/library")).toBeNull();
  });

  it("never themes the admin panel", () => {
    expect(pickSiteTheme([wholeSite], "/admin")).toBeNull();
    expect(pickSiteTheme([wholeSite], "/admin/site-themes")).toBeNull();
    expect(pickSiteTheme([wholeSite], "/administer")?.id).toBe(2);
  });

  it("handles no themes", () => {
    expect(pickSiteTheme(undefined, "/")).toBeNull();
    expect(pickSiteTheme([], "/")).toBeNull();
  });
});

describe("siteThemeCss", () => {
  // More specific than index.css's own ":root"/"body" rules, which load after
  // this stylesheet in dev and would otherwise win.
  it("sets the design-system variables on :root, outranking the app's own", () => {
    const css = siteThemeCss(theme(1, { primary_color: "#ffffff", body_font: "Lora" }));
    expect(css).toContain(":root:root {");
    expect(css).toContain("html body { font-family");
    expect(css).toContain("--primary: 0 0% 100%;");
  });

  it("only sets fonts and background when chosen", () => {
    const plain = siteThemeCss(theme(1));
    expect(plain).not.toContain("font-family");
    expect(plain).not.toContain("background-image");
    const styled = siteThemeCss(theme(1, { heading_font: "Creepster", background_image: "https://x.test/a.jpg", background_overlay_opacity: 40 }));
    expect(styled).toContain("'Creepster'");
    // Must outrank index.css's `h1:not(.prose *)` heading font and `.font-display`.
    expect(styled).toContain("html :is(h1, h2, h3, h4):not(.prose *), html .font-display { font-family: 'Creepster'");
    expect(styled).toContain('url("https://x.test/a.jpg")');
    expect(styled).toContain("opacity: 0.4");
  });

  it("can never close its own style tag", () => {
    const css = siteThemeCss(theme(1, { custom_css: "a::after { content: '</style><script>'; }", background_image: 'https://x.test/"<a' }));
    expect(css).not.toContain("</style>");
    expect(css).not.toContain("<");
  });
});
