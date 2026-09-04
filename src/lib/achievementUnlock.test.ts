import { beforeEach, describe, expect, it, vi } from "vitest";

const success = vi.fn();
vi.mock("@/components/ui/sonner", () => ({ toast: { success: (...a: unknown[]) => success(...a) } }));

import { announceAchievements } from "./achievementUnlock";

const achievement = (slug: string, name: string) => ({
  slug,
  name,
  description: "",
  icon: "🏅",
  category: "reading",
});

beforeEach(() => success.mockClear());

describe("announceAchievements", () => {
  it("announces each achievement earned by the write", () => {
    announceAchievements([achievement("first-story", "First Story")]);

    expect(success).toHaveBeenCalledWith(
      "🏅 Achievement unlocked",
      expect.objectContaining({ description: "First Story" })
    );
  });

  it("announces every one when a single completion earns several", () => {
    // Finishing one story can cross a reading tier and a country tier at once.
    announceAchievements([
      achievement("ten-stories", "Ten Stories"),
      achievement("five-countries", "Five Countries"),
    ]);

    expect(success).toHaveBeenCalledTimes(2);
  });

  it("says nothing when nothing was earned", () => {
    // The overwhelmingly common case — most completions earn nothing.
    announceAchievements([]);
    announceAchievements(undefined);

    expect(success).not.toHaveBeenCalled();
  });
});
