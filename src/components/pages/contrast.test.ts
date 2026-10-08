import { describe, expect, it } from "vitest";
import { contrastRatio, readableLook, readableOn, SITE_THEME, THEME_PRESETS, pickLook } from "./pageTheme";
import { siteThemeCss } from "@/lib/siteTheme";

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("readableOn", () => {
  it("keeps a colour that already reads well", () => {
    expect(readableOn("#ede4ff", ["#120a1f", "#1e1230"], 4.5)).toBe("#ede4ff");
  });

  it("swaps unreadable text for whichever of near-black / near-white reads better", () => {
    // Dark grey on dark purple → light text.
    expect(readableOn("#374151", ["#120a1f", "#1e1230"], 4.5)).toBe("#f9fafb");
    // Pale yellow on white → dark text.
    expect(readableOn("#fef9c3", ["#ffffff"], 4.5)).toBe("#111827");
  });

  it("must read on every background given (page and cards)", () => {
    // Fine on the dark page, invisible on a white card.
    expect(readableOn("#f5f5f5", ["#111111", "#ffffff"], 4.5)).not.toBe("#f5f5f5");
  });
});

describe("readableLook", () => {
  it("leaves every preset's colours exactly as designed", () => {
    for (const preset of THEME_PRESETS) {
      expect(readableLook(preset.values), preset.label).toEqual(preset.values);
    }
  });

  it("fixes a theme whose text would vanish", () => {
    const bad = { ...SITE_THEME, background_color: "#101010", surface_color: "#1a1a1a", text_color: "#2a2a2a", heading_color: "#202020" };
    const fixed = readableLook(bad);
    expect(contrastRatio(fixed.text_color, "#1a1a1a")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fixed.heading_color, "#101010")).toBeGreaterThanOrEqual(3);
  });
});

describe("siteThemeCss — long-form text", () => {
  it("points .prose-on-theme at the theme's (readable) colours", () => {
    const css = siteThemeCss({
      ...pickLook({ ...SITE_THEME, background_color: "#120a1f", surface_color: "#1e1230", text_color: "#374151" }),
      id: 1,
      apply_to: "site",
      page_paths: [],
    });
    expect(css).toContain("html .prose-on-theme {");
    // The unreadable #374151 was swapped before it reached the prose colours.
    expect(css).toContain("--tw-prose-body: #f9fafb;");
  });
});
