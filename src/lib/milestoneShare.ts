import { buildShareUrl, copyShareLink, shareToFacebook, shareToTwitter } from "@/lib/share";

/**
 * Sharing a personal reading milestone.
 *
 * §11.4 is the constraint that shapes this: sharing is always something the
 * reader does, never something the site does for them. There is no automatic
 * post anywhere in this module — every function here runs from a press.
 *
 * The second rule is subtler and matters more. A shared link must never expose
 * the reader's activity to whoever receives it: the achievement lives in the
 * *message*, and the URL always points at a public page. The Story Passport
 * and profile are login-gated and `noIndex` precisely because they are private,
 * so linking to them would either leak or lead nowhere.
 */

export type MilestoneKind =
  | "countries"
  | "stories"
  | "streak"
  | "journey"
  | "achievement";

export interface Milestone {
  kind: MilestoneKind;
  /** The number reached, or the name of the thing completed. */
  value: number | string;
  /** Optional public page the milestone relates to — a journey, say. Defaults
   *  to the site home, which is always safe to share. */
  path?: string;
}

export function milestoneMessage(milestone: Milestone): string {
  const { kind, value } = milestone;
  switch (kind) {
    case "countries":
      return `I've explored ${value} countries through stories on WorldStories.`;
    case "stories":
      return `I've finished ${value} stories on WorldStories.`;
    case "streak":
      return `I'm on a ${value}-day reading streak on WorldStories.`;
    case "journey":
      return `I completed the ${value} journey on WorldStories.`;
    case "achievement":
      return `I unlocked "${value}" on WorldStories.`;
  }
}

/** Always a public page — never the passport or profile. */
export function milestonePath(milestone: Milestone): string {
  return milestone.path || "/";
}

export function shareMilestoneToTwitter(milestone: Milestone) {
  shareToTwitter(milestonePath(milestone), milestoneMessage(milestone));
}

export function shareMilestoneToFacebook(milestone: Milestone) {
  // Facebook takes no caption from the sharer, so this shares the page alone —
  // which is why the page is a public one.
  shareToFacebook(milestonePath(milestone));
}

export function copyMilestone(milestone: Milestone) {
  return copyShareLink(milestonePath(milestone));
}

export function milestoneShareUrl(milestone: Milestone): string {
  return buildShareUrl(milestonePath(milestone), "link");
}
