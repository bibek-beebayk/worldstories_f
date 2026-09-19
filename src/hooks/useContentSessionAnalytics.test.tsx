// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useContentSessionAnalytics } from "./useContentSessionAnalytics";

const trackAnalyticsEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEvent: (...args: unknown[]) => trackAnalyticsEvent(...args),
}));

let visibility: DocumentVisibilityState = "visible";
const setVisibility = (next: DocumentVisibilityState) => {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
};
const advance = (ms: number) => vi.advanceTimersByTime(ms);
const durations = () =>
  trackAnalyticsEvent.mock.calls.map((call) => (call[0] as { duration_seconds: number }).duration_seconds);

function Harness({ enabled = true }: { enabled?: boolean }) {
  useContentSessionAnalytics("reading_session", { storySlug: "a-story" }, enabled, { format: "chapter" });
  return null;
}

beforeEach(() => {
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  trackAnalyticsEvent.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-19T10:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useContentSessionAnalytics", () => {
  it("flushes once on pagehide with the accumulated seconds and does not double-send on unmount", () => {
    const { unmount } = render(<Harness />);
    advance(7000);

    window.dispatchEvent(new Event("pagehide"));

    expect(durations()).toEqual([7]);
    expect(trackAnalyticsEvent.mock.calls[0][0]).toMatchObject({
      event_type: "reading_session",
      story_slug: "a-story",
      metadata: { format: "chapter" },
    });

    unmount();
    expect(durations()).toEqual([7]);
  });

  it("does not double-count when visibilitychange→hidden follows pagehide", () => {
    render(<Harness />);
    advance(5000);

    window.dispatchEvent(new Event("pagehide"));
    setVisibility("hidden");

    expect(durations()).toEqual([5]);
  });

  it("sends per hidden/visible cycle and only counts time while visible", () => {
    const { unmount } = render(<Harness />);
    advance(5000);
    setVisibility("hidden");
    advance(60_000); // time in a background tab must not count
    setVisibility("visible");
    advance(3000);

    unmount();

    expect(durations()).toEqual([5, 3]);
  });

  it("keeps sub-2-second time accumulating instead of losing it", () => {
    const { unmount } = render(<Harness />);
    advance(1000);
    setVisibility("hidden");
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
    setVisibility("visible");
    advance(1000);

    unmount();

    expect(durations()).toEqual([2]);
  });

  it("restarts the timer on pageshow after a bfcache restore", () => {
    render(<Harness />);
    advance(4000);
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pageshow"));
    advance(3000);
    window.dispatchEvent(new Event("pagehide"));

    expect(durations()).toEqual([4, 3]);
  });

  it("sends nothing while disabled", () => {
    const { unmount } = render(<Harness enabled={false} />);
    advance(10_000);
    window.dispatchEvent(new Event("pagehide"));
    setVisibility("hidden");
    unmount();

    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });
});
