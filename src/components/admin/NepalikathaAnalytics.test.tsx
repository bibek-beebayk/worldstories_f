// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NepalikathaAnalytics from "./NepalikathaAnalytics";
import { storyApi } from "@/api/story";

vi.mock("@/api/story", () => ({ storyApi: { getAdminNepalikathaAnalytics: vi.fn() } }));
vi.mock("./charts/TrendLineChart", () => ({ TrendLineChart: () => null }));
afterEach(cleanup);

it("fetches the selected range from the isolated report and displays its metrics", async () => {
  vi.mocked(storyApi.getAdminNepalikathaAnalytics).mockResolvedValue({
    range_days: 7, time_interval: "day", visitors: 27, page_views: 33, readers: 2,
    stories_read: 1, reading_sessions: 3, reading_seconds: 45, average_reading_seconds: 15,
    over_time: [], top_stories: [{ slug: "test", title: "कथा", readers: 2, reads: 3, reading_seconds: 45 }],
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><NepalikathaAnalytics days={7} /></QueryClientProvider>);
  expect(await screen.findByText("27")).toBeInTheDocument();
  expect(screen.getByText("कथा")).toBeInTheDocument();
  expect(storyApi.getAdminNepalikathaAnalytics).toHaveBeenCalledWith(7);
  expect(screen.getByText("Time per reading session")).toBeInTheDocument();
  client.clear();
});
