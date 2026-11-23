// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import BlogCard from "./BlogCard";
import type { Blog } from "@/api/types";

afterEach(cleanup);

const base: Blog = {
  id: 1,
  title: "Five Folktales to Read This Monsoon",
  slug: "five-folktales",
  excerpt: "Rain, rivers and ferrymen.",
  content: "",
  cover_image: "",
  author_name: "Asha Rai",
  published_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const renderCard = (blog: Partial<Blog> = {}) =>
  render(
    <MemoryRouter>
      <BlogCard blog={{ ...base, ...blog }} />
    </MemoryRouter>,
  );

describe("BlogCard", () => {
  it("shows topic, title, excerpt, date and read time", () => {
    renderCard({ topics: [{ name: "Folklore & myth", slug: "folklore-myth" }], reading_time_minutes: 8 });
    expect(screen.getByText("Folklore & myth")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: base.title })).toHaveAttribute("href", "/blog/five-folktales");
    expect(screen.getByText("Rain, rivers and ferrymen.")).toBeInTheDocument();
    expect(screen.getByText("8 min read")).toBeInTheDocument();
  });

  it("draws only what the API sent: no excerpt, topic, read time or book is simply absent", () => {
    renderCard({ excerpt: "", reading_time_minutes: null, topics: [] });
    expect(screen.queryByText(/min read/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Read the book/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("links the book separately and never nests one link inside another", () => {
    const { container } = renderCard({
      linked_story: { title: "Station Nineteen", slug: "station-nineteen" } as Blog["linked_story"],
    });
    const book = screen.getByRole("link", { name: /Read the book: Station Nineteen/ });
    expect(book).toHaveAttribute("href", "/story/station-nineteen");
    expect(container.querySelectorAll("a a")).toHaveLength(0);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders overlay, wide, and text variants without topic chips", () => {
    const withTopic = { topics: [{ name: "Folklore & myth", slug: "folklore-myth" }], reading_time_minutes: 6 };
    render(
      <MemoryRouter>
        <BlogCard blog={{ ...base, ...withTopic }} variant="overlay" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: base.title })).toHaveAttribute("href", "/blog/five-folktales");
    expect(screen.queryByText("Folklore & myth")).not.toBeInTheDocument();
    cleanup();

    render(
      <MemoryRouter>
        <BlogCard blog={{ ...base, ...withTopic }} variant="wide" />
      </MemoryRouter>,
    );
    expect(screen.getByText("Rain, rivers and ferrymen.")).toBeInTheDocument();
    expect(screen.queryByText("Folklore & myth")).not.toBeInTheDocument();
    cleanup();

    const { container } = render(
      <MemoryRouter>
        <BlogCard blog={{ ...base, ...withTopic }} variant="text" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: base.title })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
