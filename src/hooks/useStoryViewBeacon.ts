import { useEffect, useRef } from "react";
import { storyApi } from "@/api/story";

export function useStoryViewBeacon(slug?: string) {
  const viewedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug || viewedSlugRef.current === slug) return;
    viewedSlugRef.current = slug;
    storyApi.registerStoryView(slug).catch(() => undefined);
  }, [slug]);
}
