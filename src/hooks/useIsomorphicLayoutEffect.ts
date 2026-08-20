import { useEffect, useLayoutEffect } from "react";

// `useLayoutEffect` is a no-op under SSR (there's no DOM to measure) and
// React warns about it — correctly, but the warning is noise here: the
// effect never runs server-side either way, "layout" vs. regular effect
// only matters once there's a real browser. Swapping to plain `useEffect`
// on the server (and staying `useLayoutEffect`, unchanged, on the client)
// silences the warning without changing real behavior anywhere.
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
