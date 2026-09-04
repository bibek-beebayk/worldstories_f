import { describe, expect, it } from "vitest";
import { createRailDeduplicator } from "./railDeduplication";

const stories = (...ids: number[]) => ids.map((id) => ({ id }));

describe("createRailDeduplicator", () => {
  it("gives a story to the first rail that asks for it", () => {
    const dedupe = createRailDeduplicator();

    expect(dedupe.claim(stories(1, 2, 3))).toEqual(stories(1, 2, 3));
    expect(dedupe.claim(stories(2, 3, 4))).toEqual(stories(4));
  });

  it("fills a rail from what remains rather than rendering short", () => {
    // The substitution the brief asks for: losing the first two picks to a
    // higher-priority rail should not leave this one with a single card.
    const dedupe = createRailDeduplicator();
    dedupe.claim(stories(1, 2));

    expect(dedupe.claim(stories(1, 2, 3, 4, 5, 6), 3)).toEqual(stories(3, 4, 5));
  });

  it("applies the limit after filtering, not before", () => {
    const dedupe = createRailDeduplicator();
    dedupe.claim(stories(1));

    // Limiting first would have taken [1, 2] and then dropped 1, leaving one.
    expect(dedupe.claim(stories(1, 2, 3), 2)).toEqual(stories(2, 3));
  });

  it("reserves the tail of a capped rail so it cannot resurface below", () => {
    // Continue Reading shows five, but the sixth story is still the reader's
    // own queue — not a fresh suggestion for Trending to make.
    const dedupe = createRailDeduplicator();
    const queue = stories(1, 2, 3, 4, 5, 6, 7);

    const shown = dedupe.claim(queue, 5);
    dedupe.reserve(queue);

    expect(shown).toEqual(stories(1, 2, 3, 4, 5));
    expect(dedupe.claim(stories(6, 7, 8))).toEqual(stories(8));
  });

  it("never repeats a story within a single rail", () => {
    const dedupe = createRailDeduplicator();

    expect(dedupe.claim(stories(1, 1, 2))).toEqual(stories(1, 2));
  });

  it("handles a rail that has not loaded yet", () => {
    const dedupe = createRailDeduplicator();

    expect(dedupe.claim(undefined)).toEqual([]);
    expect(dedupe.claim([])).toEqual([]);
    expect(dedupe.size).toBe(0);
  });

  it("reports what has been claimed", () => {
    const dedupe = createRailDeduplicator();
    dedupe.claim(stories(1, 2));

    expect(dedupe.isClaimed(1)).toBe(true);
    expect(dedupe.isClaimed(9)).toBe(false);
    expect(dedupe.size).toBe(2);
  });

  it("keeps each rail's own ordering", () => {
    const dedupe = createRailDeduplicator();

    expect(dedupe.claim(stories(5, 3, 1))).toEqual(stories(5, 3, 1));
  });
});
