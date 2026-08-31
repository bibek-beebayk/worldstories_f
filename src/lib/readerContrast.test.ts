import { describe, expect, it } from "vitest";
import {
  colorContrastRatio,
  ensureAccessibleTextColor,
  hasAccessibleTextContrast,
} from "./readerContrast";

describe("reader theme contrast", () => {
  it("meets WCAG AA for the built-in reader theme foregrounds", () => {
    expect(hasAccessibleTextContrast("#262626", "#f4ede0")).toBe(true);
    expect(hasAccessibleTextContrast("#262626", "#efe3cf")).toBe(true);
    expect(hasAccessibleTextContrast("#334155", "#f1f5f9")).toBe(true);
    expect(hasAccessibleTextContrast("#cbd5e1", "#1b2230")).toBe(true);
    expect(hasAccessibleTextContrast("#93c5fd", "#1b2230")).toBe(true);
  });

  it("rejects low-contrast custom colors", () => {
    expect(hasAccessibleTextContrast("#777777", "#888888")).toBe(false);
  });

  it("repairs legacy custom colors with the stronger fallback", () => {
    const repaired = ensureAccessibleTextColor("#777777", "#888888");
    expect(hasAccessibleTextContrast(repaired, "#888888")).toBe(true);
  });

  it("returns zero for malformed colors", () => {
    expect(colorContrastRatio("not-a-color", "#ffffff")).toBe(0);
  });
});
