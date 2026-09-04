// Keeps the same story from appearing in rail after rail down the homepage.
//
// The homepage draws from several independently-built lists — Continue
// Reading, recommendations, Quick Reads, trending, editorial picks — and a
// popular story qualifies for most of them at once. The result reads as a much
// smaller catalogue than the site actually has, and it wastes the one thing a
// homepage is for: showing a reader something they have not already seen.
//
// The rule is priority, not novelty: the *highest-priority* rail keeps the
// story and lower ones drop it. A story you are halfway through belongs in
// Continue Reading, not in Trending — so Continue Reading claims it first and
// Trending shows something else.

export interface DedupableStory {
  id: number;
}

/**
 * Claims stories for a rail, skipping any already claimed by a higher-priority
 * one, and records what it kept.
 *
 * Stateful by design: rails are deduplicated in priority order, so each call
 * needs to know what came before it. Create one claimer per render of the page.
 */
export function createRailDeduplicator() {
  const claimed = new Set<number>();

  return {
    /**
     * The stories this rail may show, in its own order.
     *
     * `limit` is applied *after* filtering, so a rail that loses several
     * stories to higher-priority rails still fills up from what remains
     * instead of rendering short — the substitution the requirements document
     * asks for, without a second query.
     */
    claim<T extends DedupableStory>(stories: T[] | undefined, limit?: number): T[] {
      if (!stories || stories.length === 0) return [];
      const kept: T[] = [];
      for (const story of stories) {
        if (claimed.has(story.id)) continue;
        kept.push(story);
        claimed.add(story.id);
        if (limit !== undefined && kept.length >= limit) break;
      }
      return kept;
    },

    /**
     * Reserves stories without displaying them.
     *
     * Continue Reading is capped at five on the homepage, but the whole queue
     * still belongs to the reader — a story sitting sixth in it should not
     * resurface two rails down as though it were a fresh suggestion.
     */
    reserve(stories: DedupableStory[] | undefined): void {
      for (const story of stories ?? []) claimed.add(story.id);
    },

    /** Whether a story has already been shown or reserved further up the page. */
    isClaimed(id: number): boolean {
      return claimed.has(id);
    },

    get size(): number {
      return claimed.size;
    },
  };
}

export type RailDeduplicator = ReturnType<typeof createRailDeduplicator>;
