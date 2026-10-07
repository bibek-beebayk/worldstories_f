import { describe, expect, it } from "vitest";
import { formatStoryCountLabel } from "./languages";

describe("formatStoryCountLabel", () => {
  // Server (Node) and browser ICU disagree on some locales' default digits,
  // which broke hydration on Discover — the digits must not depend on it.
  it("always uses Latin digits so server and browser render the same text", () => {
    expect(formatStoryCountLabel("ne", 1)).toBe("1 कथा");
    expect(formatStoryCountLabel("ne", 12)).toBe("12 कथाहरू");
    expect(formatStoryCountLabel("ar", 3)).toBe("3 قصص");
    expect(formatStoryCountLabel("en", 1200)).toBe("1,200 stories");
  });
});
