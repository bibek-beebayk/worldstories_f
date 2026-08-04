import { useEffect, useRef } from "react";
import { AnalyticsEventType, trackAnalyticsEvent } from "@/lib/analytics";

export function useContentSessionAnalytics(
  eventType: Extract<AnalyticsEventType, "reading_session" | "listening_session">,
  storySlug?: string,
  enabled: boolean = true,
  metadata: Record<string, string | number | boolean | null> = {}
) {
  const metadataRef = useRef(metadata);
  metadataRef.current = metadata;

  useEffect(() => {
    if (!storySlug || !enabled) return;
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
          duration_seconds: seconds,
          metadata: metadataRef.current,
        });
      }
    };
  }, [enabled, eventType, storySlug]);
}
