// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { markDailyStoryStarted, trackGuestDailyStoryCompletion } from "./analytics";

const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 201 })));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

describe("Daily Story analytics attribution", () => {
  it("carries a guest start into the reader and records completion once", () => {
    markDailyStoryStarted("daily-tale", "2026-09-04", "read_story");
    trackGuestDailyStoryCompletion("daily-tale");
    trackGuestDailyStoryCompletion("daily-tale");

    const payloads = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(payloads.map((payload) => payload.event_type)).toEqual([
      "daily_story_started",
      "daily_story_completed",
    ]);
    expect(payloads[1].metadata.date).toBe("2026-09-04");
  });

  it("does not attribute another story or duplicate the server event for a signed-in reader", () => {
    markDailyStoryStarted("daily-tale", "2026-09-04", "read_story");
    trackGuestDailyStoryCompletion("another-story");
    localStorage.setItem("access", "signed-in");
    trackGuestDailyStoryCompletion("daily-tale");

    const payloads = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(payloads.map((payload) => payload.event_type)).toEqual(["daily_story_started"]);
  });
});
