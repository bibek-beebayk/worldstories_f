import { ApiError } from "@/api/client";
import { storyApi } from "@/api/story";
import { isBlogNotFoundData, loadBlogOr404 } from "@/lib/blogLoader";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("loadBlogOr404", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns a 404 marker for an API 404", async () => {
    vi.spyOn(storyApi, "getBlog").mockRejectedValue(new ApiError("missing", 404));
    const result = await loadBlogOr404("missing");
    expect(isBlogNotFoundData(result)).toBe(true);
    expect("init" in result && result.init?.status).toBe(404);
  });

  it("throws a 503 response for other failures", async () => {
    vi.spyOn(storyApi, "getBlog").mockRejectedValue(new Error("offline"));
    try {
      await loadBlogOr404("post");
      throw new Error("Expected loadBlogOr404 to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(503);
      expect(await (error as Response).text()).toBe("Post temporarily unavailable");
    }
  });
});
