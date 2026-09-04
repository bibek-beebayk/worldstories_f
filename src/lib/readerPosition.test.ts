import { describe, expect, it } from "vitest";
import {
  blockIndexAtOffset,
  decodeBlockAnchor,
  encodeBlockAnchor,
  offsetForBlockIndex,
} from "./readerPosition";

describe("encodeBlockAnchor / decodeBlockAnchor", () => {
  it("round-trips a block index", () => {
    expect(decodeBlockAnchor(encodeBlockAnchor(0))).toBe(0);
    expect(decodeBlockAnchor(encodeBlockAnchor(17))).toBe(17);
  });

  it("refuses to encode anything that is not a real index", () => {
    expect(encodeBlockAnchor(-1)).toBeNull();
    expect(encodeBlockAnchor(1.5)).toBeNull();
    expect(encodeBlockAnchor(Number.NaN)).toBeNull();
  });

  it("decodes unknown values to null so the percentage fallback takes over", () => {
    // Everything written before anchored resume existed, plus anything a
    // future client might store, has to degrade rather than throw.
    expect(decodeBlockAnchor("")).toBeNull();
    expect(decodeBlockAnchor(null)).toBeNull();
    expect(decodeBlockAnchor(undefined)).toBeNull();
    expect(decodeBlockAnchor("paragraph-4")).toBeNull();
    expect(decodeBlockAnchor("b")).toBeNull();
    expect(decodeBlockAnchor("b-1")).toBeNull();
    expect(decodeBlockAnchor("b1.5")).toBeNull();
    expect(decodeBlockAnchor("xb1")).toBeNull();
  });
});

describe("blockIndexAtOffset", () => {
  const offsets = [0, 100, 250, 400];

  it("returns null when there is no content to anchor to", () => {
    expect(blockIndexAtOffset([], 120)).toBeNull();
  });

  it("anchors to the first block at or before the top of the chapter", () => {
    expect(blockIndexAtOffset(offsets, 0)).toBe(0);
    expect(blockIndexAtOffset(offsets, -40)).toBe(0);
  });

  it("keeps the block that is straddling the top edge", () => {
    // Mid-paragraph: the reader is still inside block 1, not yet in block 2.
    expect(blockIndexAtOffset(offsets, 101)).toBe(1);
    expect(blockIndexAtOffset(offsets, 180)).toBe(1);
    expect(blockIndexAtOffset(offsets, 245)).toBe(1);
  });

  it("advances when the next block reaches the top", () => {
    expect(blockIndexAtOffset(offsets, 250)).toBe(2);
    expect(blockIndexAtOffset(offsets, 400)).toBe(3);
  });

  it("absorbs sub-pixel layout rounding", () => {
    // Scrolling "to" a block can land a fraction short of its measured top;
    // without the tolerance the anchor would snap back a paragraph.
    expect(blockIndexAtOffset(offsets, 249.4)).toBe(2);
  });

  it("clamps past the end of the content", () => {
    expect(blockIndexAtOffset(offsets, 99999)).toBe(3);
  });
});

describe("offsetForBlockIndex", () => {
  const offsets = [0, 100, 250];

  it("resolves an in-range anchor to its offset", () => {
    expect(offsetForBlockIndex(offsets, 0)).toBe(0);
    expect(offsetForBlockIndex(offsets, 2)).toBe(250);
  });

  it("returns null when the anchor no longer fits the content", () => {
    // A chapter edited since the position was saved now has fewer blocks —
    // the caller must fall back to the saved percentage rather than guess.
    expect(offsetForBlockIndex(offsets, 5)).toBeNull();
    expect(offsetForBlockIndex(offsets, -1)).toBeNull();
    expect(offsetForBlockIndex(offsets, null)).toBeNull();
    expect(offsetForBlockIndex([], 0)).toBeNull();
  });
});
