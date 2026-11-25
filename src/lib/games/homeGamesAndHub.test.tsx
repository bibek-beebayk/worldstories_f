// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, renderHook } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import HomeGamesStrip from "@/components/home/HomeGamesStrip";
import GamesHub from "@/pages/GamesHub";
import { loader as ntsLoader } from "@/pages/NameThatStory";
import { loader as ntsArchiveLoader } from "@/pages/NameThatStoryArchive";
import {
  miniApi,
  useMiniTodaySummary,
  type MiniStatsResponse,
  type MiniTodaySummary,
} from "./miniCrossword";
import {
  GAMES_VISITED_STORAGE_KEY,
  hasVisitedGames,
  markGamesVisited,
} from "./gamesConfig";

const MOCK_PATTERN = ["....#", ".....", ".....", ".....", "#...."];

function makeSummary(overrides: Partial<MiniTodaySummary> = {}): MiniTodaySummary {
  return {
    date: "2026-11-26",
    number: 42,
    title: "Literary Mini",
    difficulty: "medium",
    pattern: MOCK_PATTERN,
    white_cells: 23,
    status: "not_started",
    filled_cells: 0,
    elapsed_seconds: null,
    hints_used: 0,
    current_streak: 0,
    ...overrides,
  };
}

function makeStats(overrides: Partial<MiniStatsResponse> = {}): MiniStatsResponse {
  return {
    played: 5,
    solved: 4,
    solved_percentage: 80,
    average_time: 95,
    best_time: 62,
    current_streak: 3,
    best_streak: 4,
    last_7_times: [],
    week_history: [
      { date: "2026-11-20", status: "unplayed" },
      { date: "2026-11-21", status: "solved" },
      { date: "2026-11-22", status: "unplayed" },
      { date: "2026-11-23", status: "solved" },
      { date: "2026-11-24", status: "solved" },
      { date: "2026-11-25", status: "solved" },
      { date: "2026-11-26", status: "unplayed" },
    ],
    ...overrides,
  };
}

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe("Step 2: NAME_THAT_STORY_ENABLED feature switch", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("redirects Name That Story routes to /games with 302 when flag is false", () => {
    const r1 = ntsLoader();
    expect(r1).toBeInstanceOf(Response);
    expect((r1 as Response).status).toBe(302);
    expect((r1 as Response).headers.get("Location")).toBe("/games");

    const r2 = ntsArchiveLoader();
    expect(r2).toBeInstanceOf(Response);
    expect((r2 as Response).status).toBe(302);
    expect((r2 as Response).headers.get("Location")).toBe("/games");
  });

  it("restores Name That Story loader and GamesHub links when flag is mocked true", async () => {
    vi.resetModules();
    vi.doMock("@/lib/games/gamesConfig", () => ({
      NAME_THAT_STORY_ENABLED: true,
      GAMES_VISITED_STORAGE_KEY: "ws_games_visited",
      hasVisitedGames: () => true,
      markGamesVisited: () => {},
    }));
    vi.doMock("@/lib/games/nameThatStory", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/games/nameThatStory")>();
      return {
        ...actual,
        useWeek: () => ({ data: { days: [] }, isLoading: false }),
      };
    });
    vi.doMock("@/lib/games/miniCrossword", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/games/miniCrossword")>();
      return {
        ...actual,
        useMiniToday: () => ({ data: undefined }),
      };
    });

    const ntsMod = await import("@/pages/NameThatStory");
    expect(ntsMod.loader()).toBeNull();

    const hubMod = await import("@/pages/GamesHub");
    const LegacyHub = hubMod.default;
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <LegacyHub />
      </Wrapper>
    );
    expect(screen.getByRole("heading", { name: "Name That Story" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Play today/i });
    expect(link).toHaveAttribute("href", "/games/name-that-story");

    vi.doUnmock("@/lib/games/gamesConfig");
    vi.doUnmock("@/lib/games/nameThatStory");
    vi.doUnmock("@/lib/games/miniCrossword");
  });
});

describe("Step 3: useMiniTodaySummary hook", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles loading, success, and 404 error states", async () => {
    const spy = vi
      .spyOn(miniApi, "getTodaySummary")
      .mockResolvedValueOnce(makeSummary({ status: "in_progress", filled_cells: 7 }));

    const { result } = renderHook(() => useMiniTodaySummary(true), {
      wrapper: makeWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.filled_cells).toBe(7);
    expect(spy).toHaveBeenCalledTimes(1);

    // 404 error state
    spy.mockRejectedValueOnce(new Error("No mini crossword is available for today."));
    const { result: errResult } = renderHook(() => useMiniTodaySummary(true), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(errResult.current.isError).toBe(true));
    expect(errResult.current.data).toBeUndefined();
  });
});

describe("Step 4: HomeGamesStrip component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing in server-rendered HTML (SSR)", () => {
    const Wrapper = makeWrapper();
    const html = renderToStaticMarkup(
      <Wrapper>
        <HomeGamesStrip />
      </Wrapper>
    );
    expect(html).toBe("");
  });

  it("renders fixed-height skeleton while loading", () => {
    vi.spyOn(miniApi, "getTodaySummary").mockImplementation(() => new Promise(() => {}));
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HomeGamesStrip />
      </Wrapper>
    );
    expect(screen.getByTestId("home-games-strip-skeleton")).toBeInTheDocument();
  });

  it("renders not_started state with Play button and countdown", async () => {
    vi.spyOn(miniApi, "getTodaySummary").mockResolvedValue(makeSummary({ status: "not_started" }));
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HomeGamesStrip />
      </Wrapper>
    );
    expect(await screen.findByText("Fill the 5x5 with literary clues")).toBeInTheDocument();
    expect(screen.getByText("5x5")).toBeInTheDocument();
    expect(screen.getByText("About 3 min")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Play/i })).toHaveAttribute(
      "href",
      "/games/mini-crossword"
    );
    expect(screen.getByTestId("home-games-countdown")).toHaveTextContent(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("renders in_progress state with accessible progressbar and Continue CTA", async () => {
    vi.spyOn(miniApi, "getTodaySummary").mockResolvedValue(
      makeSummary({
        status: "in_progress",
        filled_cells: 9,
        white_cells: 23,
        elapsed_seconds: 75,
        current_streak: 4,
      })
    );
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HomeGamesStrip />
      </Wrapper>
    );
    expect(await screen.findByText("You are 9 squares in")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Mini Crossword progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "9");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "23");
    expect(screen.getByText("4-day streak")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue/i })).toHaveAttribute(
      "href",
      "/games/mini-crossword"
    );
  });

  it("renders solved state with time, hints, streak, and View result button", async () => {
    vi.spyOn(miniApi, "getTodaySummary").mockResolvedValue(
      makeSummary({
        status: "solved",
        filled_cells: 23,
        elapsed_seconds: 105,
        hints_used: 0,
        current_streak: 3,
      })
    );
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HomeGamesStrip />
      </Wrapper>
    );
    expect(await screen.findByText("Solved in 1:45")).toBeInTheDocument();
    expect(screen.getByText("No hints")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View result/i })).toHaveAttribute(
      "href",
      "/games/mini-crossword"
    );
  });

  it("renders nothing on 404 or network error", async () => {
    vi.spyOn(miniApi, "getTodaySummary").mockRejectedValue(new Error("404"));
    const Wrapper = makeWrapper();
    const { container } = render(
      <Wrapper>
        <HomeGamesStrip />
      </Wrapper>
    );
    await waitFor(() => {
      expect(screen.queryByTestId("home-games-strip-skeleton")).not.toBeInTheDocument();
    });
    expect(container.innerHTML).toBe("");
  });
});

describe("Step 5: GamesHub Mini Crossword page & visited flag", () => {
  beforeEach(() => {
    window.localStorage.removeItem(GAMES_VISITED_STORAGE_KEY);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("tracks visited state safely in localStorage", () => {
    expect(hasVisitedGames()).toBe(false);
    markGamesVisited();
    expect(hasVisitedGames()).toBe(true);
  });

  it("renders Mini Crossword hub with week row, streak, archive, how-it-works, and zero Name That Story links", async () => {
    vi.spyOn(miniApi, "getTodaySummary").mockResolvedValue(
      makeSummary({ status: "in_progress", filled_cells: 12 })
    );
    vi.spyOn(miniApi, "getStats").mockResolvedValue(makeStats());

    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <GamesHub />
      </Wrapper>
    );

    expect(screen.getByRole("heading", { name: "Mini Crossword" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Continue/i })).toHaveAttribute(
      "href",
      "/games/mini-crossword"
    );
    expect(screen.getByTestId("hub-today-card")).toHaveTextContent("#42");
    expect(screen.getByTestId("hub-this-week")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missed a day?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.queryByText(/Name That Story/i)).not.toBeInTheDocument();
    expect(hasVisitedGames()).toBe(true);
  });

  it("shows fallback hero with Play today's mini when summary fails", async () => {
    vi.spyOn(miniApi, "getTodaySummary").mockRejectedValue(new Error("500"));
    vi.spyOn(miniApi, "getStats").mockRejectedValue(new Error("500"));

    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <GamesHub />
      </Wrapper>
    );

    expect(screen.getByRole("heading", { name: "Mini Crossword" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Play today's mini/i })).toHaveAttribute(
        "href",
        "/games/mini-crossword"
      );
    });
    expect(screen.queryByTestId("hub-today-card")).not.toBeInTheDocument();
  });
});
