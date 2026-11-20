import { data } from "react-router";
import { ApiError } from "@/api/client";
import { storyApi } from "@/api/story";

export interface StoryNotFoundData {
  notFound: true;
}

export const isStoryNotFoundData = (value: unknown): value is StoryNotFoundData => {
  if (!value || typeof value !== "object") return false;
  if ("notFound" in value && value.notFound === true) return true;
  return "data" in value && isStoryNotFoundData(value.data);
};

async function loadOr404<T>(request: () => Promise<T>) {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return data<StoryNotFoundData>({ notFound: true }, { status: 404 });
    }
    throw new Response("Story temporarily unavailable", { status: 503 });
  }
}

export const loadStoryOr404 = (slug: string) => loadOr404(() => storyApi.getStory(slug));

export const loadVideoOr404 = (id: string) => loadOr404(() => storyApi.getVideo(id));
