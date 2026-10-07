import { describe, expect, it } from "vitest";
import { HERO_ICON_NAMES, HERO_PRESETS } from "./heroPresets";
import { HERO_TEMPLATE_PRESETS } from "./heroTemplatePresets";
import { PAGE_FONT_NAMES } from "@/components/pages/pageTheme";

describe("hero template presets", () => {
  const regular = HERO_TEMPLATE_PRESETS[0].values;

  it("all fill in the same complete set of fields", () => {
    for (const preset of HERO_TEMPLATE_PRESETS) {
      expect(Object.keys(preset.values).sort()).toEqual(Object.keys(regular).sort());
    }
  });

  // The backend rejects anything else, so a preset using one would fail to save.
  it("only use icons, animations, colours and links the backend accepts", () => {
    for (const { label, values } of HERO_TEMPLATE_PRESETS) {
      expect(HERO_PRESETS[values.animation_preset], label).toBeDefined();
      for (const icon of [values.info_line_1_icon, values.info_line_2_icon, ...values.animation_icons]) {
        expect(HERO_ICON_NAMES, `${label}: ${icon}`).toContain(icon);
      }
      for (const [key, value] of Object.entries(values)) {
        if (key.endsWith("_from") || key.endsWith("_to") || key.endsWith("_color")) {
          expect(value, `${label}: ${key}`).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
      expect(values.cta_url.startsWith("/") || /^https?:\/\//.test(values.cta_url)).toBe(true);
      expect(values.animation_icons.length).toBeLessThanOrEqual(10);
      for (const font of [values.title_font, values.body_font]) {
        if (font) expect(PAGE_FONT_NAMES, `${label}: ${font}`).toContain(font);
      }
    }
  });
});
