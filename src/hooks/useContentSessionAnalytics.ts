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

    // Sends what has accumulated so far, then zeroes it so the unmount cleanup
    // (or a later flush) can never count the same seconds twice. Under the
    // threshold nothing is sent and the time keeps accumulating. A tab close or
    // navigation away never runs the effect cleanup, so pagehide and
    // visibilitychange→hidden are the only places that time can be saved.
    const flush = () => {
      stop();
      const seconds = Math.round(accumulatedMs / 1000);
      if (seconds < 2) return;
      accumulatedMs = 0;
      trackAnalyticsEvent({
        event_type: eventType,
        story_slug: storySlug,
        blog_slug: blogSlug,
        duration_seconds: seconds,
        metadata: metadataRef.current,
      });
    };
    const visibilityChanged = () => {
      if (document.visibilityState === "visible") start();
      else flush();
    };

    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", flush);
    // A page restored from the back/forward cache resumes without remounting.
    window.addEventListener("pageshow", start);
    return () => {
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("pageshow", start);
      flush();
    };
  }, [enabled, eventType, storySlug, blogSlug]);
}
