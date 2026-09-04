// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQuickReadFunnel } from "./useQuickReadFunnel";

const trackAnalyticsEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEvent: (...args: unknown[]) => trackAnalyticsEvent(...args),
}));

/** Drives the observer by hand so "the reader reached the end" is explicit. */
let observerCallbacks: Array<(entries: { isIntersecting: boolean }[]) => void> = [];
let disconnectCount = 0;

class FakeIntersectionObserver {
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    observerCallbacks.push(callback);
  }
  observe() {}
  disconnect() {
    disconnectCount += 1;
  }
  unobserve() {}
  takeRecords() {
    return [];
  }
}

const reachEndOfSummary = () =>
  observerCallbacks.forEach((callback) => callback([{ isIntersecting: true }]));

const eventTypes = () =>
  trackAnalyticsEvent.mock.calls.map((call) => (call[0] as { event_type: string }).event_type);

function Harness({ slug }: { slug: string | undefined }) {
  const { endOfSummaryRef, trackFullStoryClick } = useQuickReadFunnel(slug);
  return (
    <div>
      <div ref={endOfSummaryRef} />
      <button type="button" onClick={trackFullStoryClick}>
        Read the Full Story
      </button>
    </div>
  );
}

beforeEach(() => {
  trackAnalyticsEvent.mockClear();
  observerCallbacks = [];
  disconnectCount = 0;
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useQuickReadFunnel", () => {
  it("records the open as soon as the summary is shown", () => {
    render(<Harness slug="a-tale" />);

    expect(eventTypes()).toEqual(["quick_read_opened"]);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "quick_read_opened", story_slug: "a-tale" })
    );
  });

  it("records the completion when the end of the summary comes into view", () => {
    render(<Harness slug="a-tale" />);

    reachEndOfSummary();

    expect(eventTypes()).toEqual(["quick_read_opened", "quick_read_completed"]);
  });

  it("counts each funnel step at most once per visit", () => {
    // Conversion is completions over clicks; a reader scrolling up and back
    // down must not inflate either side of that ratio.
    const { getByRole } = render(<Harness slug="a-tale" />);

    reachEndOfSummary();
    reachEndOfSummary();
    getByRole("button").click();
    getByRole("button").click();

    expect(eventTypes()).toEqual([
      "quick_read_opened",
      "quick_read_completed",
      "quick_read_full_story_clicked",
    ]);
  });

  it("stops observing once the summary has been read", () => {
    render(<Harness slug="a-tale" />);

    reachEndOfSummary();

    expect(disconnectCount).toBeGreaterThan(0);
  });

  it("records whether the reader finished the summary before converting", () => {
    const { getByRole } = render(<Harness slug="a-tale" />);

    getByRole("button").click();

    expect(trackAnalyticsEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event_type: "quick_read_full_story_clicked",
        metadata: { completed_summary: false },
      })
    );
  });

  it("marks a conversion that followed a finished summary", () => {
    const { getByRole } = render(<Harness slug="a-tale" />);

    reachEndOfSummary();
    getByRole("button").click();

    expect(trackAnalyticsEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event_type: "quick_read_full_story_clicked",
        metadata: { completed_summary: true },
      })
    );
  });

  it("starts a fresh funnel for a different story", () => {
    const { rerender } = render(<Harness slug="a-tale" />);
    reachEndOfSummary();
    trackAnalyticsEvent.mockClear();

    rerender(<Harness slug="another-tale" />);

    expect(eventTypes()).toEqual(["quick_read_opened"]);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ story_slug: "another-tale" })
    );
  });

  it("does nothing until the story has loaded", () => {
    render(<Harness slug={undefined} />);

    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("degrades quietly where IntersectionObserver is unavailable", () => {
    // Analytics must never be the reason a reader's page breaks.
    vi.stubGlobal("IntersectionObserver", undefined);

    expect(() => render(<Harness slug="a-tale" />)).not.toThrow();
    expect(eventTypes()).toEqual(["quick_read_opened"]);
  });
});
