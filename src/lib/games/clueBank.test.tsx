// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import AdminMiniCrossword from "@/pages/admin/AdminMiniCrossword";
import {
  buildClueBankQueryParams,
  countCsvDataRows,
  miniApi,
  type ClueBankItem,
  type ClueBankPage,
} from "./miniCrossword";

const mockFetchAuthenticatedFile = vi.fn();

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return {
    ...actual,
    fetchAuthenticatedFile: (...args: unknown[]) => mockFetchAuthenticatedFile(...args),
  };
});

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {}
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

function makeItem(id: number, answer = `W${String(id).padStart(3, "0")}`): ClueBankItem {
  return {
    id,
    answer,
    clue: `Clue for ${answer}`,
    story_id: null,
    story_slug: null,
    story_title: null,
    is_name: false,
    times_used: 0,
  };
}

function renderAdmin() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminMiniCrossword />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Clue bank query building and export helpers", () => {
  beforeEach(() => {
    mockFetchAuthenticatedFile.mockReset();
  });

  it("builds cursor & filter params and omits empty values", () => {
    expect(
      buildClueBankQueryParams({
        q: "  raven ",
        cursor: "abc123",
        pageSize: 50,
        length: 5,
        storyId: null,
        isName: null,
        answer: "",
      })
    ).toEqual({
      q: "raven",
      cursor: "abc123",
      page_size: 50,
      length: 5,
      story_id: undefined,
      is_name: undefined,
      answer: undefined,
    });
  });

  it("counts CSV data rows accurately including quoted embedded newlines", () => {
    const csv = [
      "answer,clue,story_slug,is_name,times_used",
      'RAVEN,"Bird that said,\n""Nevermore""",the-raven,false,4',
      "POE,Author of The Raven,,true,2",
    ].join("\n");
    expect(countCsvDataRows(csv)).toBe(2);
    expect(countCsvDataRows("answer,clue,story_slug,is_name,times_used\n")).toBe(0);
    expect(countCsvDataRows("")).toBe(0);
  });

  it("adminClueBankExport extracts filename, falls back to clue-bank.csv, and counts rows", async () => {
    const csvBody =
      "answer,clue,story_slug,is_name,times_used\nRAVEN,Midnight bird,the-raven,false,1\nSTAR,Night light,,false,0\n";
    const buf = new TextEncoder().encode(csvBody).buffer;

    mockFetchAuthenticatedFile.mockResolvedValueOnce({
      buffer: buf,
      filename: "clue-bank-2026-11-25.csv",
      contentType: "text/csv; charset=utf-8",
    });

    const res1 = await miniApi.adminClueBankExport({ q: "bird", length: 5 });
    expect(mockFetchAuthenticatedFile).toHaveBeenCalledWith(
      "/admin/games/mini-crossword/clue-bank/export/?q=bird&length=5",
      "clue-bank.csv"
    );
    expect(res1.filename).toBe("clue-bank-2026-11-25.csv");
    expect(res1.rowCount).toBe(2);
    expect(res1.blob).toBeInstanceOf(Blob);

    // Fallback filename when server header yields empty string
    mockFetchAuthenticatedFile.mockResolvedValueOnce({
      buffer: buf,
      filename: "",
      contentType: "text/csv",
    });
    const res2 = await miniApi.adminClueBankExport();
    expect(res2.filename).toBe("clue-bank.csv");
    expect(res2.rowCount).toBe(2);
  });
});

describe("Clue bank tab infinite scroll, fallbacks, optimistic delete, and error states", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.spyOn(miniApi, "adminList").mockResolvedValue({
      from: "2026-11-25",
      to: "2026-12-09",
      results: [],
    });
    vi.spyOn(miniApi, "adminSummary").mockResolvedValue({
      scheduled_ahead_days: 0,
      empty_in_next_14: 14,
      average_solve_rate: 0,
      players_today: 0,
      needs_attention: [],
    });
    vi.spyOn(miniApi, "adminClueBankHealth").mockResolvedValue({
      total: 4,
      total_answers: 3,
      by_length: { "3": 1, "4": 1, "5": 1 },
      multi_clue_answers: 1,
      scarce_letters: [
        { letter: "Q", count: 0, percent: 0 },
        { letter: "Z", count: 0, percent: 0 },
      ],
      suggestion: "Add more clues, especially 5-letter answers (scarce letters: Q, Z).",
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("flattens pages via Load more fallback, shows End of clue bank, and resets on filter change", async () => {
    const page1: ClueBankPage = {
      results: [makeItem(1, "ALPS"), makeItem(2, "BARK")],
      next_cursor: "cursor-page-2",
      total: 3,
    };
    const page2: ClueBankPage = {
      results: [makeItem(3, "CAVE")],
      next_cursor: null,
      total: 3,
    };
    const emptyFiltered: ClueBankPage = {
      results: [],
      next_cursor: null,
      total: 0,
    };

    const listSpy = vi
      .spyOn(miniApi, "adminClueBankList")
      .mockImplementation(async (params) => {
        const p = typeof params === "string" ? { q: params } : (params ?? {});
        if (p.length === 3) return emptyFiltered;
        if (p.cursor === "cursor-page-2") return page2;
        return page1;
      });

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Clue bank" }));

    expect(await screen.findByText("ALPS")).toBeInTheDocument();
    expect(screen.getByTestId("clue-bank-count")).toHaveTextContent("Showing 2 of 3");

    // Load more button fallback loads page 2
    const loadMoreBtn = screen.getByRole("button", { name: "Load more" });
    fireEvent.click(loadMoreBtn);

    expect(await screen.findByText("CAVE")).toBeInTheDocument();
    expect(screen.getByTestId("clue-bank-count")).toHaveTextContent("Showing 3 of 3");
    expect(screen.getByText("End of clue bank")).toBeInTheDocument();

    // Changing length filter resets pages and shows empty state with Clear filter button
    fireEvent.change(screen.getByLabelText("Filter by answer length"), {
      target: { value: "3" },
    });

    expect(await screen.findByText("No clues match your filter")).toBeInTheDocument();
    expect(screen.getByTestId("clue-bank-count")).toHaveTextContent("Showing 0 of 0");
    expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ length: 3, cursor: null }));

    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(await screen.findByText("ALPS")).toBeInTheDocument();
  });

  it("keeps loaded rows and shows inline Retry when next page fails", async () => {
    let failOnce = true;
    vi.spyOn(miniApi, "adminClueBankList").mockImplementation(async (params) => {
      const p = typeof params === "string" ? { q: params } : (params ?? {});
      if (p.cursor === "cursor-2") {
        if (failOnce) {
          failOnce = false;
          throw new Error("Network failure");
        }
        return { results: [makeItem(2, "STAR")], next_cursor: null, total: 2 };
      }
      return { results: [makeItem(1, "MOON")], next_cursor: "cursor-2", total: 2 };
    });

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Clue bank" }));
    expect(await screen.findByText("MOON")).toBeInTheDocument();

    // Trigger next page via active IntersectionObserver
    await act(async () => {
      const latestObserver =
        MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];
      latestObserver?.trigger(true);
    });

    // Error row appears while MOON remains visible
    expect(await screen.findByText("Failed to load more clues.")).toBeInTheDocument();
    expect(screen.getByText("MOON")).toBeInTheDocument();

    // Click Retry -> loads STAR
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("STAR")).toBeInTheDocument();
    expect(screen.getByText("MOON")).toBeInTheDocument();
  });

  it("optimistically removes a deleted row and rolls back on error", async () => {
    vi.spyOn(miniApi, "adminClueBankList").mockResolvedValue({
      results: [makeItem(10, "RAVEN"), makeItem(11, "TALES")],
      next_cursor: null,
      total: 2,
    });

    let rejectDelete!: (err: Error) => void;
    vi.spyOn(miniApi, "adminClueBankDelete").mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectDelete = reject;
        })
    );

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: "Clue bank" }));
    expect(await screen.findByText("RAVEN")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete clue for RAVEN" }));

    // Optimistically removed immediately
    await waitFor(() => {
      expect(screen.queryByText("RAVEN")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("clue-bank-count")).toHaveTextContent("Showing 1 of 1");

    // Reject delete -> rolls back so RAVEN reappears
    await act(async () => {
      rejectDelete(new Error("Delete failed"));
    });

    expect(await screen.findByText("RAVEN")).toBeInTheDocument();
    expect(screen.getByTestId("clue-bank-count")).toHaveTextContent("Showing 2 of 2");
  });

  it("renders inline bank_too_small report on auto-generate and Bank health summary with details", async () => {
    vi.spyOn(miniApi, "adminClueBankList").mockResolvedValue({
      results: [makeItem(1, "RAVEN")],
      next_cursor: null,
      total: 1,
    });
    vi.spyOn(miniApi, "adminAutogenerate").mockResolvedValue({
      created: 0,
      created_count: 0,
      created_dates: [],
      requested: 14,
      skipped: ["2026-11-26"],
      skipped_count: 14,
      reason: "bank_too_small",
      bank: {
        total_answers: 3,
        by_length: { "3": 1, "4": 1, "5": 1 },
        scarce_letters: [{ letter: "Q", count: 0, percent: 0 }],
      },
      suggestion: "Add more clues, especially 5-letter answers (scarce letters: Q).",
    });

    renderAdmin();
    expect(
      screen.getByText("Generated grids use only words from the clue bank.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Auto-generate next 14 days" }));
    const alert = await screen.findByTestId("autogenerate-report");
    expect(alert).toHaveTextContent("0 of 14 requested");
    expect(alert).toHaveTextContent("Add more clues, especially 5-letter answers");

    // Switch to Clue bank tab and expand Bank health details
    fireEvent.click(screen.getByRole("button", { name: "Clue bank" }));
    const health = await screen.findByTestId("clue-bank-health");
    expect(health).toHaveTextContent("Bank health:");
    expect(health).toHaveTextContent("3 distinct answers");

    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(health).toHaveTextContent("Answers with multiple clues: 1");
    expect(health).toHaveTextContent("Q (0, 0%)");
  });
});
