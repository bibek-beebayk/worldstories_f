import { data } from "react-router";
import { storyApi } from "@/api/story";
import { buildStoryMeta, buildStoryNotFoundMeta } from "@/lib/storyMeta";
import StoryDetailShell from "@/components/StoryDetailShell";
import type { Route } from "./+types/ReadAlongDetail";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getStory(params.slug!);
  } catch (error) {
    console.error("[SSR loader] request failed:", error);
    return data(null, { status: 404 });
  }
}

export const handle = { storyTheme: true };

export function meta({ data, params }: Route.MetaArgs) {
  return data
    ? buildStoryMeta(data, { mode: "read-along" })
    : buildStoryNotFoundMeta(params.slug, "read-along");
}

const ReadAlongDetail = ({ loaderData }: Route.ComponentProps) => (
  <StoryDetailShell mode="read-along" loaderData={loaderData || undefined} />
);

export default ReadAlongDetail;
