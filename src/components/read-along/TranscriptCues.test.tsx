// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeCues } from "@/lib/readAlongCues";
import { TranscriptCues } from "./TranscriptCues";

afterEach(cleanup);

const cues = normalizeCues([
  { id: 1, start_seconds: 0, end_seconds: 2, text: "The first spoken line." },
  { id: 2, start_seconds: 2, end_seconds: 4, text: "The second spoken line." },
]);

describe("TranscriptCues", () => {
  it("marks only the active cue and never creates a noisy live region", () => {
    render(
      <TranscriptCues
        cues={cues}
        activeIndex={1}
        proseClassName="prose"
        typographyStyle={{}}
        activeCueClassName="active"
        onSeekToCue={vi.fn()}
        registerCueRef={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "The first spoken line." })).not.toHaveAttribute(
      "aria-current"
    );
    expect(screen.getByRole("button", { name: "The second spoken line." })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(document.querySelector("[aria-live]")).toBeNull();
  });

  it("seeks with pointer, Enter, and Space interaction", () => {
    const onSeek = vi.fn();
    const onTranscriptSurfaceClick = vi.fn();
    render(
      <div onClick={onTranscriptSurfaceClick}>
        <TranscriptCues
          cues={cues}
          activeIndex={0}
          proseClassName="prose"
          typographyStyle={{}}
          activeCueClassName="active"
          onSeekToCue={onSeek}
          registerCueRef={vi.fn()}
        />
      </div>
    );

    const secondCue = screen.getByRole("button", { name: "The second spoken line." });
    fireEvent.click(secondCue);
    fireEvent.keyDown(secondCue, { key: "Enter" });
    fireEvent.keyDown(secondCue, { key: " " });
    expect(onSeek.mock.calls).toEqual([
      [2, 1],
      [2, 1],
      [2, 1],
    ]);
    expect(onTranscriptSurfaceClick).not.toHaveBeenCalled();
  });
});
