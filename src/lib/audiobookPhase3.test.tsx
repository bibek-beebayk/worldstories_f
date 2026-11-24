// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { audiobookUrl, readAlongUrl } from "@/lib/urls";
import { isAudiobookNotFoundData, loadAudiobookOrRedirect } from "@/lib/audiobookLoader";
import { StoryListenAction } from "@/components/story/StoryListenAction";
import AudiobookPlayer from "@/pages/AudiobookPlayer";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { storyApi } from "@/api/story";
import { ApiError } from "@/api/client";
import type { PublicAudiobookDetail, StoryDetail } from "@/api/types";

vi.mock("@/api/story", () => ({
  storyApi: {
    getAudiobook: vi.fn(),
    getStory: vi.fn(),
    getAudiobookProgress: vi.fn(),
    saveAudiobookProgress: vi.fn(),
  },
}));

const standaloneAudiobook: PublicAudiobookDetail = {
  id: 99,
  slug: "midnight-solo",
  title: "Midnight Solo",
  author: "Clara Vance",
  narrator: "Morgan Voice",
  language: "en",
  about: "A standalone audio drama recorded exclusively for WorldStories.",
  cover_image: null,
  genres: ["Mystery", "Drama"],
  series: [],
  track_count: 1,
  total_duration_seconds: 600,
  minutes: 10,
  has_read_along: false,
  story: null,
  created_at: "2026-01-01T00:00:00Z",
  tracks: [
    {
      id: 501,
      title: "Episode 1",
      slug: "episode-1",
      audio_file: "https://cdn.example.com/ep1.mp3",
      order: 1,
      duration_seconds: 600,
      read_along_available: false,
      transcript_synchronized: false,
    },
  ],
  other_versions: [],
  suggested: [],
  series_context: [],
};

const linkedAudiobook: PublicAudiobookDetail = {
  ...standaloneAudiobook,
  id: 100,
  slug: "pride-and-prejudice",
  title: "Pride and Prejudice",
  story: { id: 10, slug: "pride-and-prejudice", title: "Pride and Prejudice" },
};

describe("Phase 3: urls helper", () => {
  it("builds canonical /listen/ and /read-along/ URLs", () => {
    expect(audiobookUrl("pride-and-prejudice")).toBe("/listen/pride-and-prejudice");
    expect(audiobookUrl({ slug: "pride-and-prejudice" }, "chapter-1")).toBe("/listen/pride-and-prejudice/chapter-1");
    expect(audiobookUrl("solo", { slug: "part-2" })).toBe("/listen/solo/part-2");
    expect(readAlongUrl("solo", "part-2")).toBe("/read-along/solo/part-2");
    expect(readAlongUrl("solo")).toBe("/read-along/solo");
  });
});

describe("Phase 3: two-step slug resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns audiobook directly when audiobook slug matches", async () => {
    vi.mocked(storyApi.getAudiobook).mockResolvedValue(standaloneAudiobook);
    const result = await loadAudiobookOrRedirect("midnight-solo");
    expect(result).toEqual(standaloneAudiobook);
    expect(storyApi.getStory).not.toHaveBeenCalled();
  });

  it("issues a 301 redirect when slug is a story slug with a differently-slugged audiobook", async () => {
    vi.mocked(storyApi.getAudiobook).mockRejectedValue(new ApiError("Not found", 404));
    vi.mocked(storyApi.getStory).mockResolvedValue({
      slug: "old-story-slug",
      audiobooks: [{ slug: "new-audiobook-slug", title: "Title", narrator: "", total_duration_seconds: 120 }],
    } as StoryDetail);

    let thrown: unknown;
    try {
      await loadAudiobookOrRedirect("old-story-slug", "chapter-1");
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Response);
    const response = thrown as Response;
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("/listen/new-audiobook-slug/chapter-1");
  });

  it("returns 404 data for an unknown slug", async () => {
    vi.mocked(storyApi.getAudiobook).mockRejectedValue(new ApiError("Not found", 404));
    vi.mocked(storyApi.getStory).mockRejectedValue(new ApiError("Not found", 404));

    const result = await loadAudiobookOrRedirect("does-not-exist");
    expect(result).toHaveProperty("init.status", 404);
    const payload = (result as { data: unknown }).data;
    expect(isAudiobookNotFoundData(payload)).toBe(true);
  });
});

describe("Phase 3: StoryListenAction chooser", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a plain link button when there is 1 audiobook", () => {
    render(
      <MemoryRouter>
        <StoryListenAction
          storySlug="pride-and-prejudice"
          audiobooks={[
            { slug: "pride-and-prejudice", title: "Pride", narrator: "Reader A", total_duration_seconds: 3600 },
          ]}
          listenAudioSlug="chapter-1"
          listenLabel="Listen to Audio"
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/listen/pride-and-prejudice/chapter-1");
  });

  it("renders a dropdown trigger button when there are 2+ audiobooks", () => {
    render(
      <MemoryRouter>
        <StoryListenAction
          storySlug="pride-and-prejudice"
          audiobooks={[
            { slug: "pride-a", title: "Pride (A)", narrator: "Reader A", total_duration_seconds: 3600 },
            { slug: "pride-b", title: "Pride (B)", narrator: "Reader B", total_duration_seconds: 4200 },
          ]}
          listenLabel="Listen to Audio"
        />
      </MemoryRouter>,
    );

    // No direct link — instead a dropdown trigger button with aria-haspopup="menu"
    expect(screen.queryByRole("link")).toBeNull();
    const trigger = screen.getByRole("button", { name: /Listen/i });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
  });
});

describe("Phase 3: AudiobookPlayer standalone vs linked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it("hides story links and shows standalone metadata for standalone audiobooks", async () => {
    vi.mocked(storyApi.getAudiobook).mockResolvedValue(standaloneAudiobook);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <AuthModalProvider>
          <MemoryRouter initialEntries={["/listen/midnight-solo/episode-1"]}>
            <Routes>
              <Route
                path="/listen/:story_slug/:chapter_slug"
                element={
                  <AudiobookPlayer
                    loaderData={standaloneAudiobook}
                    params={{ story_slug: "midnight-solo", chapter_slug: "episode-1" }}
                    matches={[] as never}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthModalProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Midnight Solo")).toBeTruthy();
    expect(screen.queryByText("Read the story")).toBeNull();
    expect(screen.queryByText("Back to story")).toBeNull();
    expect(screen.getByText(/Back to audiobook/i)).toBeTruthy();
    expect(screen.getByText(/Morgan Voice/)).toBeTruthy();
    expect(screen.getByText(/standalone audio drama/i)).toBeTruthy();
  });

  it("shows Read the story link for linked audiobooks", async () => {
    vi.mocked(storyApi.getAudiobook).mockResolvedValue(linkedAudiobook);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <AuthModalProvider>
          <MemoryRouter initialEntries={["/listen/pride-and-prejudice/episode-1"]}>
            <Routes>
              <Route
                path="/listen/:story_slug/:chapter_slug"
                element={
                  <AudiobookPlayer
                    loaderData={linkedAudiobook}
                    params={{ story_slug: "pride-and-prejudice", chapter_slug: "episode-1" }}
                    matches={[] as never}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthModalProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Pride and Prejudice")).toBeTruthy();
    expect(screen.getByText("Read the story")).toBeTruthy();
  });
});
