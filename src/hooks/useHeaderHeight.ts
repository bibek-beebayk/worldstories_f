import { useLayoutEffect, useState } from "react";

// Tracks the exact viewport y-coordinate where the sticky <header> currently
// ends (its live getBoundingClientRect().bottom), instead of hardcoding a
// pixel guess for its shrunk height. The header's height depends on several
// of its own CSS values at once (padding, margin, border) and animates via a
// CSS transition, so a static estimate drifts out of sync easily — measuring
// the real box (which also naturally accounts for things like margin
// collapsing) is the only way to keep a dependent sticky element flush
// against it at every point in the animation, not just at rest.
export function useHeaderHeight() {
  const [bottom, setBottom] = useState(0);

  useLayoutEffect(() => {
    const headerEl = document.querySelector("header");
    if (!headerEl) return;

    const measure = () => setBottom(headerEl.getBoundingClientRect().bottom);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(headerEl);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure);
    };
  }, []);

  return bottom;
}
