// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStoryReadingEvents } from "./useStoryReadingEvents";

const trackAnalyticsEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackAnalyticsEvent: (...args: unknown[]) => trackAnalyticsEvent(...args),
}));

function Harness({
  slug,
  progress,
  ready = true,
}: {
  // No default: a default parameter also applies to an explicitly passed
  // `undefined`, which would quietly defeat the "no story" test below.
  slug: string | undefined;
  progress: number;
  ready?: boolean;
}) {
  useStoryReadingEvents({ storySlug: slug, format: "chapter", progress, ready });
  return null;
}

const eventTypes = () =>
  trackAnalyticsEvent.mock.calls.map((call) => (call[0] as { event_type: string }).event_type);

beforeEach(() => trackAnalyticsEvent.mockClear());
afterEach(cleanup);

describe("useStoryReadingEvents", () => {
  it("records a start when the reader arrives at the beginning", () => {
    render(<Harness slug="a-tale" progress={0} />);

    expect(eventTypes()).toEqual(["story_started"]);
  });

  it("records a resume when the reader arrives partway in", () => {
    render(<Harness slug="a-tale" progress={0.4} />);

    expect(eventTypes()).toEqual(["story_resumed"]);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ story_slug: "a-tale", value: 0.4, metadata: { format: "chapter" } })
    );
  });

  it("treats a position barely off zero as a start, not a resume", () => {
    // Someone who opened a story yesterday and read one sentence is starting
    // it today.
    render(<Harness slug="a-tale" progress={0.004} />);

    expect(eventTypes()).toEqual(["story_started"]);
  });

  it("waits for the saved position before deciding", () => {
    // Every story reads as 0% until its progress loads, so acting early would
    // log every resumed session as a fresh start — inflating the start count
    // and depressing the completion rate derived from it.
    const { rerender } = render(<Harness slug="a-tale" progress={0} ready={false} />);
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();

    rerender(<Harness slug="a-tale" progress={0.6} ready />);

    expect(eventTypes()).toEqual(["story_resumed"]);
  });

  it("opens a story only once however often progress moves", () => {
    const { rerender } = render(<Harness slug="a-tale" progress={0} />);
    rerender(<Harness slug="a-tale" progress={0.02} />);
    rerender(<Harness slug="a-tale" progress={0.04} />);

    expect(eventTypes()).toEqual(["story_started"]);
  });

  it("records each quarter as the reader passes it", () => {
    const { rerender } = render(<Harness slug="a-tale" progress={0} />);
    rerender(<Harness slug="a-tale" progress={0.3} />);
    rerender(<Harness slug="a-tale" progress={0.55} />);

    expect(eventTypes()).toEqual(["story_started", "story_progressed", "story_progressed"]);
    expect(trackAnalyticsEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event_type: "story_progressed",
        metadata: { format: "chapter", milestone: 0.5 },
      })
    );
  });

  it("does not re-record a quarter the reader scrolls back through", () => {
    const { rerender } = render(<Harness slug="a-tale" progress={0} />);
    rerender(<Harness slug="a-tale" progress={0.3} />);
    rerender(<Harness slug="a-tale" progress={0.1} />);
    rerender(<Harness slug="a-tale" progress={0.3} />);

    expect(eventTypes().filter((type) => type === "story_progressed")).toHaveLength(1);
  });

  it("does not record quarters already behind a resumed reader", () => {
    // They passed those thresholds in an earlier session, not this one.
    const { rerender } = render(<Harness slug="a-tale" progress={0.8} />);
    rerender(<Harness slug="a-tale" progress={0.85} />);

    expect(eventTypes()).toEqual(["story_resumed"]);
  });

  it("starts a fresh lifecycle for a different story", () => {
    const { rerender } = render(<Harness slug="a-tale" progress={0.4} />);
    trackAnalyticsEvent.mockClear();

    rerender(<Harness slug="another-tale" progress={0} />);

    expect(eventTypes()).toEqual(["story_started"]);
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ story_slug: "another-tale" })
    );
  });

  it("does nothing without a story", () => {
    render(<Harness slug={undefined} progress={0.5} />);

    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });
});
