// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import type { ComponentType } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadAlongResponse, StoryDetail } from "@/api/types";
import { ImmersiveReaderProvider } from "@/context/ImmersiveReaderContext";

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  readAlongResult: {} as Record<string, unknown>,
  story: null as StoryDetail | null,
  playbackOptions: null as null | {
    onEnded?: (element: HTMLAudioElement) => void;
  },
  player: {
    audioRef: { current: null as HTMLAudioElement | null },
    audioElementProps: {},
    isPlaying: false,
    isLoading: false,
    currentTime: 12,
    duration: 120,
    error: null as string | null,
    playbackRate: 1,
    togglePlay: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    skip: vi.fn(),
    cyclePlaybackRate: vi.fn(),
  },
  progress: {
    liveProgressMap: {},
    handleLoadedMetadata: vi.fn(),
    handleTimeUpdate: vi.fn(),
    handleEnded: vi.fn(),
    flushPendingSaves: vi.fn(),
  },
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => state.navigate };
});
vi.mock("@/hooks/useReadAlong", () => ({ useReadAlong: () => state.readAlongResult }));
vi.mock("@/hooks/useStory", () => ({ useStory: () => ({ data: state.story }) }));
vi.mock("@/hooks/useIsLoggedIn", () => ({ useIsLoggedIn: () => false }));
vi.mock("@/hooks/useOnlineStatus", () => ({ useOnlineStatus: () => true }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => false }));
vi.mock("@/hooks/useContentSessionAnalytics", () => ({ useContentSessionAnalytics: vi.fn() }));
vi.mock("@/hooks/audio/useAudioSource", () => ({
  useAudioSource: () => ({
    audioSrc: "https://media.example.test/track.mp3",
    sourceKey: "track:direct",
    handleMediaError: vi.fn(),
  }),
}));
vi.mock("@/hooks/audio/useAudioProgress", () => ({ useAudioProgress: () => state.progress }));
vi.mock("@/hooks/audio/useAudioPlayback", () => ({
  useAudioPlayback: (options: typeof state.playbackOptions) => {
    state.playbackOptions = options;
    return state.player;
  },
}));
vi.mock("@/hooks/read-along/useReadAlongAutoScroll", () => ({
  useReadAlongAutoScroll: () => [true, vi.fn()],
}));
vi.mock("@/hooks/read-along/useActiveCue", () => ({ useActiveCue: () => 0 }));
vi.mock("@/hooks/read-along/useCueAutoScroll", () => ({
  useCueAutoScroll: () => ({ isSuspended: false, resume: vi.fn() }),
}));
vi.mock("@/hooks/useReaderAppearance", () => ({
  useReaderAppearance: () => ({
    fontSize: 18,
    setFontSize: vi.fn(),
    lineHeight: 1.8,
    setLineHeight: vi.fn(),
    fontFamily: "literata",
    setFontFamily: vi.fn(),
    theme: "parchment",
    setTheme: vi.fn(),
    customThemes: [],
    createCustomTheme: vi.fn(),
    themeOptions: {
      parchment: {
        label: "Parchment",
        cardClass: "bg-white",
        proseClass: "prose-neutral",
      },
    },
    activeTheme: { label: "Parchment", cardClass: "bg-white", proseClass: "prose-neutral" },
    isDarkReaderTheme: false,
    typographyStyle: {},
    proseClassName: "prose",
  }),
}));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: vi.fn() }));

import ReadAlongReader from "./ReadAlongReader";

const readAlong: ReadAlongResponse = {
  story: {
    id: 1,
    title: "Test Story",
    slug: "test-story",
    language: "English",
    story_type: "Novel",
    cover_image: null,
    author: { id: 1, name: "Test Author" },
  },
  audio: {
    id: 11,
    title: "Track One",
    slug: "track-1",
    order: 1,
    audio_file: "https://media.example.test/track-1.mp3",
    stream_url: "http://127.0.0.1:8000/api/stories/test-story/audios/track-1/stream/",
    duration_seconds: 120,
    download_size_bytes: 1024,
    has_transcript: true,
    read_along_available: true,
    transcript_synchronized: true,
  },
  transcript: {
    html: "<p>The first spoken line.</p><p>The second spoken line.</p>",
    state: "synchronized",
    synchronized: true,
    cues: [
      { id: 1, start_seconds: 0, end_seconds: 2, text: "The first spoken line." },
      { id: 2, start_seconds: 2, end_seconds: 4, text: "The second spoken line." },
    ],
  },
  navigation: { previous_audio_slug: null, next_audio_slug: "track-2" },
};

const story = {
  ...readAlong.story,
  audios: [
    {
      id: "11",
      title: "Track One",
      slug: "track-1",
      order: 1,
      audio_file: "https://media.example.test/track-1.mp3",
      has_transcript: true,
      read_along_available: true,
      transcript_synchronized: true,
    },
    {
      id: "12",
      title: "Track Two",
      slug: "track-2",
      order: 2,
      audio_file: "https://media.example.test/track-2.mp3",
      has_transcript: true,
      read_along_available: true,
      transcript_synchronized: false,
    },
  ],
} as unknown as StoryDetail;

const Reader = ReadAlongReader as unknown as ComponentType<{ loaderData: ReadAlongResponse | null }>;

function renderReader(loaderData: ReadAlongResponse | null = readAlong) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ImmersiveReaderProvider>
        <MemoryRouter initialEntries={["/read-along/test-story/track-1"]}>
          <Routes>
            <Route
              path="/read-along/:story_slug/:audio_slug"
              element={<Reader loaderData={loaderData} />}
            />
          </Routes>
        </MemoryRouter>
      </ImmersiveReaderProvider>
    </QueryClientProvider>
  );
}

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  localStorage.clear();
  state.readAlongResult = { data: readAlong, isLoading: false, isError: false, refetch: vi.fn() };
  state.story = story;
  state.playbackOptions = null;
  state.navigate.mockReset();
  Object.values(state.player).forEach((value) => {
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  });
  Object.values(state.progress).forEach((value) => {
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  });
});

afterEach(cleanup);

describe("ReadAlongReader integration", () => {
  it("renders synchronized cues with named playback and transcript controls", () => {
    renderReader();
    expect(screen.getByRole("heading", { name: "Test Story" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Transcript" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "The first spoken line." })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(screen.getByRole("slider", { name: "Playback position" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument(); // 12s / 120s

    // The stripped-down bar drops track transport and autoplay.
    expect(screen.queryByRole("button", { name: /Previous track|Next track/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rewind|Forward/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /Autoplay/ })).not.toBeInTheDocument();
  });

  it("hides and restores the reader chrome from explicit controls", () => {
    renderReader();
    expect(screen.queryByRole("button", { name: "Show controls" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide controls" }));
    const show = screen.getByRole("button", { name: "Show controls" });
    fireEvent.click(show);
    expect(screen.getByRole("button", { name: "Hide controls" })).toBeInTheDocument();
  });

  it("nudges the highlight-sync offset and compensates cue seeks", () => {
    renderReader();
    const control = screen.getByRole("group", { name: "Highlight sync" });
    expect(control).toHaveTextContent("Sync 0s");

    fireEvent.click(screen.getByRole("button", { name: "The first spoken line." }));
    expect(state.player.seek).toHaveBeenLastCalledWith(0);

    fireEvent.click(screen.getByRole("button", { name: "Highlight later" }));
    fireEvent.click(screen.getByRole("button", { name: "Highlight later" }));
    expect(control).toHaveTextContent("Sync +0.2s");
    expect(localStorage.getItem("read_along_sync_offset")).toBe("0.2");

    fireEvent.click(screen.getByRole("button", { name: "The first spoken line." }));
    expect(state.player.seek).toHaveBeenLastCalledWith(0.2);
  });

  it("hides the highlight-sync control when the track has no cues", () => {
    const unsynced = {
      ...readAlong,
      transcript: {
        html: "<p>Plain text.</p>",
        state: "unsynchronized" as const,
        synchronized: false,
        cues: [],
      },
    };
    state.readAlongResult = { data: unsynced, isLoading: false, isError: false, refetch: vi.fn() };
    renderReader(unsynced);
    expect(screen.queryByRole("group", { name: "Highlight sync" })).not.toBeInTheDocument();
  });

  it("keeps global playback shortcuts away from focused controls", () => {
    renderReader();
    const play = screen.getByRole("button", { name: "Play" });
    fireEvent.keyDown(play, { key: " " });
    expect(state.player.togglePlay).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(state.player.togglePlay).toHaveBeenCalledOnce();
    expect(state.player.skip.mock.calls).toEqual([[-15], [15]]);
  });

  it("navigates through Contents and flushes pending progress", async () => {
    renderReader();
    fireEvent.click(screen.getByRole("button", { name: "Contents" }));
    const trackTwo = await screen.findByText("Track Two");
    fireEvent.click(trackTwo.closest("button")!);

    expect(state.progress.flushPendingSaves).toHaveBeenCalledOnce();
    expect(state.navigate).toHaveBeenCalledWith("/read-along/test-story/track-2", {
      state: null,
    });
  });

  it("autoplay advances only after persisting completion", () => {
    renderReader();
    const endedElement = { duration: 120 } as HTMLAudioElement;
    state.playbackOptions?.onEnded?.(endedElement);

    expect(state.progress.handleEnded).toHaveBeenCalledWith(endedElement);
    expect(state.progress.flushPendingSaves).toHaveBeenCalledOnce();
    expect(state.navigate).toHaveBeenCalledWith("/read-along/test-story/track-2", {
      state: null,
    });
  });

  it("shows the empty-transcript fallback without hiding playback", () => {
    const empty = {
      ...readAlong,
      transcript: { html: "", state: "empty" as const, synchronized: false, cues: [] },
    };
    state.readAlongResult = { data: empty, isLoading: false, isError: false, refetch: vi.fn() };
    renderReader(empty);

    expect(screen.getByText(/doesn't have a transcript yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("keeps the transcript readable when audio is unavailable", () => {
    const textOnly = {
      ...readAlong,
      audio: { ...readAlong.audio, audio_file: null, stream_url: null },
    };
    state.readAlongResult = { data: textOnly, isLoading: false, isError: false, refetch: vi.fn() };
    renderReader(textOnly);

    expect(screen.getByText(/audio for this track isn't available/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "The first spoken line." })).toBeInTheDocument();
  });

  it("shows a retryable route fallback on request failure", async () => {
    const refetch = vi.fn();
    state.readAlongResult = { data: undefined, isLoading: false, isError: true, refetch };
    renderReader(null);

    expect(screen.getByRole("heading", { name: "Read Along unavailable" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });
});
