import { describe, expect, it } from "vitest";
import { mapPlayerShortcutKey } from "./usePlayerShortcuts";

describe("mapPlayerShortcutKey", () => {
  it("maps player shortcut keys to actions", () => {
    expect(mapPlayerShortcutKey({ key: " " })).toBe("togglePlay");
    expect(mapPlayerShortcutKey({ key: "ArrowLeft" })).toBe("seekBack");
    expect(mapPlayerShortcutKey({ key: "ArrowRight" })).toBe("seekForward");
    expect(mapPlayerShortcutKey({ key: "[" })).toBe("prev");
    expect(mapPlayerShortcutKey({ key: "]" })).toBe("next");
    expect(mapPlayerShortcutKey({ key: "ArrowUp" })).toBe("speedUp");
    expect(mapPlayerShortcutKey({ key: "ArrowDown" })).toBe("speedDown");
    expect(mapPlayerShortcutKey({ key: "m" })).toBe("toggleMute");
    expect(mapPlayerShortcutKey({ key: "M" })).toBe("toggleMute");
    expect(mapPlayerShortcutKey({ key: "f" })).toBe("toggleFullscreen");
    expect(mapPlayerShortcutKey({ key: "F" })).toBe("toggleFullscreen");
    expect(mapPlayerShortcutKey({ key: "x" })).toBeNull();
  });

  it("ignores modifier keys, inputs, interactive Space targets, and open overlays", () => {
    expect(mapPlayerShortcutKey({ key: " ", ctrlKey: true })).toBeNull();
    expect(mapPlayerShortcutKey({ key: "f", metaKey: true })).toBeNull();
    expect(mapPlayerShortcutKey({ key: "m", altKey: true })).toBeNull();
    expect(mapPlayerShortcutKey({ key: " ", target: { tagName: "INPUT" } })).toBeNull();
    expect(mapPlayerShortcutKey({ key: "m", target: { tagName: "TEXTAREA" } })).toBeNull();
    expect(mapPlayerShortcutKey({ key: "f", target: { tagName: "DIV", isContentEditable: true } })).toBeNull();
    expect(mapPlayerShortcutKey({ key: " ", target: { tagName: "BUTTON" } })).toBeNull();
    expect(mapPlayerShortcutKey({ key: " ", target: { tagName: "DIV", getAttribute: () => "switch" } })).toBeNull();
    expect(mapPlayerShortcutKey({ key: " " }, true)).toBeNull();
  });
});
