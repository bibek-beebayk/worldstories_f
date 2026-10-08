import { describe, expect, it } from "vitest";
import { BASIC_IDENTITY, PUBLISHER_IDENTITY, identityFor, identityFromMatches } from "./siteIdentity";

describe("site identity", () => {
  it("shows the publisher only when switched on", () => {
    expect(identityFor({ show_publisher_info: true })).toBe(PUBLISHER_IDENTITY);
    expect(identityFor({ show_publisher_info: false })).toBe(BASIC_IDENTITY);
  });

  it("falls back to the basic details when settings didn't load", () => {
    expect(identityFor(null)).toBe(BASIC_IDENTITY);
    expect(identityFromMatches([])).toBe(BASIC_IDENTITY);
  });

  it("reads the root route's settings in meta()", () => {
    const matches = [{ id: "root", data: { siteSettings: { show_publisher_info: true } } }, { id: "pages/About", data: null }];
    expect(identityFromMatches(matches)).toBe(PUBLISHER_IDENTITY);
  });

  it("basic details never mention the publisher", () => {
    expect(JSON.stringify(BASIC_IDENTITY)).not.toMatch(/Bibek|Gautam|beebayk|Kathmandu/);
    expect(BASIC_IDENTITY).toMatchObject({ contactName: "WorldStories", email: "worldstoriesnet@gmail.com" });
  });
});
