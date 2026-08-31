import { describe, expect, it } from "vitest";
import { resolveReadAlongShortcut } from "./readAlongKeyboard";

describe("resolveReadAlongShortcut", () => {
  it.each([
    [" ", "toggle-playback"],
    ["Spacebar", "toggle-playback"],
    ["ArrowLeft", "seek-backward"],
    ["ArrowRight", "seek-forward"],
    ["Escape", "dismiss"],
  ] as const)("maps %s to %s", (key, expected) => {
    expect(resolveReadAlongShortcut({ key })).toBe(expected);
  });

  it("does not capture playback keys from an interactive target", () => {
    expect(resolveReadAlongShortcut({ key: " ", targetIsInteractive: true })).toBeNull();
    expect(resolveReadAlongShortcut({ key: "ArrowLeft", targetIsInteractive: true })).toBeNull();
  });

  it("still lets Escape dismiss a panel from an interactive target", () => {
    expect(resolveReadAlongShortcut({ key: "Escape", targetIsInteractive: true })).toBe("dismiss");
  });

  it("does not capture modified playback keys", () => {
    expect(resolveReadAlongShortcut({ key: " ", ctrlKey: true })).toBeNull();
    expect(resolveReadAlongShortcut({ key: "ArrowRight", metaKey: true })).toBeNull();
    expect(resolveReadAlongShortcut({ key: "ArrowLeft", altKey: true })).toBeNull();
  });

  it("ignores unrelated keys", () => {
    expect(resolveReadAlongShortcut({ key: "Enter" })).toBeNull();
  });
});
