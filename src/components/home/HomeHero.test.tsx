// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import HomeHero from "./HomeHero";
import { buildDefaultHero } from "./heroPresets";
import type { HeroConfig } from "@/api/types";

afterEach(cleanup);

const renderHero = (hero: HeroConfig) =>
  render(
    <MemoryRouter>
      <HomeHero hero={hero} />
    </MemoryRouter>
  );

describe("HomeHero", () => {
  it("renders the built-in default with live stats abbreviated", () => {
    renderHero(buildDefaultHero({ stories: 1200, creators: 34, readers: 56000 }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("WorldStories");
    expect(screen.getByText("Full novels, quick reads & poetry")).toBeInTheDocument();
    expect(screen.getByText("1.2K")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start reading/i })).toHaveAttribute("href", "/library");
  });

  it("hides the stats row when there are no stats", () => {
    renderHero(buildDefaultHero());
    expect(screen.queryByText("stories")).not.toBeInTheDocument();
  });

  it("renders template content, custom stat text and an external CTA in a new tab", () => {
    const hero: HeroConfig = {
      ...buildDefaultHero(),
      title: { prefix: "Spooky", highlight: "Stories", highlight_from: "#ff7518", highlight_to: "#6b21a8" },
      stats: [{ label: "spooky tales", value: "13" }],
      info_lines: [{ icon: "NotARealIcon", text: "Ghost stories all week" }],
      cta: { label: "Enter if you dare", url: "https://example.com/halloween", bg_from: "#ff7518", bg_to: "#6b21a8", text_color: "#ffffff" },
      background: { color: "#120a1f", image: "", accent: "#ff7518", animation: "halloween", icons: [] },
    };
    renderHero(hero);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("SpookyStories");
    expect(screen.getByText("13")).toBeInTheDocument();
    // Unknown icon names fall back instead of crashing.
    expect(screen.getByText("Ghost stories all week")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /enter if you dare/i });
    expect(cta).toHaveAttribute("href", "https://example.com/halloween");
    expect(cta).toHaveAttribute("target", "_blank");
  });
});
