// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthModalProvider } from "@/context/AuthModalContext";
import {
  buildShareText,
  clearGuestKey,
  gamesApi,
  getOrCreateGuestKey,
  getUtcMidnightCountdown,
  peekGuestKey,
  type PuzzlePayload,
  type PuzzleStats,
} from "@/lib/games/nameThatStory";
import { StoryGuessCombobox } from "@/components/games/StoryGuessCombobox";
import NameThatStory from "@/pages/NameThatStory";

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

const sampleStats: PuzzleStats = {
  played: 3,
  wins: 2,
  win_percentage: 67,
  current_streak: 2,
  best_streak: 2,
  guess_distribution: { "1": 1, "2": 1, "3": 0, "4": 0, "5": 0, "6": 0 },
  week_days: [
    { date: "2026-11-19", label: "T", solved: false },
    { date: "2026-11-20", label: "F", solved: false },
    { date: "2026-11-21", label: "S", solved: false },
    { date: "2026-11-22", label: "S", solved: false },
    { date: "2026-11-23", label: "M", solved: false },
    { date: "2026-11-24", label: "T", solved: true },
    { date: "2026-11-25", label: "W", solved: true },
  ],
};

const baseFreshPuzzle: PuzzlePayload = {
  puzzle_number: 12,
  date: "2026-11-25",
  opening_line: "Call me Ishmael.",
  clues: [{ key: "genre", label: "Genre", value: "Adventure" }],
  guesses_used: 0,
  guesses: [],
  status: "in_progress",
  max_guesses: 6,
  yesterday: null,
};

describe("Name That Story pure helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("buildShareText formats solved and failed grids without answer or opening line", () => {
    const solvedText = buildShareText(
      12,
      "solved",
      3,
      ["wrong", "wrong", "right", "empty", "empty", "empty"],
      "https://worldstories.net",
    );
    const lines = solvedText.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Name That Story #12 3/6");
    expect(lines[2]).toBe("https://worldstories.net/games/name-that-story");
    expect(solvedText).not.toContain("Ishmael");

    const failedText = buildShareText(12, "failed", 6, ["wrong", "wrong", "wrong", "wrong", "wrong", "wrong"]);
    expect(failedText.split("\n")[0]).toBe("Name That Story #12 X/6");
  });

  it("guest key helper creates, persists, and clears UUID in localStorage", () => {
    expect(peekGuestKey()).toBeNull();
    const key1 = getOrCreateGuestKey();
    expect(key1.length).toBeGreaterThan(10);
    expect(peekGuestKey()).toBe(key1);
    expect(getOrCreateGuestKey()).toBe(key1);
    clearGuestKey();
    expect(peekGuestKey()).toBeNull();
  });

  it("getUtcMidnightCountdown computes remaining time to next UTC midnight", () => {
    const sample = new Date(Date.UTC(2026, 10, 25, 22, 30, 15));
    const cd = getUtcMidnightCountdown(sample);
    expect(cd.hours).toBe(1);
    expect(cd.minutes).toBe(29);
    expect(cd.seconds).toBe(45);
    expect(cd.formatted).toBe("01:29:45");
  });
});

describe("StoryGuessCombobox keyboard behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("navigates with ArrowDown/Enter, closes on Escape, and blocks submitting raw text", async () => {
    vi.spyOn(gamesApi, "searchStories").mockResolvedValue({
      results: [
        { key: "story:1", title: "Moby-Dick", author: "Herman Melville", cover_thumb: "" },
        { key: "book:2", title: "Moby Tales", author: "Other Author", cover_thumb: "" },
      ],
    });
    const onSubmitGuess = vi.fn();
    const qc = makeQc();

    render(
      <QueryClientProvider client={qc}>
        <StoryGuessCombobox guessedKeys={new Set(["story:1"])} isSubmitting={false} onSubmitGuess={onSubmitGuess} />
      </QueryClientProvider>,
    );

    const input = screen.getByRole("combobox", { name: "Search for a story title" });
    const guessBtn = screen.getByRole("button", { name: "Guess" }) as HTMLButtonElement;
    expect(guessBtn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "Moby" } });
    expect(guessBtn.disabled).toBe(true); // raw text cannot be submitted

    expect(await screen.findByText("Moby-Dick")).toBeTruthy();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(guessBtn.disabled).toBe(false);
    fireEvent.click(guessBtn);
    expect(onSubmitGuess).toHaveBeenCalledWith(expect.objectContaining({ key: "book:2", title: "Moby Tales" }));
  });
});

describe("NameThatStory page states", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    vi.spyOn(gamesApi, "getStats").mockResolvedValue(sampleStats);
  });

  afterEach(() => {
    cleanup();
  });

  function renderPage() {
    const qc = makeQc();
    return render(
      <QueryClientProvider client={qc}>
        <AuthModalProvider>
          <MemoryRouter initialEntries={["/games/name-that-story"]}>
            <Routes>
              <Route path="/games/name-that-story" element={<NameThatStory />} />
            </Routes>
          </MemoryRouter>
        </AuthModalProvider>
      </QueryClientProvider>,
    );
  }

  it("renders fresh state with guest banner and locked clues", async () => {
    vi.spyOn(gamesApi, "getTodayPuzzle").mockResolvedValue(baseFreshPuzzle);
    renderPage();

    expect(await screen.findByText("Call me Ishmael.")).toBeTruthy();
    expect(screen.getByText("Guess 1 of 6")).toBeTruthy();
    expect(screen.getByText("Playing as a guest")).toBeTruthy();
    expect(screen.getByText("Adventure")).toBeTruthy();
    expect(screen.getByText("Unlocks after guess 1")).toBeTruthy();
  });

  it("renders in-progress state with guess history and era-close chip", async () => {
    vi.spyOn(gamesApi, "getTodayPuzzle").mockResolvedValue({
      ...baseFreshPuzzle,
      guesses_used: 1,
      clues: [
        { key: "genre", label: "Genre", value: "Adventure" },
        { key: "country", label: "Country", value: "United States" },
      ],
      guesses: [
        {
          story_id: 9,
          title: "Treasure Island",
          author: "Robert Louis Stevenson",
          correct: false,
          matches: { genre: true, country: false, era: "close" },
          skipped: false,
        },
      ],
    });
    renderPage();

    expect(await screen.findByText("Guess 2 of 6")).toBeTruthy();
    expect(screen.getByText("Treasure Island")).toBeTruthy();
    expect(screen.getByText("Era: close")).toBeTruthy();
  });

  it("renders solved (already played) state with answer card, Listen link, and no combobox", async () => {
    vi.spyOn(gamesApi, "getTodayPuzzle").mockResolvedValue({
      ...baseFreshPuzzle,
      status: "solved",
      guesses_used: 2,
      guesses: [
        {
          story_id: 9,
          title: "Treasure Island",
          author: "R. L. S.",
          correct: false,
          matches: { genre: true, country: false, era: "different" },
          skipped: false,
        },
        {
          story_id: 1,
          title: "Moby-Dick",
          author: "Herman Melville",
          correct: true,
          matches: { genre: true, country: true, era: "same" },
          skipped: false,
        },
      ],
      answer: {
        id: 1,
        title: "Moby-Dick",
        slug: "moby-dick",
        author: "Herman Melville",
        year: 1851,
        cover: "",
        read_time: 180,
        has_audiobook: true,
        audiobook_slug: "moby-dick",
      },
      share: {
        header: "Name That Story #12 · 2/6",
        tokens: ["wrong", "right", "empty", "empty", "empty", "empty"],
      },
    });
    renderPage();

    expect(await screen.findByText("You got it in 2 guesses")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("link", { name: /Read it free/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Listen/i })).toBeTruthy();
    expect(screen.getByText("Next puzzle in")).toBeTruthy();
  });

  it("renders failed state calmly with answer card", async () => {
    vi.spyOn(gamesApi, "getTodayPuzzle").mockResolvedValue({
      ...baseFreshPuzzle,
      status: "failed",
      guesses_used: 6,
      answer: {
        id: 1,
        title: "Moby-Dick",
        slug: "moby-dick",
        author: "Herman Melville",
        year: 1851,
        cover: "",
        read_time: 180,
        has_audiobook: false,
        audiobook_slug: null,
      },
      share: {
        header: "Name That Story #12 · X/6",
        tokens: ["wrong", "wrong", "wrong", "wrong", "wrong", "wrong"],
      },
    });
    renderPage();

    expect(await screen.findByText(/Out of guesses/i)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("Moby-Dick")).toBeTruthy();
    });
    expect(screen.queryByRole("link", { name: /Listen/i })).toBeNull();
  });

  it("renders external book answer card without Read it free or Listen links", async () => {
    vi.spyOn(gamesApi, "getTodayPuzzle").mockResolvedValue({
      ...baseFreshPuzzle,
      status: "solved",
      guesses_used: 1,
      answer: {
        key: "book:7",
        id: 7,
        title: "Dune",
        slug: null,
        author: "Frank Herbert",
        year: 1965,
        cover: "",
        read_time: null,
        has_audiobook: false,
        audiobook_slug: null,
      },
      share: {
        header: "Name That Story #12 · 1/6",
        tokens: ["right", "empty", "empty", "empty", "empty", "empty"],
      },
    });
    renderPage();

    expect(await screen.findByText("Dune")).toBeTruthy();
    expect(screen.getByText("Frank Herbert · 1965")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Read it free/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Listen/i })).toBeNull();
  });
});
