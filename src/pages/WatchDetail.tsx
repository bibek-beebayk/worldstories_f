import { data } from "react-router";
import { storyApi } from "@/api/story";
import { buildMeta } from "@/lib/buildMeta";
import { buildStoryMeta, buildStoryNotFoundMeta } from "@/lib/storyMeta";
import StoryDetailShell from "@/components/StoryDetailShell";
import VideoWatchPage from "@/components/VideoWatchPage";
import type { Route } from "./+types/WatchDetail";

// Assumption: an all-digit segment is always a video ID. New story slugs are
// guarded server-side so they can never be all digits and collide here.
const isVideoId = (param: string | undefined) => !!param && /^\d+$/.test(param);

export async function loader({ params }: Route.LoaderArgs) {
  try {
    if (isVideoId(params.slug)) {
      return { kind: "video" as const, video: await storyApi.getVideo(params.slug!) };
    }
    return { kind: "story" as const, story: await storyApi.getStory(params.slug!) };
  } catch (error) {
    console.error("[SSR loader] request failed:", error);
    return data(null, { status: 404 });
  }
}

export const handle = { storyTheme: true };

export function meta({ data, params }: Route.MetaArgs) {
  if (!data) return buildStoryNotFoundMeta(params.slug, "watch");
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
  if (loaderData?.kind === "video") {
    return <VideoWatchPage key={loaderData.video.id} video={loaderData.video} />;
  }
  return <StoryDetailShell mode="watch" loaderData={loaderData?.kind === "story" ? loaderData.story : undefined} />;
};

export default WatchDetail;
