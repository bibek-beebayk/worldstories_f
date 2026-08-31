// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioTimeline } from "./AudioTimeline";
import { AudioTransportControls } from "./AudioTransportControls";
import { AutoplayToggle } from "./AutoplayToggle";
import { PlaybackSpeedControl } from "./PlaybackSpeedControl";

afterEach(cleanup);

describe("shared audio controls", () => {
  it("exposes the timeline value and seeks from the slider", () => {
    const onSeek = vi.fn();
    render(<AudioTimeline currentTime={30} duration={120} onSeek={onSeek} />);

    const timeline = screen.getByRole("slider", { name: "Playback position" });
    expect(timeline).toHaveAttribute("aria-valuetext", "0:30 of 2:00");
    fireEvent.change(timeline, { target: { value: "45" } });
    expect(onSeek).toHaveBeenCalledWith(45);
  });

  it("labels and dispatches every transport action", () => {
    const onTogglePlay = vi.fn();
    const onSkip = vi.fn();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <AudioTransportControls
        isPlaying={false}
        isLoading={false}
        onTogglePlay={onTogglePlay}
        onSkip={onSkip}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev
        hasNext
        prevLabel="Previous track"
        nextLabel="Next track"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous track" }));
    fireEvent.click(screen.getByRole("button", { name: "Rewind 15 seconds" }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Forward 15 seconds" }));
    fireEvent.click(screen.getByRole("button", { name: "Next track" }));

    expect(onPrev).toHaveBeenCalledOnce();
    expect(onSkip.mock.calls).toEqual([[-15], [15]]);
    expect(onTogglePlay).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("exposes switch state and playback speed", () => {
    const onToggle = vi.fn();
    const onCycle = vi.fn();
    render(
      <>
        <AutoplayToggle enabled onToggle={onToggle} />
        <PlaybackSpeedControl rate={1.25} onCycle={onCycle} />
      </>
    );

    const autoplay = screen.getByRole("switch", { name: "Autoplay on" });
    expect(autoplay).toHaveAttribute("aria-checked", "true");
    fireEvent.click(autoplay);
    fireEvent.click(
      screen.getByRole("button", { name: "Playback speed 1.25 times. Activate to change speed" })
    );
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onCycle).toHaveBeenCalledOnce();
  });
});
