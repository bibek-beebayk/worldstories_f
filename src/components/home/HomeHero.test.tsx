// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import HomeHero from "./HomeHero";
import { buildDefaultHero } from "./heroPresets";
import type { HeroConfig } from "@/api/types";

afterEach(cleanup);

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
client.setQueryData(["profile-me"], { display_name: "Asha", username: "asha" });

const renderHero = (hero: HeroConfig, compact = false) =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomeHero hero={hero} compact={compact} />
      </MemoryRouter>
    </QueryClientProvider>
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

  it("shows honest live stats and leaves out ones with nothing to report", () => {
    renderHero(
      buildDefaultHero({ stories: 120, readers_30d: 4200, countries: 38, languages: 0, audio_hours: 310, creators: 340, readers: 56000 })
    );
    expect(screen.getByText("readers this month")).toBeInTheDocument();
    expect(screen.getByText("countries")).toBeInTheDocument();
    expect(screen.getByText("hours of audiobooks")).toBeInTheDocument();
    expect(screen.queryByText("languages")).not.toBeInTheDocument();
    // The misleading legacy figures are no longer the default.
    expect(screen.queryByText("creators")).not.toBeInTheDocument();
    expect(screen.queryByText("readers")).not.toBeInTheDocument();
  });

  it("compact hero greets the reader by name with the call to action, no search, stats or description", () => {
    renderHero(
      buildDefaultHero({ stories: 120, readers_30d: 4200, countries: 38, languages: 9, audio_hours: 3, creators: 1, readers: 2 }),
      true
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome back, Asha");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start reading/i })).toHaveAttribute("href", "/library");
    expect(screen.queryByText("readers this month")).not.toBeInTheDocument();
    expect(screen.queryByText(/home for stories from around the world/i)).not.toBeInTheDocument();
  });
});
