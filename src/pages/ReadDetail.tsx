import { buildStoryMeta, buildStoryNotFoundMeta } from "@/lib/storyMeta";
import { isStoryNotFoundData, loadStoryOr404 } from "@/lib/storyLoader";
import StoryDetailShell from "@/components/StoryDetailShell";
import type { Route } from "./+types/ReadDetail";

export async function loader({ params }: Route.LoaderArgs) {
  return loadStoryOr404(params.slug!);
}

// Tells SiteThemeStyles (root.tsx) that this page's loader data may carry a
// theme chosen for the story — which then overrides the site theme here.
export const handle = { storyTheme: true };

export function meta({ data, params }: Route.MetaArgs) {
  return data && !isStoryNotFoundData(data)
    ? buildStoryMeta(data, { mode: "read" })
    : buildStoryNotFoundMeta(params.slug, "read");
}

const ReadDetail = ({ loaderData }: Route.ComponentProps) => (
  <StoryDetailShell mode="read" loaderData={loaderData} />
);

export default ReadDetail;
