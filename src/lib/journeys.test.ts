import { describe, expect, it } from "vitest";
import type { JourneySummary } from "@/api/types";
import { bestJourneyToContinue, journeyActionLabel, journeyState, orderJourneys } from "@/lib/journeys";

const journey = (slug: string, completed: number, total = 4): JourneySummary => ({
  slug,
  title: slug,
  description: "",
  type: "curated",
  cover_image: "",
  completed,
  total,
  is_complete: total > 0 && completed >= total,
});

describe("orderJourneys", () => {
  it("orders not started, in progress, then complete while preserving editor order", () => {
    const rows = [journey("complete-a", 4), journey("new-a", 0), journey("progress-a", 2), journey("new-b", 0), journey("complete-b", 4)];
    expect(orderJourneys(rows).map((row) => row.slug)).toEqual([
      "new-a",
      "new-b",
      "progress-a",
      "complete-a",
      "complete-b",
    ]);
  });
});

describe("journeyState", () => {
  it("is start with nothing read, continue part-way, review once complete", () => {
    expect(journeyState(journey("a", 0))).toBe("start");
    expect(journeyState(journey("b", 3))).toBe("continue");
    expect(journeyState(journey("c", 4))).toBe("review");
  });

  it("treats a journey with no stories as not started rather than complete", () => {
    expect(journeyState({ completed: 0, total: 0, is_complete: false })).toBe("start");
  });
});

describe("bestJourneyToContinue", () => {
  it("picks the in-progress journey furthest along, ties by editor order", () => {
    const rows = [journey("new", 0), journey("quarter", 1), journey("three-quarters", 3), journey("also-three-quarters", 3), journey("done", 4)];
    expect(bestJourneyToContinue(rows)?.slug).toBe("three-quarters");
  });

  it("is null when nothing is in progress", () => {
    expect(bestJourneyToContinue([journey("new", 0), journey("done", 4)])).toBeNull();
  });
});

describe("journeyActionLabel", () => {
  it("returns the state-aware action", () => {
    expect(journeyActionLabel(journey("new", 0))).toBe("Start journey");
    expect(journeyActionLabel(journey("progress", 1))).toBe("Continue");
    expect(journeyActionLabel(journey("complete", 4))).toBe("Review");
  });
});
