import { describe, expect, it } from "vitest";
import { milestonesCrossed, PROGRESS_MILESTONES } from "./readingMilestones";

describe("milestonesCrossed", () => {
  it("reports a threshold as it is passed", () => {
    expect(milestonesCrossed(0.2, 0.3)).toEqual([0.25]);
  });

  it("reports every threshold cleared in one jump", () => {
    // Skipping to the end of a chapter passes several at once, and each is a
    // real fact about where the reader got to.
    expect(milestonesCrossed(0, 0.8)).toEqual([0.25, 0.5, 0.75]);
  });

  it("reports nothing when no threshold was crossed", () => {
    expect(milestonesCrossed(0.3, 0.4)).toEqual([]);
    expect(milestonesCrossed(0.76, 0.99)).toEqual([]);
  });

  it("never reports the same threshold twice", () => {
    // Scrolling back up and down again is not new information; the caller
    // keeps a high-water mark and this must respect it.
    expect(milestonesCrossed(0.6, 0.3)).toEqual([]);
    expect(milestonesCrossed(0.6, 0.6)).toEqual([]);
  });

  it("does not treat finishing as a milestone", () => {
    // Completion is its own event, raised by the server. Emitting both for
    // the same moment would double-count the end of every story.
    expect(PROGRESS_MILESTONES).not.toContain(1);
    expect(milestonesCrossed(0.8, 1)).toEqual([]);
  });

  it("ignores nonsense input rather than emitting for it", () => {
    expect(milestonesCrossed(Number.NaN, 0.5)).toEqual([]);
    expect(milestonesCrossed(0, Number.NaN)).toEqual([]);
  });
});
