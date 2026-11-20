import { buildStoryMeta, buildStoryNotFoundMeta } from "@/lib/storyMeta";
import { isStoryNotFoundData, loadStoryOr404 } from "@/lib/storyLoader";
import StoryDetailShell from "@/components/StoryDetailShell";
import type { Route } from "./+types/ListenDetail";

export async function loader({ params }: Route.LoaderArgs) {
  return loadStoryOr404(params.slug!);
}

export const handle = { storyTheme: true };

export function meta({ data, params }: Route.MetaArgs) {
  return data && !isStoryNotFoundData(data)
    ? buildStoryMeta(data, { mode: "listen" })
    : buildStoryNotFoundMeta(params.slug, "listen");
}

const ListenDetail = ({ loaderData }: Route.ComponentProps) => (
  <StoryDetailShell mode="listen" loaderData={loaderData} />
);

export default ListenDetail;
