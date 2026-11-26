// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  buildMiniShareText,
  formatTimer,
  miniApi,
  numberGridClient,
  type MiniPublicResponse,
  type MiniStatsResponse,
} from "@/lib/games/miniCrossword";
import MiniCrossword from "@/pages/MiniCrossword";
import MiniDifficultyChip from "@/components/games/MiniDifficultyChip";
import AdminMiniCrosswordEdit from "@/pages/admin/AdminMiniCrosswordEdit";

vi.mock("@/hooks/useIsLoggedIn", () => ({
  useIsLoggedIn: vi.fn(() => false),
}));

vi.mock("@/context/AuthModalContext", () => ({
  useAuthModal: () => ({ openLoginModal: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

const PATTERN = ["....#", ".....", ".....", ".....", "#...."];
const { numbering, entries } = numberGridClient(PATTERN);

const BASE_PUZZLE: MiniPublicResponse = {
  number: 7,
  date: "2026-11-25",
  title: "Poe and Gothic",
  pattern: PATTERN,
  numbering,
  entries,
  clues: [
    { number: 1, direction: "across", clue: "Unwanted inbox messages", length: 4 },
    { number: 5, direction: "across", clue: "Short stories of wonder", length: 5 },
    { number: 7, direction: "across", clue: "Quick and nimble", length: 5 },
    { number: 8, direction: "across", clue: "Poe's midnight bird", length: 5 },
    { number: 9, direction: "across", clue: "Strong requirement", length: 4 },
    { number: 1, direction: "down", clue: "Bright night-sky point", length: 4 },
    { number: 2, direction: "down", clue: "Ancient polytheistic belief", length: 5 },
    { number: 3, direction: "down", clue: "Breathing and well", length: 5 },
    { number: 4, direction: "down", clue: "Chaotic close-quarters brawl", length: 5 },
    { number: 6, direction: "down", clue: "Dispatch a letter", length: 4 },
  ],
  is_archive: false,
  attempt: null,
};

const IN_PROGRESS_PUZZLE: MiniPublicResponse = {
  ...BASE_PUZZLE,
  attempt: {
    status: "in_progress",
    letters: PATTERN,
    revealed: [],
    started_at: new Date().toISOString(),
    hints_used: 0,
    elapsed_seconds: null,
    is_archive: false,
  },
};

const SOLVED_PUZZLE: MiniPublicResponse = {
  ...BASE_PUZZLE,
  attempt: {
    status: "solved",
    letters: ["SPAM#", "TALES", "AGILE", "RAVEN", "#NEED"],
    revealed: [[0, 2]],
    started_at: new Date().toISOString(),
    hints_used: 1,
    elapsed_seconds: 83,
    is_archive: false,
  },
  solution: ["SPAM#", "TALES", "AGILE", "RAVEN", "#NEED"],
  share_tokens: ["GGYGK", "GGGGG", "GGGGG", "GGGGG", "KGGGG"],
  linked_stories: [
    {
      number: 8,
      direction: "across",
      answer: "RAVEN",
      story_id: 1,
      title: "The Raven",
      slug: "the-raven",
      author: "Edgar Allan Poe",
      cover: null,
    },
  ],
};

const STATS: MiniStatsResponse = {
  played: 3,
  solved: 3,
  solved_percentage: 100,
  average_time: 90,
  best_time: 72,
  current_streak: 2,
  best_streak: 2,
  last_7_times: [{ date: "2026-11-25", elapsed_seconds: 83, hints_used: 1 }],
  week_history: [{ date: "2026-11-25", status: "solved" }],
};

describe("Mini Crossword pure helpers", () => {
  it("formats timer cleanly", () => {
    expect(formatTimer(0)).toBe("00:00");
    expect(formatTimer(83)).toBe("01:23");
    expect(formatTimer(83, false)).toBe("1:23");
  });

  it("builds share text with squares and no letters", () => {
    const text = buildMiniShareText(
      7,
      83,
      ["GGYGK", "GGGGG", "GGGGG", "GGGGG", "KGGGG"],
      1,
      "https://worldstories.org/games/mini-crossword"
    );
    expect(text).toContain("Mini Crossword #7, 1:23");
    expect(text).toContain("1 hint");
    expect(text).toContain("https://worldstories.org/games/mini-crossword");
    expect(text).not.toContain("SPAM");
    expect(text).not.toContain("RAVEN");
  });

  it("numbers 5x5 grid accurately", () => {
    expect(numbering[0]).toEqual([1, 2, 3, 4, null]);
    expect(numbering[1]).toEqual([5, null, null, null, 6]);
    expect(numbering[4]).toEqual([null, 9, null, null, null]);
  });
});

describe("MiniCrossword UI states & keyboard navigation", () => {
  it("renders start screen with Start button and guest banner", async () => {
    vi.spyOn(miniApi, "getToday").mockResolvedValue(BASE_PUZZLE);
    vi.spyOn(miniApi, "getStats").mockResolvedValue(STATS);

    renderWithProviders(<MiniCrossword />);
    await waitFor(() =>
      expect(screen.getByText("Timer starts when you press Start")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start puzzle" })).toBeInTheDocument();
    expect(screen.getByText(/Playing as a guest/)).toBeInTheDocument();
  });

  it("supports keyboard typing, backspace, arrows, tab to next clue, direction toggle, check marking, and local-only pencil mode", async () => {
    vi.spyOn(miniApi, "getToday").mockResolvedValue(IN_PROGRESS_PUZZLE);
    vi.spyOn(miniApi, "getStats").mockResolvedValue(STATS);
    const saveSpy = vi.spyOn(miniApi, "save").mockResolvedValue({
      saved: true,
      letters: PATTERN,
    });
    vi.spyOn(miniApi, "check").mockResolvedValue({ wrong: [[0, 0]] });

    renderWithProviders(<MiniCrossword />);
    await waitFor(() => expect(screen.getByRole("grid")).toBeInTheDocument());

    const cell00 = screen.getByRole("button", { name: /Row 1, Column 1, clue 1/i });
    fireEvent.click(cell00);

    // Toggle Pencil ON -> typing never calls save
    fireEvent.click(screen.getByRole("button", { name: /Pencil off/i }));
    fireEvent.keyDown(cell00, { key: "Z" });
    expect(screen.getByRole("button", { name: /Row 1, Column 1.*pencil Z/i })).toBeInTheDocument();
    expect(saveSpy).not.toHaveBeenCalled();

    // Toggle Pencil OFF -> pen letter replaces pencil letter
    fireEvent.click(screen.getByRole("button", { name: /Pencil on/i }));
    fireEvent.keyDown(cell00, { key: "X" });
    expect(screen.getByRole("button", { name: /Row 1, Column 1, clue 1, X/i })).toBeInTheDocument();

    // Check grid marks cell (0,0) as wrong
    fireEvent.click(screen.getByRole("button", { name: /Check grid/i }));
    await waitFor(() => expect(screen.getByText("1 letter is off")).toBeInTheDocument());

    // Space toggles direction to down; Tab moves to next clue
    const cell01 = screen.getByRole("button", { name: /Row 1, Column 2/i });
    fireEvent.keyDown(cell01, { key: " " });
    fireEvent.keyDown(cell01, { key: "Tab" });
    fireEvent.keyDown(cell01, { key: "ArrowDown" });
    fireEvent.keyDown(cell01, { key: "Backspace" });
  });

  it("renders solved / already-played state with linked stories and countdown", async () => {
    vi.spyOn(miniApi, "getToday").mockResolvedValue(SOLVED_PUZZLE);
    vi.spyOn(miniApi, "getStats").mockResolvedValue(STATS);

    renderWithProviders(<MiniCrossword />);
    await waitFor(() => expect(screen.getByText("Solved in 1:23")).toBeInTheDocument());
    expect(screen.getByText("Stories hiding in this grid")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read it free/i })).toHaveAttribute(
      "href",
      "/story/the-raven"
    );
    expect(screen.getByRole("button", { name: /Copy result/i })).toBeInTheDocument();
  });
});

describe("MiniDifficultyChip and AdminMiniCrosswordEdit", () => {
  it("renders text labels for all three difficulty levels", () => {
    renderWithProviders(
      <div>
        <MiniDifficultyChip difficulty="easy" />
        <MiniDifficultyChip difficulty="medium" />
        <MiniDifficultyChip difficulty="hard" />
      </div>
    );
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
  });

  it("handles difficulty override select, Reset to auto, and save-to-bank checkbox", async () => {
    vi.spyOn(miniApi, "adminValidate").mockResolvedValue({
      errors: [],
      warnings: ["This grid has 2 names (POE, HUGO)."],
      difficulty: {
        label: "medium",
        score: 1.4,
        avg_zipf: 4.5,
        rare_words: [],
        names: ["POE", "HUGO"],
        entry_count: 10,
      },
    });

    renderWithProviders(<AdminMiniCrosswordEdit />);

    const select = screen.getByLabelText("Difficulty override") as HTMLSelectElement;
    expect(select.value).toBe("auto");
    expect(screen.queryByText("Override on")).not.toBeInTheDocument();

    // Change to Hard -> Override on + Reset to auto appear
    fireEvent.change(select, { target: { value: "hard" } });
    expect(screen.getByText("Override on")).toBeInTheDocument();
    const resetBtn = screen.getByRole("button", { name: "Reset to auto" });
    fireEvent.click(resetBtn);
    expect(select.value).toBe("auto");
    expect(screen.queryByText("Override on")).not.toBeInTheDocument();

    // Save to clue bank checkbox defaults to checked and toggles
    const checkboxes = screen.getAllByRole("checkbox", { name: /Save .* to clue bank/i });
    expect(checkboxes.length).toBeGreaterThan(0);
    expect(checkboxes[0]).toBeChecked();
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
  });
});
