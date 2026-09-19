// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyReferrer, resolveLandingReferral } from "./share";

const OWN = ["worldstories.net", "www.worldstories.net", "localhost"];

describe("classifyReferrer", () => {
  const cases: Array<[string, string, string, string]> = [
    ["google.com.np", "https://www.google.com.np/", "google", "www.google.com.np"],
    ["google.com", "https://google.com/search?q=secret+terms", "google", "google.com"],
    ["google.co.uk", "https://www.google.co.uk/", "google", "www.google.co.uk"],
    ["bing", "https://www.bing.com/search?q=x", "bing", "www.bing.com"],
    ["duckduckgo", "https://duckduckgo.com/", "duckduckgo", "duckduckgo.com"],
    ["yahoo", "https://search.yahoo.com/search", "yahoo", "search.yahoo.com"],
    ["yandex", "https://yandex.ru/", "yandex", "yandex.ru"],
    ["baidu", "https://www.baidu.com/s", "baidu", "www.baidu.com"],
    ["facebook link shim", "https://l.facebook.com/l.php?u=x", "facebook", "l.facebook.com"],
    ["facebook mobile", "https://m.facebook.com/", "facebook", "m.facebook.com"],
    ["facebook lm", "https://lm.facebook.com/l.php", "facebook", "lm.facebook.com"],
    ["t.co", "https://t.co/abc123", "twitter", "t.co"],
    ["x.com", "https://x.com/someone/status/1", "twitter", "x.com"],
    ["twitter.com", "https://twitter.com/", "twitter", "twitter.com"],
    ["instagram", "https://l.instagram.com/?u=x", "instagram", "l.instagram.com"],
    ["pinterest", "https://www.pinterest.com/pin/1", "pinterest", "www.pinterest.com"],
    ["reddit", "https://old.reddit.com/r/x", "reddit", "old.reddit.com"],
    ["youtube", "https://www.youtube.com/watch?v=1", "youtube", "www.youtube.com"],
    ["tiktok", "https://www.tiktok.com/@a", "tiktok", "www.tiktok.com"],
    ["other site", "https://Blog.Example.org/post?id=1", "other_site", "blog.example.org"],
    ["lookalike is not google", "https://notgoogle.com/", "other_site", "notgoogle.com"],
    ["lookalike suffix is not google", "https://google.evil.com/", "other_site", "google.evil.com"],
    ["lookalike is not x.com", "https://box.com/", "other_site", "box.com"],
  ];

  it.each(cases)("%s", (_name, referrer, source, host) => {
    expect(classifyReferrer(referrer, OWN)).toEqual({ source, host });
  });

  it("treats empty, malformed and missing referrers as direct", () => {
    for (const referrer of ["", undefined, null, "not a url"]) {
      expect(classifyReferrer(referrer, OWN)).toEqual({ source: "direct", host: "" });
    }
  });

  it("ignores this site's own hosts and Netlify previews", () => {
    for (const referrer of [
      "https://worldstories.net/story/x",
      "https://www.worldstories.net/",
      "http://localhost:8080/library",
      "https://deploy-preview-12--worldstories-f.netlify.app/",
      "https://worldstories-f.netlify.app/",
    ]) {
      expect(classifyReferrer(referrer, OWN)).toEqual({ source: "direct", host: "" });
    }
    expect(classifyReferrer("https://someone-else.netlify.app/", OWN).source).toBe("other_site");
  });

  it("never returns a path or query", () => {
    expect(classifyReferrer("https://www.google.com/search?q=private", OWN).host).toBe("www.google.com");
  });
});

describe("resolveLandingReferral precedence", () => {
  const google = "https://www.google.com/";

  it("prefers a valid ?ref= over utm_source and the referrer", () => {
    expect(resolveLandingReferral("?ref=twitter&utm_source=facebook", google, OWN)).toMatchObject({
      referral_source: "twitter",
      utm_source: "facebook",
      referrer_host: "www.google.com",
    });
  });

  it("ignores an invalid ?ref= and falls through", () => {
    expect(resolveLandingReferral("?ref=evil", google, OWN).referral_source).toBe("google");
  });

  it("prefers utm_source over the referrer, lowercased and capped at 40 chars", () => {
    const result = resolveLandingReferral(
      `?utm_source=Facebook&utm_medium=${"M".repeat(60)}`,
      google,
      OWN
    );
    expect(result.referral_source).toBe("facebook");
    expect(result.utm_source).toBe("facebook");
    expect(result.utm_medium).toBe("m".repeat(40));
  });

  it("buckets an unknown utm_source as other_site but keeps it in metadata", () => {
    expect(resolveLandingReferral("?utm_source=Newsletter", "", OWN)).toEqual({
      referral_source: "other_site",
      utm_source: "newsletter",
    });
  });

  it("uses the referrer when there is no ref or utm, and direct otherwise", () => {
    expect(resolveLandingReferral("", google, OWN).referral_source).toBe("google");
    expect(resolveLandingReferral("", "", OWN)).toEqual({ referral_source: "direct" });
    expect(resolveLandingReferral("", "https://worldstories.net/", OWN)).toEqual({
      referral_source: "direct",
    });
  });
});

describe("buildVisitMetadata", () => {
  // The landing flag is module state, so each test gets a fresh module.
  let buildVisitMetadata: typeof import("./share").buildVisitMetadata;
  beforeEach(async () => {
    vi.resetModules();
    ({ buildVisitMetadata } = await import("./share"));
  });

  it("marks only the first visit of a page load as the landing visit", () => {
    const landing = buildVisitMetadata("/story/a", "?utm_source=fb", "https://l.facebook.com/x", OWN);
    expect(landing).toEqual({
      path: "/story/a",
      referral_source: "facebook",
      referrer_host: "l.facebook.com",
      utm_source: "fb",
      landing: true,
    });

    // document.referrer is unchanged on later route changes, so it must not
    // be re-attributed; the ?ref/utm params are also ignored.
    expect(buildVisitMetadata("/library", "?ref=twitter", "https://l.facebook.com/x", OWN)).toEqual({
      path: "/library",
      referral_source: "internal",
    });
    expect(buildVisitMetadata("/", "", "https://www.google.com/", OWN)).toEqual({
      path: "/",
      referral_source: "internal",
    });
  });

  it("sends a direct landing visit with no referrer keys", () => {
    expect(buildVisitMetadata("/", "", "", OWN)).toEqual({
      path: "/",
      referral_source: "direct",
      landing: true,
    });
  });
});
