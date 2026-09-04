import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  milestoneMessage,
  milestonePath,
  milestoneShareUrl,
  type Milestone,
} from "./milestoneShare";

describe("milestoneMessage", () => {
  it("phrases each kind of milestone", () => {
    const cases: Array<[Milestone, string]> = [
      [{ kind: "countries", value: 10 }, "10 countries"],
      [{ kind: "stories", value: 25 }, "25 stories"],
      [{ kind: "streak", value: 7 }, "7-day reading streak"],
      [{ kind: "journey", value: "Japanese Folklore" }, "Japanese Folklore"],
      [{ kind: "achievement", value: "World Traveller" }, "World Traveller"],
    ];
    for (const [milestone, fragment] of cases) {
      expect(milestoneMessage(milestone)).toContain(fragment);
    }
  });
});

describe("milestonePath", () => {
  it("defaults to a public page", () => {
    // The achievement lives in the message; the URL must never expose the
    // reader's activity to whoever receives it.
    expect(milestonePath({ kind: "countries", value: 10 })).toBe("/");
  });

  it("never points at the passport or profile", () => {
    for (const kind of ["countries", "stories", "streak", "journey", "achievement"] as const) {
      const path = milestonePath({ kind, value: 1 });
      expect(path).not.toContain("/story-passport");
      expect(path).not.toContain("/profile");
    }
  });

  it("uses a public page when the milestone has one", () => {
    expect(milestonePath({ kind: "journey", value: "X", path: "/journeys/x" })).toBe("/journeys/x");
  });
});

describe("milestoneShareUrl", () => {
  it("builds an absolute link carrying the referral channel", () => {
    const url = milestoneShareUrl({ kind: "stories", value: 25 });

    expect(url).toContain("ref=link");
    expect(url.startsWith("http")).toBe(true);
  });
});
