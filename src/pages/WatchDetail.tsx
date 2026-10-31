import { data } from "react-router";
import { storyApi } from "@/api/story";
import { plainText } from "@/lib/plainText";
import { buildMeta } from "@/lib/buildMeta";
import StoryDetailShell from "@/components/StoryDetailShell";
import VideoWatchPage from "@/components/VideoWatchPage";
import type { Route } from "./+types/WatchDetail";

// /watch/<numeric id> is a single video; any other value is a legacy
// /watch/<story-slug> link, which still opens the story's own watch page.
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

export function meta({ data, params }: Route.MetaArgs) {
  if (!data) {
    return buildMeta({
      title: "Video Not Found | WorldStories",
      description: "The requested video could not be found.",
      path: `/watch/${params.slug}`,
      noIndex: true,
    });
  }
  if (data.kind === "video") {
    const { video } = data;
    return buildMeta({
      title: `${video.title} | Watch | WorldStories`,
      description: `Watch ${video.title}${video.story ? ` — from ${video.story.title}` : ""} on WorldStories.`,
      path: `/watch/${video.id}`,
      image: video.thumbnail,
    });
  }
  const story = data.story;
  return buildMeta({
    title: `Watch ${story.title}${story.author?.name ? ` by ${story.author.name}` : ""} | WorldStories`,
    description: plainText(story.about || story.summary || `Watch ${story.title} on WorldStories.`).slice(0, 160),
    path: `/watch/${story.slug}`,
    image: story.cover_image,
  });
}

const WatchDetail = ({ loaderData }: Route.ComponentProps) => {
  if (loaderData?.kind === "video") {
    return <VideoWatchPage key={loaderData.video.id} video={loaderData.video} />;
  }
  return <StoryDetailShell mode="watch" loaderData={loaderData?.kind === "story" ? loaderData.story : undefined} />;
};

export default WatchDetail;
