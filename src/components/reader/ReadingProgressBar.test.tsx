// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadingProgressBar } from "./ReadingProgressBar";

vi.mock("@/hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => false,
}));

afterEach(cleanup);

describe("ReadingProgressBar", () => {
  it("exposes the position to assistive technology", () => {
    // A purely visual bar tells a screen-reader user nothing about where they
    // are in what they are reading.
    render(<ReadingProgressBar fraction={0.68} label="Story" />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "68");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAccessibleName("Story reading progress");
    expect(bar).toHaveAttribute("aria-valuetext", "68% of this story read");
  });

  it("names what is being measured", () => {
    render(<ReadingProgressBar fraction={0.25} label="Summary" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      "25% of this summary read"
    );
  });

  it("renders the fill at the reported width", () => {
    const { container } = render(<ReadingProgressBar fraction={0.42} label="Story" />);

    const fill = container.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(fill).toHaveStyle({ width: "42%" });
  });

  it("clamps a fraction outside 0–1", () => {
    render(<ReadingProgressBar fraction={1.8} label="Story" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("never lets the bar intercept a tap meant for the text", () => {
    render(<ReadingProgressBar fraction={0.5} label="Story" />);

    // The chapter reader toggles its chrome on tap; a fixed overlay that
    // swallowed those taps would break it.
    expect(screen.getByRole("progressbar")).toHaveClass("pointer-events-none");
  });
});
