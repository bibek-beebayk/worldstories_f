import { describe, expect, it } from "vitest";
import { cueAtOrBefore, findActiveCueIndex, normalizeCues } from "./readAlongCues";

const raw = (
  entries: Array<[number, number, number, string]>
): { id: number; start_seconds: number; end_seconds: number; text: string }[] =>
  entries.map(([id, start, end, text]) => ({
    id,
    start_seconds: start,
    end_seconds: end,
    text,
  }));

describe("normalizeCues", () => {
  it("returns [] for undefined / null / empty", () => {
    expect(normalizeCues(undefined)).toEqual([]);
    expect(normalizeCues(null)).toEqual([]);
    expect(normalizeCues([])).toEqual([]);
  });

  it("drops malformed entries (non-finite, end <= start)", () => {
    const cues = normalizeCues(
      raw([
        [1, 0, 1, "ok"],
        [2, Number.NaN, 2, "nan start"],
        [3, 5, 5, "zero span"],
        [4, 9, 8, "reversed"],
      ])
    );
    expect(cues.map((c) => c.id)).toEqual([1]);
  });

  it("sorts by start time and assigns a contiguous index", () => {
    const cues = normalizeCues(
      raw([
        [10, 4, 5, "third"],
        [11, 0, 1, "first"],
        [12, 2, 3, "second"],
      ])
    );
    expect(cues.map((c) => c.id)).toEqual([11, 12, 10]);
    expect(cues.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(cues[0]).toMatchObject({ startMs: 0, endMs: 1000, startSeconds: 0 });
  });
});

describe("findActiveCueIndex", () => {
  const cues = normalizeCues(
    raw([
      [1, 0, 1, "a"], // 0–1000ms
      [2, 1, 2, "b"], // 1000–2000ms (touches a)
      [3, 5, 6, "c"], // 5000–6000ms (gap before)
    ])
  );

  it("returns -1 for an empty cue list", () => {
    expect(findActiveCueIndex([], 1)).toBe(-1);
  });

  it("returns -1 before the first cue", () => {
    expect(findActiveCueIndex(cues, -0.5)).toBe(-1);
  });

  it("is inclusive of the start boundary", () => {
    expect(findActiveCueIndex(cues, 0)).toBe(0);
    expect(findActiveCueIndex(cues, 5)).toBe(2);
  });

  it("is exclusive of the end boundary and hands off to a touching cue", () => {
    // t == 1.0s: cue a ends, cue b starts → active cue is b
    expect(findActiveCueIndex(cues, 1)).toBe(1);
    // t == 2.0s: cue b ends, nothing follows → -1
    expect(findActiveCueIndex(cues, 2)).toBe(-1);
  });

  it("returns -1 inside a gap between cues", () => {
    expect(findActiveCueIndex(cues, 3.5)).toBe(-1);
  });

  it("returns -1 past the last cue", () => {
    expect(findActiveCueIndex(cues, 6)).toBe(-1);
    expect(findActiveCueIndex(cues, 100)).toBe(-1);
  });

  it("handles a mid-cue time", () => {
    expect(findActiveCueIndex(cues, 0.5)).toBe(0);
    expect(findActiveCueIndex(cues, 5.999)).toBe(2);
  });

  it("returns -1 for a non-finite / negative time", () => {
    expect(findActiveCueIndex(cues, Number.NaN)).toBe(-1);
    expect(findActiveCueIndex(cues, -10)).toBe(-1);
  });

  it("is stateless when time seeks backward", () => {
    const line = normalizeCues(
      raw([
        [1, 0, 1, "a"],
        [2, 5, 6, "b"],
      ])
    );
    expect(findActiveCueIndex(line, 5.5)).toBe(1);
    expect(findActiveCueIndex(line, 0.5)).toBe(0);
  });

  it("handles the final cue at its edges", () => {
    const line = normalizeCues(raw([[1, 10, 12, "last"]]));
    expect(findActiveCueIndex(line, 11.999)).toBe(0);
    expect(findActiveCueIndex(line, 12)).toBe(-1);
    expect(findActiveCueIndex(line, 12.001)).toBe(-1);
  });

  it("handles a single cue in and out of range", () => {
    const one = normalizeCues(raw([[1, 3, 4, "only"]]));
    expect(findActiveCueIndex(one, 3.5)).toBe(0);
    expect(findActiveCueIndex(one, 2)).toBe(-1);
    expect(findActiveCueIndex(one, 4)).toBe(-1);
  });
});

describe("cueAtOrBefore", () => {
  const cues = normalizeCues(
    raw([
      [1, 0, 1, "a"],
      [2, 5, 6, "b"],
    ])
  );

  it("returns -1 only before the first cue", () => {
    expect(cueAtOrBefore(cues, -1)).toBe(-1);
    expect(cueAtOrBefore(cues, 0)).toBe(0);
  });

  it("stays on the preceding cue inside a gap", () => {
    expect(cueAtOrBefore(cues, 3)).toBe(0);
  });

  it("stays on the last cue after it ends", () => {
    expect(cueAtOrBefore(cues, 100)).toBe(1);
  });
});

describe("performance sanity", () => {
  const big = normalizeCues(
    raw(
      Array.from({ length: 5000 }, (_, i) => {
        const start = i * 3; // 0-2s cue, 1s gap
        return [i + 1, start, start + 2, `cue ${i}`] as [number, number, number, string];
      })
    )
  );

  it("finds the right cue at several positions in a large list", () => {
    expect(findActiveCueIndex(big, 1)).toBe(0);
    expect(findActiveCueIndex(big, 1250 * 3 + 0.5)).toBe(1250);
    expect(findActiveCueIndex(big, 2500 * 3 + 1)).toBe(2500);
    expect(findActiveCueIndex(big, 4999 * 3 + 1.9)).toBe(4999);
    // in a gap (2.5s into a 3s slot, cue ends at 2s)
    expect(findActiveCueIndex(big, 1000 * 3 + 2.5)).toBe(-1);
  });

  it("stays within bounds across many random lookups", () => {
    for (let i = 0; i < 100_000; i += 1) {
      const result = findActiveCueIndex(big, Math.random() * 5000 * 3);
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThan(big.length);
    }
  });
});
