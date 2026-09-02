import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics";

interface AdSpaceProps {
  size: "banner" | "square" | "rectangle";
  className?: string;
  // Which page/content type this slot renders on (e.g. "blog", "story",
  // "home") — surfaced in the ad_impression event's metadata so impressions
  // across content types are distinguishable in analytics, not just lumped
  // together as raw path strings. Optional and additive; omitting it is
  // fine, existing behavior is unaffected.
  contentType?: string;
}

// Ads are turned off site-wide for now: every <AdSpace/> renders nothing and
// no ad_impression events fire. Every call site is left in place — flip this
// one flag back to true to re-enable all ad placeholders at once.
const ADS_ENABLED = false;

const AdSpace = ({ size, className = "", contentType }: AdSpaceProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ADS_ENABLED) return;
    const element = containerRef.current;
    if (!element) return;
    let timer: number | null = null;
    let recorded = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (recorded) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer = window.setTimeout(() => {
            recorded = true;
            trackAnalyticsEvent({
              event_type: "ad_impression",
              metadata: {
                size,
                path: window.location.pathname,
                ...(contentType ? { content_type: contentType } : {}),
              },
            });
            observer.disconnect();
          }, 1000);
        } else if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(element);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [size, contentType]);

  if (!ADS_ENABLED) return null;

  const sizeClasses = {
    banner: "h-24 md:h-32",
    square: "aspect-square",
    rectangle: "aspect-[4/3]"
  };

  return (
    <div ref={containerRef} className={`bg-ad-bg border border-ad-border rounded-lg flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      <div className="text-center space-y-2 p-4">
        <div className="text-xs font-medium text-muted-foreground">Advertisement</div>
        <div className="text-xs text-muted-foreground/60">
          {size === "banner" ? "728 x 90" : size === "square" ? "300 x 300" : "300 x 250"}
        </div>
      </div>
    </div>
  );
};

export default AdSpace;
