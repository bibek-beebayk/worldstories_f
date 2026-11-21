import { ApiError } from "@/api/client";
import { storyApi } from "@/api/story";
import { data } from "react-router";

export interface BlogNotFoundData {
  notFound: true;
}

export const isBlogNotFoundData = (value: unknown): value is BlogNotFoundData => {
  if (!value || typeof value !== "object") return false;
  if ("notFound" in value && value.notFound === true) return true;
  return "data" in value && isBlogNotFoundData(value.data);
};

export async function loadBlogOr404(slug: string) {
  try {
    return await storyApi.getBlog(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return data<BlogNotFoundData>({ notFound: true }, { status: 404 });
    }
    throw new Response("Post temporarily unavailable", { status: 503 });
  }
}
