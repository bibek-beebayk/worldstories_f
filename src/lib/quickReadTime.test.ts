import { describe, expect, it } from "vitest";
import {
  QUICK_READ_TIME_BUCKETS,
  availableTimeBuckets,
  filterByTimeBucket,
} from "./quickReadTime";

const story = (summary_reading_minutes: number | null) => ({ summary_reading_minutes });

describe("quick read time buckets", () => {
  const stories = [story(2), story(4), story(9), story(20), story(null)];

  it("answers how much time the reader has, so shorter reads fit longer budgets", () => {
    // With five minutes you can read a two-minute summary; the buckets are
    // nested on purpose.
    expect(filterByTimeBucket(stories, "5")).toEqual([story(2), story(4)]);
    expect(filterByTimeBucket(stories, "10")).toEqual([story(2), story(4), story(9)]);
  });

  it("keeps the longest bucket exclusive", () => {
    // "15+" is the one bucket that means "something longer", not "something
    // that fits".
    expect(filterByTimeBucket(stories, "15")).toEqual([story(20)]);
  });

  it("never offers a story whose length is unknown under a time promise", () => {
    for (const bucket of QUICK_READ_TIME_BUCKETS) {
      expect(filterByTimeBucket([story(null)], bucket.key)).toEqual([]);
    }
  });

  it("returns everything when no bucket is chosen", () => {
    expect(filterByTimeBucket(stories, null)).toEqual(stories);
  });

  it("ignores a bucket it does not recognise rather than showing nothing", () => {
    expect(filterByTimeBucket(stories, "42")).toEqual(stories);
  });

  it("offers only buckets that have something behind them", () => {
    // A chip that empties the rail the moment it is pressed is the misleading
    // empty state the brief rules out.
    expect(availableTimeBuckets([story(20)]).map((bucket) => bucket.key)).toEqual(["15"]);
    expect(availableTimeBuckets([story(2)]).map((bucket) => bucket.key)).toEqual(["3", "5", "10"]);
    expect(availableTimeBuckets([story(null)])).toEqual([]);
    expect(availableTimeBuckets([])).toEqual([]);
  });
});
