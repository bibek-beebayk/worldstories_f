import { useEffect, useRef, useState } from "react";
import { contentScrollFraction } from "@/lib/readingProgress";

/**
 * How far the reader has scrolled through an element laid out in normal
 * document flow — Quick Read, and anything else that scrolls the window rather
 * than its own container.
 *
 * Deliberately measurement only. It reports a number and saves nothing, so it
 * can run for signed-out readers too: showing someone their position in what
 * they are reading has nothing to do with whether there is an account to store
 * it against.
 *
 * SSR-safe: starts at 0 on the server and on the first client paint, so the
 * markup matches and the bar simply fills in after mount.
 */
export function useContentScrollProgress<T extends HTMLElement = HTMLDivElement>(
  enabled = true
) {
  const contentRef = useRef<T | null>(null);
  const [fraction, setFraction] = useState(0);

  useEffect(() => {
    const content = contentRef.current;
    if (!enabled || !content) return;

    const measure = () => {
      setFraction(
        contentScrollFraction({
          contentTop: content.getBoundingClientRect().top + window.scrollY,
          contentHeight: content.offsetHeight,
          viewportBottom: window.scrollY + window.innerHeight,
        })
      );
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    // Re-measured on resize because the content's height changes with the
    // viewport width — a rotation would otherwise leave the bar reporting a
    // position from the previous layout.
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [enabled]);

  return { contentRef, fraction };
}
