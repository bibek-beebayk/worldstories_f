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

const renderCard = (props: { is_original?: boolean }) =>
  render(
    <MemoryRouter>
      <StoryCard {...baseStory} {...props} />
    </MemoryRouter>
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
