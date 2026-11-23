// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSleepTimer } from "./useSleepTimer";

describe("useSleepTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down minutes, fades volume in final 10s, pauses, and resets volume", () => {
    const onPause = vi.fn();
    const audioEl = { volume: 1 } as HTMLAudioElement;
    const { result } = renderHook(() => useSleepTimer({ onPause, getAudioEl: () => audioEl }));

    act(() => {
      result.current.start(1); // 60 seconds
    });
    expect(result.current.mode).toBe("minutes");
    expect(result.current.remainingSeconds).toBe(60);
    expect(result.current.stopAtChapterEnd).toBe(false);

    act(() => {
      vi.advanceTimersByTime(55_000);
    });
    expect(result.current.remainingSeconds).toBe(5);
    expect(audioEl.volume).toBeCloseTo(0.5, 1);

    act(() => {
      vi.advanceTimersByTime(5_500);
    });
    expect(onPause).toHaveBeenCalledOnce();
    expect(result.current.mode).toBe("off");
    expect(result.current.remainingSeconds).toBeNull();
    expect(audioEl.volume).toBe(1);
  });

  it("cancels cleanly and does not pause after cancel", () => {
    const onPause = vi.fn();
    const audioEl = { volume: 1 } as HTMLAudioElement;
    const { result } = renderHook(() => useSleepTimer({ onPause, getAudioEl: () => audioEl }));

    act(() => {
      result.current.start(1);
    });
    act(() => {
      vi.advanceTimersByTime(55_000);
      result.current.cancel();
    });
    expect(result.current.mode).toBe("off");
    expect(result.current.remainingSeconds).toBeNull();
    expect(audioEl.volume).toBe(1);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onPause).not.toHaveBeenCalled();
  });

  it("sets stopAtChapterEnd flag in end-of-chapter mode", () => {
    const onPause = vi.fn();
    const { result } = renderHook(() => useSleepTimer({ onPause, getAudioEl: () => null }));

    act(() => {
      result.current.startEndOfChapter();
    });
    expect(result.current.mode).toBe("chapter");
    expect(result.current.stopAtChapterEnd).toBe(true);
    expect(result.current.remainingSeconds).toBeNull();

    act(() => {
      result.current.cancel();
    });
    expect(result.current.mode).toBe("off");
    expect(result.current.stopAtChapterEnd).toBe(false);
  });
});
