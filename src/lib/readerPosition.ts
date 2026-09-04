// Content-anchored reading position for the chapter reader.
//
// Resume used to be purely a scroll percentage. That is stable only while the
// rendered height of the chapter is stable — and it isn't: font size, line
// height, the reader theme, viewport width and device all change it. A reader
// who stops at 60% on a phone and opens the same chapter on a laptop lands
// several paragraphs away from where they were, and the same happens after
// nudging the font size on the same device.
//
// So alongside the percentage we record *which block* was at the top of the
// viewport — a paragraph index into the chapter's top-level children. That
// survives re-layout, because it is a fact about the content rather than
// about one rendering of it. The percentage stays as the fallback for saved
// positions from before this existed, and for the case where the anchor no
// longer resolves (chapter edited, block count changed).
//
// This is what `ReadingProgress.last_element_id` was always for: the column,
// the serializer field and the offline record all carried it, but nothing ever
// wrote a value into it.

const BLOCK_ANCHOR_PATTERN = /^b(\d+)$/;

/** Serialize a top-level block index for storage in `last_element_id`. */
export function encodeBlockAnchor(index: number): string | null {
  if (!Number.isInteger(index) || index < 0) return null;
  return `b${index}`;
}

/**
 * Parse a stored anchor back to a block index.
 *
 * Returns null for anything unrecognized, which includes every value written
 * by an older client. Callers treat null as "fall back to the percentage",
 * so an unknown format degrades rather than throws.
 */
export function decodeBlockAnchor(anchor: string | null | undefined): number | null {
  if (!anchor) return null;
  const match = BLOCK_ANCHOR_PATTERN.exec(anchor);
  if (!match) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

/**
 * Which block sits at the top of the viewport, given each block's offset from
 * the start of the content and how far into the content the reader has
 * scrolled.
 *
 * Picks the last block that starts at or above the current offset: while a
 * paragraph is straddling the top edge, the reader is still inside *that*
 * paragraph, not the next one.
 *
 * `tolerance` absorbs sub-pixel layout rounding — scrolling to a block's top
 * can land a fraction short of the measured offset, and without it the anchor
 * would snap back to the previous block. It makes the final pixel before a
 * block boundary ambiguous, which is harmless: both readings put the reader
 * in the same place on screen.
 */
export function blockIndexAtOffset(
  blockOffsets: number[],
  scrollOffset: number,
  tolerance = 1
): number | null {
  if (blockOffsets.length === 0) return null;
  if (scrollOffset <= 0) return 0;

  let index = 0;
  for (let i = 0; i < blockOffsets.length; i += 1) {
    if (blockOffsets[i] <= scrollOffset + tolerance) index = i;
    else break;
  }
  return index;
}

/**
 * Where to scroll to put a block at the top of the viewport, or null when the
 * anchor doesn't resolve against the content as it is rendered now — a chapter
 * edited since the position was saved, or a value from a client that indexed
 * blocks differently. Null means "use the percentage instead".
 */
export function offsetForBlockIndex(
  blockOffsets: number[],
  index: number | null
): number | null {
  if (index === null || index < 0 || index >= blockOffsets.length) return null;
  return blockOffsets[index];
}

/**
 * Each top-level block's offset from the top of the content, measured through
 * `getBoundingClientRect` so the numbers are independent of the current scroll
 * position and of whichever ancestor happens to be positioned.
 */
export function measureBlockOffsets(content: HTMLElement): number[] {
  const contentTop = content.getBoundingClientRect().top;
  return Array.from(content.children).map(
    (child) => (child as HTMLElement).getBoundingClientRect().top - contentTop
  );
}
