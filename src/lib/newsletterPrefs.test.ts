// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { newsletterPrefs, shouldShowNewsletterPrompt } from "./newsletterPrefs";

describe("newsletter preferences", () => {
  beforeEach(() => newsletterPrefs.clear());

  it("stores the anonymous subscribed hint", () => {
    expect(newsletterPrefs.getSubscribedHint()).toBe(false);
    newsletterPrefs.setSubscribedHint();
    expect(newsletterPrefs.getSubscribedHint()).toBe(true);
    newsletterPrefs.setSubscribedHint(false);
    expect(newsletterPrefs.getSubscribedHint()).toBe(false);
  });

  it("shows the prompt only for a member with no subscription", () => {
    expect(shouldShowNewsletterPrompt("none")).toBe(true);
    expect(shouldShowNewsletterPrompt("pending")).toBe(false);
    expect(shouldShowNewsletterPrompt("confirmed")).toBe(false);
    expect(shouldShowNewsletterPrompt("unsubscribed")).toBe(false);
  });

  it("waits thirty days after Not now", () => {
    const now = Date.parse("2026-11-21T00:00:00Z");
    newsletterPrefs.setPromptDismissedAt(new Date(now - 29 * 24 * 60 * 60 * 1000));
    expect(shouldShowNewsletterPrompt("none", now)).toBe(false);
    newsletterPrefs.setPromptDismissedAt(new Date(now - 30 * 24 * 60 * 60 * 1000));
    expect(shouldShowNewsletterPrompt("none", now)).toBe(true);
  });

  it("honors Don't ask again", () => {
    newsletterPrefs.setPromptNever();
    expect(shouldShowNewsletterPrompt("none")).toBe(false);
  });
});
