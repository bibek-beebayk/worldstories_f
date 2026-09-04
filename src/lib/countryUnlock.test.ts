import { beforeEach, describe, expect, it, vi } from "vitest";

const success = vi.fn();
vi.mock("@/components/ui/sonner", () => ({ toast: { success: (...a: unknown[]) => success(...a) } }));

import { announceCountryUnlocked } from "./countryUnlock";

beforeEach(() => success.mockClear());

describe("announceCountryUnlocked", () => {
  it("names the country and shows its flag", () => {
    announceCountryUnlocked("JP");

    expect(success).toHaveBeenCalledWith(
      "🇯🇵 Japan added to your Story Passport",
      expect.objectContaining({ description: expect.any(String) })
    );
  });

  it("offers a way through to the passport without demanding it", () => {
    // A toast with an action, never a modal: this fires the moment someone
    // finishes a story, which is the worst time to block them.
    announceCountryUnlocked("FR");

    const options = success.mock.calls[0][1] as { action: { label: string } };
    expect(options.action.label).toBe("View passport");
  });

  it("says nothing when no country was unlocked", () => {
    // The common case by far — most completions unlock nothing.
    announceCountryUnlocked(null);
    announceCountryUnlocked(undefined);
    announceCountryUnlocked("");

    expect(success).not.toHaveBeenCalled();
  });

  it("still announces a country it cannot draw a flag for", () => {
    announceCountryUnlocked("ZZZ");

    expect(success).toHaveBeenCalledTimes(1);
    expect(success.mock.calls[0][0]).not.toContain("undefined");
  });
});
