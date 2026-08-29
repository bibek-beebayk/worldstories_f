import { useEffect, useRef } from "react";
import { AnalyticsEventType, trackAnalyticsEvent } from "@/lib/analytics";

export type ContentIdentity = { storySlug: string } | { blogSlug: string };

export function useContentSessionAnalytics(
  eventType: Extract<AnalyticsEventType, "reading_session" | "listening_session" | "watching_session">,
  identity: ContentIdentity | undefined,
  enabled: boolean = true,
  metadata: Record<string, string | number | boolean | null> = {}
) {
  const metadataRef = useRef(metadata);
  metadataRef.current = metadata;

  const storySlug = identity && "storySlug" in identity ? identity.storySlug : undefined;
  const blogSlug = identity && "blogSlug" in identity ? identity.blogSlug : undefined;

  useEffect(() => {
    if ((!storySlug && !blogSlug) || !enabled) return;
    let startedAt = document.visibilityState === "visible" ? Date.now() : null;
    let accumulatedMs = 0;

    const stop = () => {
      if (startedAt === null) return;
      accumulatedMs += Date.now() - startedAt;
      startedAt = null;
    };
    const start = () => {
      if (startedAt === null && document.visibilityState === "visible") startedAt = Date.now();
    };
    const visibilityChanged = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", visibilityChanged);
      const seconds = Math.round(accumulatedMs / 1000);
      if (seconds >= 2) {
        trackAnalyticsEvent({
          event_type: eventType,
          story_slug: storySlug,
          blog_slug: blogSlug,
          duration_seconds: seconds,
          metadata: metadataRef.current,
        });
      }
    };
  }, [enabled, eventType, storySlug, blogSlug]);
}
