import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";

// React Router's client-side navigations wait for the target route's loader
// to resolve before swapping the page — with no feedback during that wait,
// a slow loader (e.g. a cold-started backend) makes the app look frozen.
// A thin top bar, the same pattern used by GitHub/YouTube/NProgress, is
// enough to signal "something is happening" without a jarring full-page
// spinner for what's often a sub-second wait.
const NavigationProgress = () => {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const growTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isNavigating) {
      clearTimeout(hideTimeoutRef.current);
      setVisible(true);
      setProgress(15);
      // Creeps toward (but never reaches) 90% while the loader is still in
      // flight, so the bar keeps visibly moving during a longer wait instead
      // of sitting frozen partway across — the actual jump to 100% only
      // happens once navigation genuinely finishes, below.
      const grow = () => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.15 : p));
        growTimeoutRef.current = setTimeout(grow, 300);
      };
      growTimeoutRef.current = setTimeout(grow, 300);
    } else {
      clearTimeout(growTimeoutRef.current);
      setProgress(100);
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }
    return () => {
      clearTimeout(growTimeoutRef.current);
    };
  }, [isNavigating]);

  useEffect(() => {
    return () => clearTimeout(hideTimeoutRef.current);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed left-0 top-0 z-[100] h-0.5 w-full bg-transparent" aria-hidden="true">
      <div
        className="h-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1, transitionProperty: "width, opacity" }}
      />
    </div>
  );
};

export default NavigationProgress;
