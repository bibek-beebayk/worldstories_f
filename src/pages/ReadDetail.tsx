import { data } from "react-router";
import { storyApi } from "@/api/story";
import { buildStoryMeta, buildStoryNotFoundMeta } from "@/lib/storyMeta";
import StoryDetailShell from "@/components/StoryDetailShell";
import type { Route } from "./+types/ReadDetail";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getStory(params.slug!);
  } catch (error) {
    console.error("[SSR loader] request failed:", error);
    return data(null, { status: 404 });
  }
}

// Tells SiteThemeStyles (root.tsx) that this page's loader data may carry a
// theme chosen for the story — which then overrides the site theme here.
export const handle = { storyTheme: true };

export function meta({ data, params }: Route.MetaArgs) {
  return data ? buildStoryMeta(data, { mode: "read" }) : buildStoryNotFoundMeta(params.slug, "read");
}

const ReadDetail = ({ loaderData }: Route.ComponentProps) => (
  <StoryDetailShell mode="read" loaderData={loaderData || undefined} />
);

export default ReadDetail;
