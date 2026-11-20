import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { storyApi } from "@/api/story";
import { isStoryNotFoundData, loadStoryOr404 } from "@/lib/storyLoader";

describe("loadStoryOr404", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns a 404 marker for an API 404", async () => {
    vi.spyOn(storyApi, "getStory").mockRejectedValue(new ApiError("Not found", 404));

    const result = await loadStoryOr404("missing");

    expect(isStoryNotFoundData(result)).toBe(true);
    expect("init" in result && result.init?.status).toBe(404);
  });

  it("throws a 503 response for other failures", async () => {
    vi.spyOn(storyApi, "getStory").mockRejectedValue(new ApiError("Bad gateway", 502));

    try {
      await loadStoryOr404("unavailable");
      throw new Error("Expected loadStoryOr404 to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(503);
      expect(await (error as Response).text()).toBe("Story temporarily unavailable");
    }
  });
});
