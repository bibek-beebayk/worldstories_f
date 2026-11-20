import { buildMeta } from "@/lib/buildMeta";
import { buildStoryMeta, buildStoryNotFoundMeta } from "@/lib/storyMeta";
import { isStoryNotFoundData, loadStoryOr404, loadVideoOr404 } from "@/lib/storyLoader";
import StoryDetailShell from "@/components/StoryDetailShell";
import VideoWatchPage from "@/components/VideoWatchPage";
import NotFoundBody from "@/components/NotFoundBody";
import type { Route } from "./+types/WatchDetail";

// Assumption: an all-digit segment is always a video ID. New story slugs are
// guarded server-side so they can never be all digits and collide here.
const isVideoId = (param: string | undefined) => !!param && /^\d+$/.test(param);

export async function loader({ params }: Route.LoaderArgs) {
  if (isVideoId(params.slug)) {
    const video = await loadVideoOr404(params.slug!);
    return isStoryNotFoundData(video) ? video : { kind: "video" as const, video };
  }
  const story = await loadStoryOr404(params.slug!);
  return isStoryNotFoundData(story) ? story : { kind: "story" as const, story };
}

export const handle = { storyTheme: true };

export function meta({ data, params }: Route.MetaArgs) {
  if (!data || isStoryNotFoundData(data)) return buildStoryNotFoundMeta(params.slug, "watch");
  if (data.kind === "video") {
    const { video } = data;
    return buildMeta({
      title: `${video.title} | Watch | WorldStories`,
      description: `Watch ${video.title}${video.story ? ` — from ${video.story.title}` : ""} on WorldStories.`,
      path: `/watch/${video.id}`,
      image: video.thumbnail,
    });
  }
  return buildStoryMeta(data.story, { mode: "watch" });
}

const WatchDetail = ({ loaderData }: Route.ComponentProps) => {
  if (isStoryNotFoundData(loaderData)) return <NotFoundBody />;
  if (loaderData?.kind === "video") {
    return <VideoWatchPage key={loaderData.video.id} video={loaderData.video} />;
  }
  return <StoryDetailShell mode="watch" loaderData={loaderData?.kind === "story" ? loaderData.story : undefined} />;
};

export default WatchDetail;
