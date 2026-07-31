import { useEffect, useState } from "react";

// Matches the threshold Header.tsx shrinks itself at — shared so any page
// that needs to keep a sticky element positioned right below the header
// (instead of leaving a fixed gap sized for the header's full height) reacts
// to the exact same scroll point, rather than each duplicating its own
// slightly different threshold.
const SCROLL_THRESHOLD = 24;

export function useIsHeaderScrolled() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return isScrolled;
}
