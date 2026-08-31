import { useEffect, useState } from "react";

/**
 * Reactive `prefers-reduced-motion` reader. Starts `false` (SSR-safe and
 * matches the first client paint — nothing animates before mount anyway) and
 * updates if the OS setting changes mid-session.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
