// import { useQuery } from "@tanstack/react-query";
// import { storyApi } from "../api/story";

// export function useAudio(story_slug: string, audio_slug: string, type: string = "audio") {
//   return useQuery({
//     queryKey: ["audio", story_slug, audio_slug],
//     queryFn: () => storyApi.getChapter(story_slug, audio_slug, type),
//   });
// }