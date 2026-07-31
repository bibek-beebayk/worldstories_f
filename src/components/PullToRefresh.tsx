import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const PULL_THRESHOLD = 70;
const MAX_PULL = 110;

// Regular browser tabs already have a native pull-to-refresh gesture, so this
// only takes over when running as an installed, standalone PWA — where that
// native gesture is usually unavailable and there'd otherwise be no way to
// refresh at all. navigator.standalone is the iOS-specific equivalent of the
// display-mode media query (Safari doesn't support the media query itself).
const isStandalonePwa = () => {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
};

const PullToRefresh = ({ children }: { children: ReactNode }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isReleased, setIsReleased] = useState(false);
  const pullDistanceRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  useEffect(() => {
    if (!isStandalonePwa()) return;

    const reset = () => {
      isPullingRef.current = false;
      startYRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setIsDragging(false);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || isReleased) return;
      startYRef.current = event.touches[0].clientY;
      isPullingRef.current = true;
      setIsDragging(true);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!isPullingRef.current || startYRef.current === null) return;
      const delta = event.touches[0].clientY - startYRef.current;

      if (delta <= 0 || window.scrollY > 0) {
        reset();
        return;
      }

      // Rubber-band resistance: each extra pixel of real finger movement
      // moves the indicator less the further it's already been pulled, same
      // feel as native pull-to-refresh.
      const resisted = Math.min(MAX_PULL, delta * 0.5);
      pullDistanceRef.current = resisted;
      setPullDistance(resisted);
      // Only hijack the gesture once it's clearly a deliberate pull, so a
      // small accidental jiggle at the top of the page doesn't block a
      // regular tap or the browser's own scroll momentum.
      if (delta > 10) event.preventDefault();
    };

    const onTouchEnd = () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      startYRef.current = null;
      setIsDragging(false);

      if (pullDistanceRef.current >= PULL_THRESHOLD) {
        setIsReleased(true);
        setPullDistance(PULL_THRESHOLD);
        window.location.reload();
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isReleased]);

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center overflow-hidden"
        style={{ height: pullDistance, opacity: progress }}
        aria-hidden
      >
        <div className="flex h-full items-end pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-card shadow-md">
            <RefreshCw
              className={`h-4 w-4 text-primary ${isReleased ? "animate-spin" : ""}`}
              style={isReleased ? undefined : { transform: `rotate(${progress * 360}deg)` }}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isDragging ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
