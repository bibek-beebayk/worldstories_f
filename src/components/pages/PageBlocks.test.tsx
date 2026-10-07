// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { PageBlock, pageExcerpt } from "./PageBlocks";
import type { PublicPageBlock, Story } from "@/api/types";

const story = (id: number, title: string) =>
  ({ id, slug: `story-${id}`, title, cover_image: "", rating: 4, views: 10, story_type: "Novel" }) as unknown as Story;

const renderBlock = (block: PublicPageBlock, asPageHeading = false) =>
  render(
    <MemoryRouter>
      <PageBlock block={block} asPageHeading={asPageHeading} />
    </MemoryRouter>
  );

afterEach(cleanup);

describe("PageBlock", () => {
  it("renders rich text without scripts or event handlers", () => {
    const { container } = renderBlock({
      id: 1,
      type: "rich_text",
      config: { html: '<h2>About</h2><p onclick="x()">Hello<script>alert(1)</script></p>' },
    });
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("script");
    expect(container.innerHTML).not.toContain("onclick");
  });

  it("renders picked stories in order with the heading", () => {
    renderBlock({
      id: 2,
      type: "story_list",
      config: { heading: "Our picks", story_ids: [2, 1], layout: "grid" },
      stories: [story(2, "Second"), story(1, "First")],
    });
    expect(screen.getByRole("heading", { name: "Our picks" })).toBeInTheDocument();
    const titles = screen.getAllByText(/First|Second/).map((node) => node.textContent);
    expect(titles[0]).toBe("Second");
  });

  it("renders nothing for an empty story list", () => {
    const { container } = renderBlock({
      id: 3,
      type: "story_list",
      config: { heading: "Empty", story_ids: [], layout: "grid" },
      stories: [],
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("links an automatic list to its see-all page", () => {
    renderBlock({
      id: 4,
      type: "story_query",
      config: { heading: "Horror", genre: "horror", category: "", tag: "", theme: "", country: "", sort: "newest", limit: 6, layout: "rail" },
      stories: [story(1, "Scary")],
      see_all_url: "/genre/horror",
    });
    expect(screen.getByRole("link", { name: /see all/i })).toHaveAttribute("href", "/genre/horror");
  });

  it("makes a leading banner the page heading", () => {
    renderBlock(
      { id: 5, type: "banner", config: { heading: "Spooky Season", text: "", image: "", cta_label: "", cta_url: "", background_color: "#000000" } },
      true
    );
    expect(screen.getByRole("heading", { level: 1, name: "Spooky Season" })).toBeInTheDocument();
  });

  it("keeps FAQ answers in the page and opens external CTAs in a new tab", () => {
    renderBlock({ id: 6, type: "faq", config: { heading: "", items: [{ question: "Is it free?", answer: "Yes." }] } });
    expect(screen.getByText("Yes.")).toBeInTheDocument();
    cleanup();
    renderBlock({ id: 7, type: "cta", config: { text: "", label: "Join", url: "https://example.com", bg_color: "#ed405a", text_color: "#ffffff" } });
    expect(screen.getByRole("link", { name: /join/i })).toHaveAttribute("target", "_blank");
  });
});

describe("pageExcerpt", () => {
  it("uses the first rich text block as plain text, shortened", () => {
    const blocks: PublicPageBlock[] = [
      { id: 1, type: "banner", config: { heading: "H", text: "", image: "", cta_label: "", cta_url: "", background_color: "#000000" } },
      { id: 2, type: "rich_text", config: { html: "<p>Ghost&nbsp;stories &amp; <b>legends</b></p>" } },
    ];
    expect(pageExcerpt(blocks)).toBe("Ghost stories & legends");
    expect(pageExcerpt(blocks, 10)).toBe("Ghost sto…");
  });
});
