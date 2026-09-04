// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HeroSection from "./HeroSection";
import { markDailyStoryStarted, trackAnalyticsEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: vi.fn(), markDailyStoryStarted: vi.fn() }));
vi.mock("@/components/CoverImage", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const story = {
  id: 7,
  slug: "the-daily-tale",
  title: "The Daily Tale",
  author: "A Writer",
  story_type: "Short Story",
  language: "en",
  country: "NP",
  description: "",
  about: "A synopsis readers can use to decide whether to begin.",
  cover_image: "https://example.test/daily.jpg",
  rating: 4.8,
  views: 40,
  is_completed: true,
  reading_time_minutes: 12,
  summary_reading_minutes: 3,
};

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(trackAnalyticsEvent).mockClear();
  vi.mocked(markDailyStoryStarted).mockClear();
});

describe("HeroSection Daily Story", () => {
  it("shows the configured story details and tracks its impression and starts", () => {
    render(
      <MemoryRouter>
        <HeroSection
          featuredStories={[]}
          dailyStory={{
            date: "2026-09-04",
            story,
            featured_reason: "Today's editor pick.",
            configured: true,
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Daily Story")).toBeInTheDocument();
    expect(screen.getByText("The Daily Tale")).toBeInTheDocument();
    expect(screen.getByText("Nepal")).toBeInTheDocument();
    expect(screen.getByText("12 min read")).toBeInTheDocument();
    expect(screen.getByText(story.about)).toBeInTheDocument();
    expect(trackAnalyticsEvent).toHaveBeenCalledWith({
      event_type: "daily_story_viewed",
      story_slug: story.slug,
      metadata: { date: "2026-09-04" },
    });

    fireEvent.click(screen.getByRole("link", { name: "Read Story" }));
    fireEvent.click(screen.getByRole("link", { name: "Quick Read" }));
    expect(markDailyStoryStarted).toHaveBeenCalledWith(story.slug, "2026-09-04", "read_story");
    expect(markDailyStoryStarted).toHaveBeenCalledWith(story.slug, "2026-09-04", "quick_read");
  });

  it("keeps the existing featured hero when the response is only a fallback", () => {
    render(
      <MemoryRouter>
        <HeroSection
          featuredStories={[story]}
          dailyStory={{ date: "2026-09-04", story, featured_reason: "Today's featured story", configured: false }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("Featured Story")).toBeInTheDocument();
    expect(screen.queryByText("Daily Story")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Quick Read" })).not.toBeInTheDocument();
    expect(trackAnalyticsEvent).not.toHaveBeenCalled();
  });
});
