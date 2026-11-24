// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAudiobooks from "@/pages/admin/AdminAudiobooks";
import AdminAudiobookCreate from "@/pages/admin/AdminAudiobookCreate";
import AdminAudiobookEdit from "@/pages/admin/AdminAudiobookEdit";
import { DeleteAudiobookDialog } from "@/components/admin/audiobooks/DeleteAudiobookDialog";
import { AudiobookTracksCard } from "@/components/admin/audiobooks/AudiobookTracksCard";
import { storyApi } from "@/api/story";
import type { AdminAudiobookDetail } from "@/api/types";

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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

const sampleDetail: AdminAudiobookDetail = {
  id: 42,
  title: "Pride Audio",
  display_title: "",
  effective_title: "Pride Audio",
  slug: "pride-audio",
  story: 7,
  story_detail: { id: 7, title: "Pride and Prejudice", slug: "pride-and-prejudice" },
  is_standalone: false,
  author: null,
  author_name: "Jane Austen",
  narrator: "Reader One",
  language: "",
  about: "",
  genres: [],
  series: [],
  series_count: 0,
  cover_image_file: null,
  own_cover: null,
  cover: null,
  is_published: true,
  publish_at: null,
  status: "published",
  track_count: 2,
  total_duration_seconds: 240,
  missing_duration_count: 0,
  effective: {
    title: "Pride Audio",
    author: { id: 1, name: "Jane Austen" },
    author_name: "Jane Austen",
    language: "en",
    about: "Story about text",
    genres: [],
    cover: null,
  },
  tracks: [
    {
      id: 101,
      title: "Chapter 1",
      slug: "chapter-1",
      order: 1,
      audio_file: "story_audios/1.mp3",
      audio_file_name: "1.mp3",
      duration_seconds: 120,
      file_size_bytes: 1024000,
      has_transcript: false,
      has_cues: false,
      cue_count: 0,
      transcript_state: "empty",
      read_along_offset_ms: 0,
    },
    {
      id: 102,
      title: "Chapter 2",
      slug: "chapter-2",
      order: 2,
      audio_file: "story_audios/2.mp3",
      audio_file_name: "2.mp3",
      duration_seconds: 120,
      file_size_bytes: 1024000,
      has_transcript: false,
      has_cues: false,
      cue_count: 0,
      transcript_state: "empty",
      read_along_offset_ms: 0,
    },
  ],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

describe("Admin Audiobooks UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storyApi.getAdminAudiobookStats).mockResolvedValue({
      total: 1,
      standalone: 0,
      series_count: 0,
      missing_duration: 0,
    });
    vi.mocked(storyApi.listAdminAudiobookSeries).mockResolvedValue([]);
    vi.mocked(storyApi.listAdminAudiobooks).mockResolvedValue({
      results: [],
      pagination: { page: 1, pages: 1, count: 0, size: 20, next: null, previous: null },
    });
    vi.mocked(storyApi.getAdminAuthors).mockResolvedValue([]);
    vi.mocked(storyApi.getAdminGenres).mockResolvedValue([]);
  });

  it("reflects list search filter in URL query params", async () => {
    const qc = makeQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/audiobooks"]}>
          <AdminAudiobooks />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const searchInput = screen.getByLabelText("Search audiobooks");
    fireEvent.change(searchInput, { target: { value: "Austen" } });

    await waitFor(
      () => {
        expect(screen.getByTestId("location-search").textContent).toContain("q=Austen");
      },
      { timeout: 1500 },
    );
  });

  it("validates required standalone fields on create", async () => {
    const qc = makeQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/audiobooks/new"]}>
          <AdminAudiobookCreate />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create audiobook" }));

    expect(await screen.findByText("Title is required.")).toBeTruthy();
    expect(screen.getByText("Author is required for standalone audiobooks.")).toBeTruthy();
    expect(screen.getByText("About is required for standalone audiobooks.")).toBeTruthy();
    expect(screen.getByText("Add at least one .mp3 track file.")).toBeTruthy();
    expect(storyApi.createAdminAudiobook).not.toHaveBeenCalled();
  });

  it("blocks unlinking a story when author, language, or about are empty", async () => {
    vi.mocked(storyApi.getAdminAudiobook).mockResolvedValue(sampleDetail);
    const qc = makeQueryClient();

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/audiobooks/42"]}>
          <Routes>
            <Route path="/admin/audiobooks/:id" element={<AdminAudiobookEdit />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const unlinkBtn = await screen.findByRole("button", { name: /Unlink from story/i });
    fireEvent.click(unlinkBtn);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/author/i);
    expect(alert.textContent).toMatch(/language/i);
    expect(alert.textContent).toMatch(/about/i);
  });

  it("requires typing the exact title to enable delete in DeleteAudiobookDialog", () => {
    const onConfirm = vi.fn();
    render(
      <DeleteAudiobookDialog
        open={true}
        onOpenChange={() => {}}
        title="Midnight Tales"
        trackCount={3}
        hasLinkedStory={false}
        onConfirm={onConfirm}
      />,
    );

    const deleteBtn = screen.getByRole("button", { name: "Delete audiobook" }) as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(true);

    const input = screen.getByPlaceholderText("Midnight Tales");
    fireEvent.change(input, { target: { value: "Midnight" } });
    expect(deleteBtn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "Midnight Tales" } });
    expect(deleteBtn.disabled).toBe(false);

    fireEvent.click(deleteBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("rolls back optimistic track reorder when the server rejects", async () => {
    vi.mocked(storyApi.reorderAdminAudiobookTracks).mockRejectedValue(new Error("Reorder failed"));
    vi.mocked(storyApi.getAdminAudiobook).mockResolvedValue(sampleDetail);

    const qc = makeQueryClient();
    qc.setQueryData(["admin-audiobook", 42], sampleDetail);

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AudiobookTracksCard audiobook={sampleDetail} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const moveDownBtn = screen.getByRole("button", { name: "Move Chapter 1 down" });
    fireEvent.click(moveDownBtn);

    await waitFor(() => {
      expect(storyApi.reorderAdminAudiobookTracks).toHaveBeenCalledWith(42, [102, 101]);
    });

    await waitFor(() => {
      const cached = qc.getQueryData<AdminAudiobookDetail>(["admin-audiobook", 42]);
      expect(cached?.tracks.map((t) => t.id)).toEqual([101, 102]);
    });
  });
});
