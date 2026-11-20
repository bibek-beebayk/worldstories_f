import { describe, expect, it } from "vitest";
import { ApiError } from "@/api/client";
import { shouldRetryStory } from "@/hooks/useStory";

describe("useStory retry policy", () => {
  it("does not retry a 404", () => {
    expect(shouldRetryStory(0, new ApiError("Not found", 404))).toBe(false);
  });

  it("retries other failures at most twice", () => {
    const error = new ApiError("Unavailable", 503);
    expect(shouldRetryStory(0, error)).toBe(true);
    expect(shouldRetryStory(1, error)).toBe(true);
    expect(shouldRetryStory(2, error)).toBe(false);
  });
});
