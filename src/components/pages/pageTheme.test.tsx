// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ThemedPage from "./ThemedPage";
import { hexToHslTriplet, scopedCustomCss, SITE_THEME, themeFontsUrl, themeStyle, THEME_PRESETS } from "./pageTheme";

afterEach(cleanup);

describe("page theme helpers", () => {
  it("converts hex to the site's HSL triplet format", () => {
    expect(hexToHslTriplet("#ffffff")).toBe("0 0% 100%");
    expect(hexToHslTriplet("#ed405a")).toBe("351 83% 59%");
    expect(hexToHslTriplet("nonsense")).toBe("0 0% 0%");
  });

  it("builds one font stylesheet, without weights for single-weight fonts", () => {
    expect(themeFontsUrl({ heading_font: "", body_font: "" })).toBeNull();
    const url = themeFontsUrl({ heading_font: "Creepster", body_font: "Playfair Display" })!;
    expect(url).toContain("family=Creepster&");
    expect(url).toContain("family=Playfair+Display:wght@400;700");
    expect(themeFontsUrl({ heading_font: "Lora", body_font: "Lora" })!.match(/family=/g)).toHaveLength(1);
  });

  it("overrides the design-system variables so shared components follow the theme", () => {
    const style = themeStyle({ ...SITE_THEME, primary_color: "#ffffff", radius: 4 }) as Record<string, string>;
    expect(style["--primary"]).toBe("0 0% 100%");
    expect(style["--radius"]).toBe("4px");
  });

  it("nests custom CSS in the page scope and can't close the style tag", () => {
    expect(scopedCustomCss("scope", "  ")).toBe("");
    const css = scopedCustomCss("scope", "h2 { color: red; } a::after { content: '</style>'; }");
    expect(css.startsWith(".scope {")).toBe(true);
    expect(css).not.toContain("</style>");
  });

  it("has presets covering every theme value", () => {
    for (const preset of THEME_PRESETS) {
      expect(Object.keys(preset.values).sort()).toEqual(Object.keys(SITE_THEME).sort());
    }
  });
});

describe("ThemedPage", () => {
  it("renders the site look without a theme", () => {
    const { container } = render(
      <ThemedPage theme={null} scope="ws-page-theme-site">
        <p>Hello</p>
      </ThemedPage>
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(container.querySelector("style")).toBeNull();
  });

  it("applies the theme's variables, width and scoped custom CSS", () => {
    const { container } = render(
      <ThemedPage theme={{ ...SITE_THEME, content_width: "narrow", custom_css: "h2 { color: red; }" }} scope="ws-page-theme-7">
        <p>Hello</p>
      </ThemedPage>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass("ws-page-theme-7");
    expect(wrapper.style.getPropertyValue("--background")).toBe("0 0% 100%");
    expect(container.querySelector(".ws-page-content")).toHaveClass("max-w-3xl");
    expect(container.querySelector("style")?.textContent).toContain(".ws-page-theme-7 {");
  });
});
