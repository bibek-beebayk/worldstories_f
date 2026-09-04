// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render as rtlRender, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import ReadingJourneyPanel from "./ReadingJourneyPanel";
import type { ProfileInsightsResponse, ReadingStreakResponse } from "@/api/types";

const insights = (
  summary: Partial<ProfileInsightsResponse["summary"]>
): ProfileInsightsResponse => ({
  summary: {
    titles_started: 0,
    titles_completed: 0,
    active_days_30: 0,
    favorite_genre: null,
    total_reading_minutes: 0,
    countries_explored: 0,
    ...summary,
  },
  activity: [],
  formats: [],
  genres: [],
});

const streak = (current: number, longest: number): ReadingStreakResponse => ({
  current_streak: current,
  longest_streak: longest,
});

// The Countries Explored tile links through to the Story Passport, so the
// panel needs a router context.
const render = (ui: React.ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(cleanup);

describe("ReadingJourneyPanel", () => {
  it("shows what the reader has actually done", () => {
    render(
      <ReadingJourneyPanel
        insights={insights({
          titles_completed: 12,
          favorite_genre: "Folklore",
          countries_explored: 4,
          total_reading_minutes: 95,
        })}
        streak={streak(6, 21)}
        isLoading={false}
      />
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("6 days")).toBeInTheDocument();
    expect(screen.getByText("21 days")).toBeInTheDocument();
    expect(screen.getByText("Folklore")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("reads long totals as hours rather than a pile of minutes", () => {
    for (const [minutes, expected] of [
      [95, "1h 35m"],
      [120, "2h"],
      [45, "45 min"],
    ] as const) {
      cleanup();
      render(
        <ReadingJourneyPanel
          insights={insights({ total_reading_minutes: minutes })}
          streak={streak(0, 0)}
          isLoading={false}
        />
      );
      expect(screen.getByText(expected)).toBeInTheDocument();
    }
  });

  it("shows a dash for a metric with nothing behind it, not a zero", () => {
    // Countries Explored stays empty until the reader finishes something from
    // somewhere — a "0" presented as a statistic reads as a failure.
    render(
      <ReadingJourneyPanel
        insights={insights({ titles_completed: 3 })}
        streak={streak(0, 0)}
        isLoading={false}
      />
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("degrades gracefully when the streak has not loaded", () => {
    render(
      <ReadingJourneyPanel
        insights={insights({ titles_completed: 2 })}
        streak={undefined}
        isLoading={false}
      />
    );

    expect(screen.getByText("Your Reading Journey")).toBeInTheDocument();
  });

  it("stays out of the way of a reader with no history at all", () => {
    // A wall of dashes tells a new reader only that they have done nothing.
    render(
      <ReadingJourneyPanel insights={insights({})} streak={streak(0, 0)} isLoading={false} />
    );

    expect(screen.queryByText("Your Reading Journey")).not.toBeInTheDocument();
  });

  it("renders a skeleton rather than an empty panel while loading", () => {
    render(<ReadingJourneyPanel insights={undefined} streak={undefined} isLoading />);

    expect(screen.getByText("Your Reading Journey")).toBeInTheDocument();
  });
});
