import { useQuery } from "@tanstack/react-query";
import { storyApi } from "@/api/story";
import type { StoryDetail } from "@/api/types";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { listLocalProgress } from "@/lib/offlineDb";

export type StoryProgressMode = "read" | "listen" | "read-along" | "watch";

export function useStoryProgress(
  slug: string | undefined,
  story: StoryDetail | undefined,
  { modes }: { modes: StoryProgressMode[] },
) {
  const isAuthenticated = useIsLoggedIn();
  const enabled = (mode: StoryProgressMode) => modes.includes(mode);
  const needsAudio = enabled("listen") || enabled("read-along");

  const reading = useQuery({
    queryKey: ["reading-progress", slug],
    queryFn: () => storyApi.getReadingProgress(slug!),
    enabled: !!slug && !!isAuthenticated && enabled("read"),
    retry: false,
  });
  const audio = useQuery({
    queryKey: ["audio-progress", slug],
    queryFn: () => storyApi.getAudioProgress(slug!),
    enabled: !!slug && !!isAuthenticated && needsAudio,
    retry: false,
  });
  const guestAudio = useQuery({
    queryKey: ["local-audio-progress", slug],
    queryFn: () => listLocalProgress(slug),
    enabled: !!slug && !isAuthenticated && needsAudio && typeof window !== "undefined",
    retry: false,
  });
  const video = useQuery({
    queryKey: ["video-progress", slug],
    queryFn: () => storyApi.getVideoProgress(slug!),
    enabled: !!slug && !!isAuthenticated && enabled("watch"),
    retry: false,
  });
  const epub = useQuery({
    queryKey: ["file-reading-progress", slug, "epub"],
    queryFn: () => storyApi.getFileReadingProgress(slug!, "epub"),
    enabled: !!slug && !!isAuthenticated && enabled("read") && !!story?.epub_file,
    retry: false,
  });
  const pdf = useQuery({
    queryKey: ["file-reading-progress", slug, "pdf"],
    queryFn: () => storyApi.getFileReadingProgress(slug!, "pdf"),
    enabled: !!slug && !!isAuthenticated && enabled("read") && !!story?.pdf_file,
    retry: false,
  });

  return {
    isAuthenticated,
    readingProgress: reading.data,
    audioProgress: audio.data,
    guestAudioProgress: guestAudio.data,
    videoProgress: video.data,
    epubProgress: epub.data,
    pdfProgress: pdf.data,
  };
}
