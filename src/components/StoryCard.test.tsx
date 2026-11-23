// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import StoryCard from "./StoryCard";

const baseStory = {
  id: 1,
  slug: "a-tale",
  title: "A Tale",
  cover_image: "https://example.test/cover.jpg",
  rating: 4.5,
  views: 1234,
  story_type: "Novel",
};

const renderCard = (props: Partial<React.ComponentProps<typeof StoryCard>>) =>
  render(
    <MemoryRouter>
      <StoryCard {...baseStory} {...props} />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe("StoryCard — WorldStories Original badge", () => {
  it("shows the Original badge when is_original is true", () => {
    renderCard({ is_original: true });
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("omits the Original badge otherwise", () => {
    renderCard({ is_original: false });
    expect(screen.queryByText("Original")).not.toBeInTheDocument();
    cleanup();
    renderCard({});
    expect(screen.queryByText("Original")).not.toBeInTheDocument();
  });
});

describe("StoryCard — details", () => {
  it("shows author, length and a non-English language under the title", () => {
    renderCard({ author: "Asha Rai", reading_time_minutes: 12, language: "ne" });
    expect(screen.getByText("Asha Rai")).toBeInTheDocument();
    expect(screen.getByText("12 min · Nepali")).toBeInTheDocument();
    expect(screen.getByText("Nepali", { selector: "div,span" })).toBeInTheDocument();
  });

  it("shows hours for long stories and no language for English", () => {
    renderCard({ reading_time_minutes: 180, language: "en" });
    expect(screen.getByText("3 hr")).toBeInTheDocument();
  });

  it("labels each format badge", () => {
    renderCard({ has_audio: true, has_video: true, has_read_along: true, summary_reading_minutes: 3, has_text: true });
    for (const label of ["Read", "Listen", "Watch", "Read Along", "Quick Read"]) {
      expect(screen.getByRole("img", { name: label })).toHaveAttribute("title", label);
    }
  });

  it("marks stories published in the last two weeks as New", () => {
    renderCard({ site_published_date: new Date().toISOString() });
    expect(screen.getByText("New")).toBeInTheDocument();
    cleanup();
    renderCard({ site_published_date: "2020-01-01T00:00:00Z" });
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("draws a progress bar only while the story is in progress", () => {
    renderCard({ progress: 0.4 });
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    cleanup();
    renderCard({ progress: 1 });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    cleanup();
    renderCard({});
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("stays as sparse as before for a bare story (every other caller)", () => {
    renderCard({});
    expect(screen.getByText("A Tale")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /listen|watch|read/i })).not.toBeInTheDocument();
  });

  it("renders overlay, wide, and text card variants with the same link target", () => {
    renderCard({ variant: "overlay", author: "Asha Rai", is_original: true });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/story/a-tale");
    expect(screen.getByText("A Tale")).toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
    cleanup();

    renderCard({ variant: "wide", author: "Asha Rai", reading_time_minutes: 10, description: "Short blurb" });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/story/a-tale");
    expect(screen.getByText("10 min")).toBeInTheDocument();
    expect(screen.getByText("Short blurb")).toBeInTheDocument();
    cleanup();

    const { container } = renderCard({ variant: "text", author: "Asha Rai", reading_time_minutes: 10 });
    expect(screen.getByRole("link")).toHaveAttribute("href", "/story/a-tale");
    expect(screen.getByText("Asha Rai · 10 min")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
