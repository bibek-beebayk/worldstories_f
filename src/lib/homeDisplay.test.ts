import { describe, expect, it } from "vitest";
import { anchorHref, DEFAULT_DISPLAY, isInvertedSurface, normalizeDisplay, sectionFrameClasses } from "./homeDisplay";

describe("normalizeDisplay", () => {
  it("returns defaults for empty, null, or undefined input", () => {
    expect(normalizeDisplay()).toEqual(DEFAULT_DISPLAY);
    expect(normalizeDisplay(null)).toEqual(DEFAULT_DISPLAY);
    expect(normalizeDisplay({})).toEqual(DEFAULT_DISPLAY);
  });

  it("merges partial valid values with defaults", () => {
    expect(normalizeDisplay({ background: "dark", show_rating: true, hide_title: true })).toEqual({
      ...DEFAULT_DISPLAY,
      background: "dark",
      show_rating: true,
      hide_title: true,
    });
  });

  it("ignores unknown keys and invalid enum or boolean values", () => {
    expect(
      normalizeDisplay({
        background: "neon" as unknown as "none",
        spacing: "huge" as unknown as "normal",
        heading_align: "right" as unknown as "left",
        width: "bleed" as unknown as "contained",
        show_author: "yes" as unknown as boolean,
        show_summary: 1 as unknown as boolean,
        unknown_key: true,
      }),
    ).toEqual(DEFAULT_DISPLAY);
  });
});

describe("sectionFrameClasses", () => {
  it("returns an empty string for default display and all devices", () => {
    expect(sectionFrameClasses(DEFAULT_DISPLAY, "all")).toBe("");
  });

  it("applies device visibility classes", () => {
    expect(sectionFrameClasses(DEFAULT_DISPLAY, "mobile")).toContain("md:hidden");
    expect(sectionFrameClasses(DEFAULT_DISPLAY, "desktop")).toContain("hidden md:block");
  });

  it("applies contained background, spacing, and surface classes", () => {
    const tint = sectionFrameClasses({ ...DEFAULT_DISPLAY, background: "tint", spacing: "compact" }, "all");
    expect(tint).toContain("bg-muted/50");
    expect(tint).toContain("py-4");
    expect(tint).toContain("rounded-lg");
    expect(tint).not.toContain("clip-path");

    const dark = sectionFrameClasses({ ...DEFAULT_DISPLAY, background: "dark", spacing: "roomy" }, "all");
    expect(dark).toContain("--hero-dark");
    expect(dark).toContain("text-white");
    expect(dark).toContain("py-10");

    const brand = sectionFrameClasses({ ...DEFAULT_DISPLAY, background: "brand" }, "all");
    expect(brand).toContain("color-mix");
    expect(brand).toContain("text-white");
  });

  it("applies full-width bleed only when a background is active", () => {
    const noBgFull = sectionFrameClasses({ ...DEFAULT_DISPLAY, background: "none", width: "full" }, "all");
    expect(noBgFull).toBe("");

    const darkFull = sectionFrameClasses({ ...DEFAULT_DISPLAY, background: "dark", width: "full" }, "all");
    expect(darkFull).toContain("[clip-path:inset(0_-100vmax)]");
    expect(darkFull).toContain("shadow-[0_0_0_100vmax_var(--section-bg)]");
    expect(darkFull).not.toContain("rounded-lg");
  });

  it("applies roomy spacing even without a background", () => {
    expect(sectionFrameClasses({ ...DEFAULT_DISPLAY, spacing: "roomy" }, "all")).toBe("py-6 sm:py-8");
    expect(sectionFrameClasses({ ...DEFAULT_DISPLAY, spacing: "compact" }, "all")).toBe("py-0");
  });
});

describe("isInvertedSurface", () => {
  it("returns true for dark and brand backgrounds only", () => {
    expect(isInvertedSurface("none")).toBe(false);
    expect(isInvertedSurface("tint")).toBe(false);
    expect(isInvertedSurface("dark")).toBe(true);
    expect(isInvertedSurface("brand")).toBe(true);
  });
});

describe("anchorHref", () => {
  it("returns null for empty or whitespace-only values", () => {
    expect(anchorHref()).toBeNull();
    expect(anchorHref(null)).toBeNull();
    expect(anchorHref("")).toBeNull();
    expect(anchorHref("   ")).toBeNull();
  });

  it("formats a root hash link for valid anchor ids", () => {
    expect(anchorHref("quick-reads")).toBe("/#quick-reads");
    expect(anchorHref("  quick-reads  ")).toBe("/#quick-reads");
  });
});
