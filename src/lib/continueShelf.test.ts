import { describe, expect, it } from "vitest";
import type { ContinueListeningItem, ContinueReadingItem, Story } from "@/api/types";
import { isStaleEntry, mergeContinueItems, splitContinueEntries } from "./continueShelf";

const NOW = new Date("2026-06-30T12:00:00Z").getTime();
const daysAgo = (days: number) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const story = (id: number) => ({ id, slug: `story-${id}`, title: `Story ${id}` }) as unknown as Story;

const reading = (id: number, days: number, progress = 0.5): ContinueReadingItem => ({
  story: story(id),
  chapter_slug: "ch-2",
  chapter_title: "Chapter 2",
  chapter_progress: 0.2,
  overall_progress: progress,
  updated_at: daysAgo(days),
  excerpt: "",
  remaining_minutes: 10,
});
const listening = (id: number, days: number, progress = 0.5): ContinueListeningItem => ({
  story: story(id),
  audio_slug: "track-1",
  audio_title: "Track 1",
  audio_progress: 0.2,
  overall_progress: progress,
  updated_at: daysAgo(days),
  remaining_minutes: 10,
});

describe("mergeContinueItems", () => {
  it("interleaves reading and listening by last activity, newest first", () => {
    const merged = mergeContinueItems([reading(1, 5), reading(2, 1)], [listening(3, 3)]);
    expect(merged.map((e) => [e.kind, e.story.id])).toEqual([
      ["reading", 2],
      ["listening", 3],
      ["reading", 1],
    ]);
  });

  it("links each card to where the reader left off", () => {
    const [read, listen] = mergeContinueItems([reading(1, 1)], [listening(2, 2)]);
    expect(read.href).toBe("/read/story-1/ch-2");
    expect(listen.href).toBe("/listen/story-2/track-1");
  });

  it("shows a story once, as whichever the reader touched last", () => {
    const merged = mergeContinueItems([reading(1, 6)], [listening(1, 2)]);
    expect(merged).toHaveLength(1);
    expect(merged[0].kind).toBe("listening");
  });

  it("copes with missing queues", () => {
    expect(mergeContinueItems(undefined, undefined)).toEqual([]);
  });
});

describe("staleness", () => {
  const entry = (days: number, progress: number) => mergeContinueItems([reading(1, days, progress)], [])[0];

  it("is stale after 30 days without activity", () => {
    expect(isStaleEntry(entry(29, 0.5), NOW)).toBe(false);
    expect(isStaleEntry(entry(30, 0.5), NOW)).toBe(true);
    expect(isStaleEntry(entry(90, 0.5), NOW)).toBe(true);
  });

  it("is stale under 3% progress even when recent", () => {
    expect(isStaleEntry(entry(1, 0.02), NOW)).toBe(true);
    expect(isStaleEntry(entry(1, 0.03), NOW)).toBe(false);
  });

  it("splits the row from the show-older group, keeping order", () => {
    const merged = mergeContinueItems([reading(1, 1), reading(2, 40), reading(3, 2, 0.01)], [listening(4, 3)]);
    const { recent, older } = splitContinueEntries(merged, NOW);
    expect(recent.map((e) => e.story.id)).toEqual([1, 4]);
    expect(older.map((e) => e.story.id)).toEqual([3, 2]);
  });
});
