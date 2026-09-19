// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 201 })));

// The in-memory fallback lives in module scope, so each test loads a fresh copy.
const loadAnalytics = async () => {
  vi.resetModules();
  return import("./analytics");
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("analytics visitor/session ids", () => {
  it("persists and reuses the id when storage works", async () => {
    const { getAnalyticsVisitorId, getAnalyticsSessionId } = await loadAnalytics();
    const visitor = getAnalyticsVisitorId();
    const session = getAnalyticsSessionId();

    expect(getAnalyticsVisitorId()).toBe(visitor);
    expect(getAnalyticsSessionId()).toBe(session);
    expect(localStorage.getItem("worldstories_analytics_visitor")).toBe(visitor);
    expect(sessionStorage.getItem("worldstories_analytics_session")).toBe(session);
  });

  it("keeps ids stable for the page's lifetime when storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { getAnalyticsVisitorId, getAnalyticsSessionId, trackAnalyticsEvent } = await loadAnalytics();

    const visitor = getAnalyticsVisitorId();
    const session = getAnalyticsSessionId();

    expect(getAnalyticsVisitorId()).toBe(visitor);
    expect(getAnalyticsSessionId()).toBe(session);
    expect(visitor).not.toBe(session);

    trackAnalyticsEvent({ event_type: "visit" });
    trackAnalyticsEvent({ event_type: "visit" });
    const payloads = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(new Set(payloads.map((payload) => payload.visitor_id))).toEqual(new Set([visitor]));
    expect(new Set(payloads.map((payload) => payload.event_id)).size).toBe(2);
  });
});
