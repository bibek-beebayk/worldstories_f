// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  buildShareText,
  clearGuestKey,
  gamesApi,
  getCountdownToUtcMidnight,
  getOrCreateGuestKey,
  getStoredGuestKey,
  type PublicPuzzleResponse,
  type PuzzleStatsResponse,
} from "@/lib/games/nameThatStory";
import StoryGuessCombobox from "@/components/games/StoryGuessCombobox";
import NameThatStory, { ClueLadder, MatchChips } from "@/pages/NameThatStory";

vi.mock("@/hooks/useIsLoggedIn", () => ({
  useIsLoggedIn: vi.fn(() => false),
}));

vi.mock("@/context/AuthModalContext", () => ({
  useAuthModal: () => ({ openLoginModal: vi.fn() }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const BASE_STATS: PuzzleStatsResponse = {
  played: 4,
  wins: 3,
  win_percentage: 75,
  current_streak: 2,
  best_streak: 3,
  guess_distribution: { "1": 0, "2": 2, "3": 1, "4": 0, "5": 0, "6": 0 },
  week_history: [
    { date: "2026-11-24", status: "solved" },
    { date: "2026-11-25", status: "unplayed" },
  ],
};

const STORY_FRESH: PublicPuzzleResponse = {
  puzzle_number: 12,
  date: "2026-11-25",
  puzzle_type: "opening_line",
  answer_kind: "story",
  max_guesses: 6,
  guesses_used: 0,
  status: "in_progress",
  is_archive: false,
  clues: [
    {
      position: 1,
      kind: "text",
      label: "Opening line",
      value: "Call me Ishmael on a cold autumn morning.",
      locked: false,
    },
    { position: 2, locked: true },
    { position: 3, locked: true },
    { position: 4, locked: true },
  ],
  guesses: [],
  yesterday: null,
};

const AUTHOR_IN_PROGRESS: PublicPuzzleResponse = {
  puzzle_number: 13,
  date: "2026-11-25",
  puzzle_type: "author_bio",
  answer_kind: "author",
  max_guesses: 6,
  guesses_used: 1,
  status: "in_progress",
  is_archive: false,
  clues: [
    { position: 1, kind: "attribute", label: "Genres", value: "Gothic, Mystery", locked: false },
    {
      position: 2,
      kind: "attribute",
      label: "Notable work",
      value: "The Tell-Tale Heart",
      locked: false,
    },
    { position: 3, locked: true },
    { position: 4, locked: true },
  ],
  guesses: [
    {
      target_id: 2,
      title: "Mary Shelley",
      subtitle: "United Kingdom, 1810s",
      initials: "M. S.",
      correct: false,
      matches: { genre: true, country: false, era: "close" },
      skipped: false,
    },
  ],
  yesterday: null,
};

const STORY_SOLVED: PublicPuzzleResponse = {
  ...STORY_FRESH,
  guesses_used: 2,
  status: "solved",
  clues: [
    {
      position: 1,
      kind: "text",
      label: "Opening line",
      value: "Call me Ishmael on a cold autumn morning.",
      locked: false,
    },
    { position: 2, kind: "attribute", label: "Genre", value: "Adventure", locked: false },
  ],
  guesses: [
    {
      target_id: 99,
      title: "Treasure Island",
      subtitle: "Robert Louis Stevenson",
      initials: "",
      correct: false,
      matches: { genre: true, country: false, era: "close" },
      skipped: false,
    },
    {
      target_id: 1,
      title: "Moby-Dick",
      subtitle: "Herman Melville",
      initials: "",
      correct: true,
      matches: { genre: true, country: true, era: "same" },
      skipped: false,
    },
  ],
  answer: {
    kind: "story",
    id: 1,
    title: "Moby-Dick",
    slug: "moby-dick",
    author: "Herman Melville",
    year: 1851,
    cover: null,
    read_time: 120,
    audiobook_slug: "moby-dick",
  },
  share_tokens: ["wrong", "right", "empty", "empty", "empty", "empty"],
};

const AUTHOR_FAILED: PublicPuzzleResponse = {
  ...AUTHOR_IN_PROGRESS,
  guesses_used: 6,
  status: "failed",
  answer: {
    kind: "author",
    id: 1,
    name: "Edgar Allan Poe",
    slug: "edgar-allan-poe",
    years: "1809–1849",
    initials: "E. A. P.",
    image: null,
    works: [
      { id: 10, title: "The Black Cat", slug: "the-black-cat", year: 1843, cover: null },
    ],
  },
  share_tokens: ["wrong", "wrong", "wrong", "wrong", "wrong", "wrong"],
};

describe("Name That Story pure helpers", () => {
  beforeEach(() => {
    clearGuestKey();
  });

  it("builds share text without leaking answer or clue text", () => {
    const solvedText = buildShareText(
      42,
      "solved",
      3,
      ["wrong", "wrong", "right", "empty", "empty", "empty"],
      "https://worldstories.org/games/name-that-story"
    );
    expect(solvedText).toBe(
      "Name That Story #42 3/6\nXXO---\nhttps://worldstories.org/games/name-that-story"
    );

    const failedText = buildShareText(
      42,
      "failed",
      6,
      ["wrong", "wrong", "wrong", "wrong", "wrong", "wrong"],
      "https://worldstories.org/games/name-that-story"
    );
    expect(failedText).toContain("Name That Story #42 X/6");
    expect(failedText).toContain("XXXXXX");
  });

  it("persists and clears the guest key in localStorage", () => {
    expect(getStoredGuestKey()).toBe("");
    const key1 = getOrCreateGuestKey();
    expect(key1.length).toBeGreaterThan(8);
    expect(getOrCreateGuestKey()).toBe(key1);
    expect(getStoredGuestKey()).toBe(key1);
    clearGuestKey();
    expect(getStoredGuestKey()).toBe("");
  });

  it("computes countdown to next UTC midnight", () => {
    const now = new Date(Date.UTC(2026, 10, 25, 22, 30, 15));
    const cd = getCountdownToUtcMidnight(now);
    expect(cd.formatted).toBe("01:29:45");
    expect(cd.totalSeconds).toBe(5385);
  });
});

describe("ClueLadder and MatchChips", () => {
  it("renders opening_line quote card and locked tiles", () => {
    renderWithProviders(<ClueLadder puzzle={STORY_FRESH} />);
    expect(screen.getByText(/Call me Ishmael/)).toBeInTheDocument();
    expect(screen.getByText("Unlocks after guess 1")).toBeInTheDocument();
    expect(screen.getByText("Unlocks after guess 2")).toBeInTheDocument();
  });

  it("renders author_bio numbered ladder with New badge on newest clue and locked rows", () => {
    renderWithProviders(<ClueLadder puzzle={AUTHOR_IN_PROGRESS} />);
    expect(screen.getByText("Gothic, Mystery")).toBeInTheDocument();
    expect(screen.getByText("The Tell-Tale Heart")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Unlocks after guess 2")).toBeInTheDocument();
  });

  it("renders Era: close chip for close era matches", () => {
    renderWithProviders(<MatchChips item={AUTHOR_IN_PROGRESS.guesses[0]} />);
    expect(screen.getByText("Genre")).toBeInTheDocument();
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("Era: close")).toBeInTheDocument();
  });
});

describe("StoryGuessCombobox keyboard behaviour", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates with ArrowDown/Enter/Escape and requires selection before submitting", async () => {
    vi.spyOn(gamesApi, "search").mockResolvedValue({
      kind: "author",
      results: [
        { id: 1, name: "Edgar Allan Poe", subtitle: "United States, 1800s", initials: "E. A. P." },
        { id: 2, name: "Mary Shelley", subtitle: "United Kingdom, 1810s", initials: "M. S." },
      ],
    });
    const onGuess = vi.fn();
    const onSkip = vi.fn();

    renderWithProviders(
      <StoryGuessCombobox
        puzzleDate="2026-11-25"
        answerKind="author"
        guessedIds={new Set([2])}
        onSubmitGuess={onGuess}
        onSkip={onSkip}
      />
    );

    const input = screen.getByRole("combobox", { name: "Search authors" });
    const guessBtn = screen.getByRole("button", { name: "Guess" });
    expect(guessBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: "Ed" } });

    await waitFor(() => {
      expect(screen.getByText("Edgar Allan Poe")).toBeInTheDocument();
    });

    // ArrowDown highlights first option, Enter selects it
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(guessBtn).not.toBeDisabled();
    fireEvent.click(guessBtn);
    expect(onGuess).toHaveBeenCalledWith(1);

    // Escape closes listbox
    fireEvent.change(input, { target: { value: "Mary" } });
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("NameThatStory page states", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders fresh state with guest banner", async () => {
    vi.spyOn(gamesApi, "getToday").mockResolvedValue(STORY_FRESH);
    vi.spyOn(gamesApi, "getStats").mockResolvedValue(BASE_STATS);
    vi.spyOn(gamesApi, "getWeek").mockResolvedValue({
      days: [
        { date: "2026-11-25", puzzle_type: "opening_line", answer_kind: "story", is_today: true },
        { date: "2026-11-26", puzzle_type: "quote", answer_kind: "story", is_today: false },
      ],
    });

    renderWithProviders(<NameThatStory />);
    await waitFor(() => expect(screen.getByText(/Daily puzzle #12/)).toBeInTheDocument());
    expect(screen.getByText("Guess 1 of 6")).toBeInTheDocument();
    expect(screen.getByText("Playing as a guest")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow: In-book quote")).toBeInTheDocument();
  });

  it("renders in-progress author puzzle with match chips", async () => {
    vi.spyOn(gamesApi, "getToday").mockResolvedValue(AUTHOR_IN_PROGRESS);
    vi.spyOn(gamesApi, "getStats").mockResolvedValue(BASE_STATS);
    vi.spyOn(gamesApi, "getWeek").mockResolvedValue({ days: [] });

    renderWithProviders(<NameThatStory />);
    await waitFor(() => expect(screen.getByText("Guess 2 of 6")).toBeInTheDocument());
    expect(screen.getByText("Mary Shelley")).toBeInTheDocument();
    expect(screen.getByText("Era: close")).toBeInTheDocument();
  });

  it("renders solved / already-played state with story card, Listen link, and no input", async () => {
    vi.spyOn(gamesApi, "getToday").mockResolvedValue(STORY_SOLVED);
    vi.spyOn(gamesApi, "getStats").mockResolvedValue(BASE_STATS);
    vi.spyOn(gamesApi, "getWeek").mockResolvedValue({ days: [] });

    renderWithProviders(<NameThatStory />);
    await waitFor(() => expect(screen.getByText("You got it in 2 guesses")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /Read it free/i })).toHaveAttribute(
      "href",
      "/story/moby-dick"
    );
    expect(screen.getByRole("link", { name: /Listen/i })).toHaveAttribute(
      "href",
      "/listen/moby-dick"
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders failed state for author puzzle with author works", async () => {
    vi.spyOn(gamesApi, "getToday").mockResolvedValue(AUTHOR_FAILED);
    vi.spyOn(gamesApi, "getStats").mockResolvedValue(BASE_STATS);
    vi.spyOn(gamesApi, "getWeek").mockResolvedValue({ days: [] });

    renderWithProviders(<NameThatStory />);
    await waitFor(() => expect(screen.getByText("Out of guesses for today")).toBeInTheDocument());
    expect(screen.getByText("Edgar Allan Poe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /The Black Cat/i })).toHaveAttribute(
      "href",
      "/story/the-black-cat"
    );
  });
});
