import { describe, expect, it } from "vitest";
import { getCountryFlag, getCountryLabel } from "./countries";

describe("getCountryFlag", () => {
  it("builds the flag from the ISO letters", () => {
    // Regional-indicator pairs, so every code the backend can store works
    // without a lookup table or an image per flag.
    expect(getCountryFlag("JP")).toBe("🇯🇵");
    expect(getCountryFlag("FR")).toBe("🇫🇷");
    expect(getCountryFlag("NP")).toBe("🇳🇵");
  });

  it("accepts a lowercase code", () => {
    expect(getCountryFlag("jp")).toBe("🇯🇵");
  });

  it("returns nothing for anything that is not a two-letter code", () => {
    // Callers render the country name alone rather than a broken glyph.
    for (const value of [null, undefined, "", "J", "JPN", "12", "J1"]) {
      expect(getCountryFlag(value)).toBe("");
    }
  });

  it("pairs with the country's own label", () => {
    expect(`${getCountryFlag("JP")} ${getCountryLabel("JP")}`).toBe("🇯🇵 Japan");
  });
});
