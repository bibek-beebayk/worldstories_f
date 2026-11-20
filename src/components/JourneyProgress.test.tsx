// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import JourneyProgress from "@/components/JourneyProgress";

afterEach(cleanup);

describe("JourneyProgress", () => {
  it("renders segments for twelve stories", () => {
    render(<JourneyProgress completed={3} total={12} label="Journey progress" />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("data-journey-progress", "segments");
    expect(progress.children).toHaveLength(12);
  });

  it("renders a continuous bar for thirteen stories", () => {
    render(<JourneyProgress completed={3} total={13} label="Journey progress" />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("data-journey-progress", "bar");
    expect(progress.children).toHaveLength(1);
  });
});
