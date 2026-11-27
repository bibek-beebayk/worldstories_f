// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Story } from "@/api/types";
import type { ContinueEntry } from "@/lib/continueShelf";
import ContinueCoverflow, { getCircularDistance } from "./ContinueCoverflow";

function makeEntry(id: number, overrides: Partial<ContinueEntry> = {}): ContinueEntry {
  const story = {
    id,
    title: `Story ${id}`,
    slug: `story-${id}`,
    author: `Author ${id}`,
    cover_image: null,
  } as unknown as Story;

  return {
    kind: "reading",
    story,
    href: `/read/story-${id}/ch-1`,
    detail: `Chapter ${id}`,
    progress: 0.4,
    remainingMinutes: 12,
    updatedAt: "2026-11-27T10:00:00Z",
    ...overrides,
  };
}

function renderCoverflow(entries: ContinueEntry[]) {
  return render(
    <MemoryRouter>
      <ContinueCoverflow entries={entries} />
    </MemoryRouter>
  );
}

function mockMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ContinueCoverflow", () => {
  it("renders a single-card layout with no arrows and no dots for 1 entry", () => {
    renderCoverflow([makeEntry(1)]);

    expect(screen.getByRole("heading", { name: "Story 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous in Continue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next in Continue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Go to item/i })).not.toBeInTheDocument();
  });

  it("renders arrows but no dots for 2 entries", () => {
    renderCoverflow([makeEntry(1), makeEntry(2)]);

    expect(screen.getByRole("button", { name: "Previous in Continue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next in Continue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Go to item/i })).not.toBeInTheDocument();
  });

  it("renders one dot per entry for 3+ entries and marks the first dot active", () => {
    renderCoverflow([makeEntry(1), makeEntry(2), makeEntry(3)]);

    const dots = screen.getAllByRole("button", { name: /Go to item/i });
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("aria-current", "true");
    expect(dots[1]).not.toHaveAttribute("aria-current");
    expect(dots[2]).not.toHaveAttribute("aria-current");
  });

  it("shows Continue reading / Continue listening with links to entry.href", () => {
    const reading = makeEntry(1, { kind: "reading", href: "/read/story-1/ch-2" });
    const listening = makeEntry(2, { kind: "listening", href: "/listen/story-2/ep-1" });
    renderCoverflow([reading, listening]);

    const readCta = screen.getByRole("link", { name: /Continue reading/i });
    expect(readCta).toHaveAttribute("href", "/read/story-1/ch-2");

    fireEvent.click(screen.getByRole("button", { name: "Show Story 2" }));
    const listenCta = screen.getByRole("link", { name: /Continue listening/i });
    expect(listenCta).toHaveAttribute("href", "/listen/story-2/ep-1");
  });

  it("renders active card as a link and non-active cards as buttons that scroll without navigating", () => {
    renderCoverflow([makeEntry(1), makeEntry(2), makeEntry(3)]);

    const activeCard = screen.getByRole("link", { name: "Continue Story 1" });
    expect(activeCard).toHaveAttribute("href", "/read/story-1/ch-1");

    const inactiveCard = screen.getByRole("button", { name: "Show Story 2" });
    fireEvent.click(inactiveCard);
    expect(screen.getByRole("heading", { name: "Story 2" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue Story 2" })).toHaveAttribute(
      "href",
      "/read/story-2/ch-1"
    );
  });

  it("hides detail and remaining-time lines when null", () => {
    renderCoverflow([
      makeEntry(1, { detail: null, remainingMinutes: null }),
      makeEntry(2),
    ]);

    const info = screen.getByTestId("coverflow-info");
    expect(info).not.toHaveTextContent("Chapter");
    expect(info).not.toHaveTextContent(/min left/i);
  });

  it("removes rotate and scale transforms when prefers-reduced-motion matches", () => {
    mockMatchMedia(true);
    renderCoverflow([makeEntry(1), makeEntry(2), makeEntry(3)]);

    expect(screen.getByTestId("coverflow-slide-0").style.transform).not.toMatch(/rotate|scale|perspective/);
    expect(screen.getByTestId("coverflow-slide-1").style.transform).not.toMatch(/rotate|scale|perspective/);
  });

  it("wraps around: the last item sits left of the first, and previous/next wrap", () => {
    renderCoverflow([makeEntry(1), makeEntry(2), makeEntry(3), makeEntry(4)]);

    expect(screen.getByTestId("coverflow-slide-3").style.transform).toMatch(/translateX\(-/);
    expect(screen.getByTestId("coverflow-slide-1").style.transform).toMatch(/translateX\(\d/);

    fireEvent.click(screen.getByRole("button", { name: "Previous in Continue" }));
    expect(screen.getByRole("heading", { name: "Story 4" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next in Continue" }));
    expect(screen.getByRole("heading", { name: "Story 1" })).toBeInTheDocument();
  });

  it("computes circular distances", () => {
    expect(getCircularDistance(0, 0, 7)).toBe(0);
    expect(getCircularDistance(1, 0, 7)).toBe(1);
    expect(getCircularDistance(3, 0, 7)).toBe(3);
    expect(getCircularDistance(4, 0, 7)).toBe(-3);
    expect(getCircularDistance(6, 0, 7)).toBe(-1);
    expect(getCircularDistance(0, 6, 7)).toBe(1);
    expect(getCircularDistance(1, 0, 2)).toBe(1);
  });

  it("shows at most 7 dots and a counter for long lists", () => {
    renderCoverflow(Array.from({ length: 21 }, (_, i) => makeEntry(i + 1)));

    expect(screen.getAllByRole("button", { name: /Go to item/i })).toHaveLength(7);
    expect(screen.getByText("1 / 21")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next in Continue" }));
    expect(screen.getByText("2 / 21")).toBeInTheDocument();
  });

  it("renders a progress ring on the active card (shown on mobile only)", () => {
    renderCoverflow([makeEntry(1, { progress: 0.4 }), makeEntry(2), makeEntry(3)]);

    expect(screen.getByRole("img", { name: "40% complete" })).toBeInTheDocument();
  });
});
