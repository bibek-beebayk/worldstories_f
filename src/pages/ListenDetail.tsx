import { data } from "react-router";
import { storyApi } from "@/api/story";
import { plainText } from "@/lib/plainText";
import { buildMeta } from "@/lib/buildMeta";
import StoryDetailShell from "@/components/StoryDetailShell";
import type { Route } from "./+types/ListenDetail";

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
      path: `/listen/${params.slug}`,
      noIndex: true,
    });
  }
  return buildMeta({
    title: `Listen to ${data.title}${data.author?.name ? ` by ${data.author.name}` : ""} | WorldStories`,
    description: plainText(data.about || data.summary || `Listen to ${data.title} on WorldStories.`).slice(0, 160),
    path: `/listen/${data.slug}`,
    image: data.cover_image,
  });
}

const ListenDetail = ({ loaderData }: Route.ComponentProps) => (
  <StoryDetailShell mode="listen" loaderData={loaderData || undefined} />
);

export default ListenDetail;
