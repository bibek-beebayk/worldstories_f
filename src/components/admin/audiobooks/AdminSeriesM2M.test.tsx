// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAudiobooks from "@/pages/admin/AdminAudiobooks";
import AdminAudiobookEdit from "@/pages/admin/AdminAudiobookEdit";
import AdminAudiobookSeriesDetail from "@/pages/admin/AdminAudiobookSeriesDetail";
import { AddAudiobooksToSeriesDialog } from "@/components/admin/audiobooks/AddAudiobooksToSeriesDialog";
import { storyApi } from "@/api/story";
import type {
  AdminAudiobookDetail,
  AdminAudiobookListItem,
  AdminAudiobookSeries,
  AdminAudiobookSeriesDetail,
} from "@/api/types";

vi.mock("@/api/story", () => ({
  storyApi: {
    listAdminAudiobooks: vi.fn(),
    getAdminAudiobook: vi.fn(),
    createAdminAudiobook: vi.fn(),
    updateAdminAudiobook: vi.fn(),
    deleteAdminAudiobook: vi.fn(),
    getAdminAudiobookStats: vi.fn(),
    searchAdminStoriesForAudiobook: vi.fn(),
    uploadAdminAudiobookTracks: vi.fn(),
    reorderAdminAudiobookTracks: vi.fn(),
    updateAdminAudiobookTrack: vi.fn(),
    deleteAdminAudiobookTrack: vi.fn(),
    rereadAdminAudiobookTrackDuration: vi.fn(),
    moveAdminAudiobookTrack: vi.fn(),
    listAdminAudiobookSeries: vi.fn(),
    getAdminAudiobookSeries: vi.fn(),
    createAdminAudiobookSeries: vi.fn(),
    updateAdminAudiobookSeries: vi.fn(),
    deleteAdminAudiobookSeries: vi.fn(),
    addAudiobooksToAdminSeries: vi.fn(),
    removeAudiobooksFromAdminSeries: vi.fn(),
    reorderAdminSeries: vi.fn(),
    bulkAdminAudiobookSeries: vi.fn(),
    getAdminAuthors: vi.fn(),
    getAdminGenres: vi.fn(),
  },
}));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const sampleSeries: AdminAudiobookSeries[] = [
  { id: 1, title: "Classics", slug: "classics", description: "", audiobook_count: 2 },
  { id: 2, title: "Bedtime", slug: "bedtime", description: "", audiobook_count: 1 },
];

const sampleListItems: AdminAudiobookListItem[] = [
  {
    id: 10,
    title: "Alpha Book",
    display_title: "",
    effective_title: "Alpha Book",
    slug: "alpha-book",
    cover: null,
    author_name: "Author A",
    narrator: "Narrator A",
    story: null,
    is_standalone: true,
    series: [{ id: 1, title: "Classics", slug: "classics", order: 1 }],
    series_count: 1,
    track_count: 1,
    total_duration_seconds: 300,
    missing_duration_count: 0,
    is_published: true,
    publish_at: null,
    status: "published",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 11,
    title: "Beta Book",
    display_title: "",
    effective_title: "Beta Book",
    slug: "beta-book",
    cover: null,
    author_name: "Author B",
    narrator: "",
    story: null,
    is_standalone: true,
    series: [],
    series_count: 0,
    track_count: 2,
    total_duration_seconds: 600,
    missing_duration_count: 0,
    is_published: true,
    publish_at: null,
    status: "published",
    updated_at: "2026-01-02T00:00:00Z",
  },
];

const sampleDetail: AdminAudiobookDetail = {
  id: 10,
  title: "Alpha Book",
  display_title: "",
  effective_title: "Alpha Book",
  slug: "alpha-book",
  story: null,
  story_detail: null,
  is_standalone: true,
  author: 1,
  author_name: "Author A",
  narrator: "Narrator A",
  language: "en",
  about: "About alpha book",
  genres: [],
  series: [{ id: 1, title: "Classics", slug: "classics", order: 1 }],
  series_count: 1,
  cover_image_file: null,
  own_cover: null,
  cover: null,
  is_published: true,
  publish_at: null,
  status: "published",
  track_count: 1,
  total_duration_seconds: 300,
  missing_duration_count: 0,
  effective: {
    title: "Alpha Book",
    author: { id: 1, name: "Author A" },
    author_name: "Author A",
    language: "en",
    about: "About alpha book",
    genres: [],
    cover: null,
  },
  tracks: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const sampleSeriesDetail: AdminAudiobookSeriesDetail = {
  id: 1,
  title: "Classics",
  slug: "classics",
  description: "Timeless listens",
  audiobook_count: 2,
  audiobooks: [
    {
      id: 10,
      title: "Alpha Book",
      slug: "alpha-book",
      cover: null,
      author_name: "Author A",
      narrator: "Narrator A",
      order: 1,
      track_count: 1,
      total_duration_seconds: 300,
      status: "published",
    },
    {
      id: 11,
      title: "Beta Book",
      slug: "beta-book",
      cover: null,
      author_name: "Author B",
      narrator: "",
      order: 2,
      track_count: 2,
      total_duration_seconds: 600,
      status: "published",
    },
  ],
};

describe("Admin Audiobooks M2M Series UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storyApi.getAdminAudiobookStats).mockResolvedValue({
      total: 2,
      standalone: 2,
      series_count: 2,
      missing_duration: 0,
    });
    vi.mocked(storyApi.listAdminAudiobookSeries).mockResolvedValue(sampleSeries);
    vi.mocked(storyApi.getAdminAuthors).mockResolvedValue([{ id: 1, name: "Author A" } as never]);
    vi.mocked(storyApi.getAdminGenres).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("submits series_items when adding a second series on AdminAudiobookEdit", async () => {
    vi.mocked(storyApi.getAdminAudiobook).mockResolvedValue(sampleDetail);
    vi.mocked(storyApi.updateAdminAudiobook).mockResolvedValue({
      ...sampleDetail,
      series: [
        { id: 1, title: "Classics", slug: "classics", order: 1 },
        { id: 2, title: "Bedtime", slug: "bedtime", order: 1 },
      ],
      series_count: 2,
    });

    const qc = makeQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/audiobooks/10"]}>
          <Routes>
            <Route path="/admin/audiobooks/:id" element={<AdminAudiobookEdit />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const combobox = await screen.findByRole("combobox", { name: "Select series" });
    fireEvent.click(combobox);

    const bedtimeOption = await screen.findByRole("button", { name: "Bedtime" });
    fireEvent.click(bedtimeOption);

    const saveBtn = screen.getByRole("button", { name: /Save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(storyApi.updateAdminAudiobook).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          series_items: [
            { series_id: 1, order: 1 },
            { series_id: 2, order: null },
          ],
        }),
      );
    });
  });

  it("keeps selected audiobooks across search changes in AddAudiobooksToSeriesDialog", async () => {
    vi.mocked(storyApi.listAdminAudiobooks).mockImplementation(async (params) => {
      const q = (params?.q ?? "").toLowerCase();
      const filtered = q ? sampleListItems.filter((ab) => ab.title.toLowerCase().includes(q)) : sampleListItems;
      return {
        results: filtered,
        pagination: { page: 1, pages: 1, count: filtered.length, size: 20, next: null, previous: null },
      };
    });

    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const qc = makeQueryClient();

    render(
      <QueryClientProvider client={qc}>
        <AddAudiobooksToSeriesDialog
          open={true}
          onOpenChange={() => {}}
          seriesId={1}
          seriesTitle="Classics"
          onSubmit={onSubmit}
        />
      </QueryClientProvider>,
    );

    // Select Alpha Book
    const alphaCheckbox = await screen.findByLabelText("Select Alpha Book");
    fireEvent.click(alphaCheckbox);
    expect(screen.getByText("1 selected")).toBeTruthy();

    // Change search to Beta
    const searchInput = screen.getByLabelText("Search audiobooks to add");
    fireEvent.change(searchInput, { target: { value: "Beta" } });

    await waitFor(
      () => {
        expect(screen.queryByLabelText("Select Alpha Book")).toBeNull();
        expect(screen.getByLabelText("Select Beta Book")).toBeTruthy();
      },
      { timeout: 1500 },
    );

    // Select Beta Book too
    fireEvent.click(screen.getByLabelText("Select Beta Book"));
    expect(screen.getByText("2 selected")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add 2 audiobooks" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.arrayContaining([10, 11]));
    });
  });

  it("rolls back optimistic reorder on AdminAudiobookSeriesDetail when server rejects", async () => {
    vi.mocked(storyApi.getAdminAudiobookSeries).mockResolvedValue(sampleSeriesDetail);
    vi.mocked(storyApi.reorderAdminSeries).mockRejectedValue(new Error("Reorder failed"));

    const qc = makeQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/audiobook-series/1"]}>
          <Routes>
            <Route path="/admin/audiobook-series/:id" element={<AdminAudiobookSeriesDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const moveDownBtn = await screen.findByRole("button", { name: "Move Alpha Book down" });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(storyApi.reorderAdminSeries).toHaveBeenCalledWith(1, [11, 10]);
    });

    // After rollback, Alpha Book is still first (order 1) and Beta Book second (order 2)
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      // rows[0] is thead, rows[1] is Alpha Book, rows[2] is Beta Book
      expect(rows[1].textContent).toContain("Alpha Book");
      expect(rows[2].textContent).toContain("Beta Book");
    });
  });

  it("shows bulk selection bar on AdminAudiobooks when rows are checked", async () => {
    vi.mocked(storyApi.listAdminAudiobooks).mockResolvedValue({
      results: sampleListItems,
      pagination: { page: 1, pages: 1, count: 2, size: 20, next: null, previous: null },
    });

    const qc = makeQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/audiobooks"]}>
          <AdminAudiobooks />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const alphaCheckbox = await screen.findByLabelText("Select Alpha Book");
    fireEvent.click(alphaCheckbox);

    const bar = await screen.findByRole("region", { name: "Bulk selection actions" });
    expect(bar.textContent).toContain("1 selected");
    expect(screen.getByRole("button", { name: "Add to series" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove from series" })).toBeTruthy();
  });
});
