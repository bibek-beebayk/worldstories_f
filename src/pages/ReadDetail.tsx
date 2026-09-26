import { data } from "react-router";
import { storyApi } from "@/api/story";
import { plainText } from "@/lib/plainText";
import { buildMeta } from "@/lib/buildMeta";
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

export function meta({ data, params }: Route.MetaArgs) {
  if (!data) {
    return buildMeta({
      title: "Story Not Found | WorldStories",
      description: "The requested story could not be found.",
      path: `/read/${params.slug}`,
      noIndex: true,
    });
  }
  return buildMeta({
    title: `Read ${data.title}${data.author?.name ? ` by ${data.author.name}` : ""} | WorldStories`,
    description: plainText(data.about || data.summary || `Read ${data.title} on WorldStories.`).slice(0, 160),
    path: `/read/${data.slug}`,
    image: data.cover_image,
  });
}

const ReadDetail = ({ loaderData }: Route.ComponentProps) => (
  <StoryDetailShell mode="read" loaderData={loaderData || undefined} />
);

export default ReadDetail;
