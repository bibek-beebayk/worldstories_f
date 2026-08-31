import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const STORAGE_KEY = "read_along_auto_scroll";

/**
 * "Follow along" preference for the Read Along page — auto-scroll the active
 * cue into view. Defaults on; only an explicit "false" in storage disables it
 * (so a first-time reader and SSR both start enabled). Mirrors
 * `useAutoplayPreference`; consumers gate the toggle's render behind
 * `hasMounted` to keep SSR markup stable.
 */
export function useReadAlongAutoScroll(): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [enabled, setEnabled] = useState(
    () => typeof window === "undefined" || localStorage.getItem(STORAGE_KEY) !== "false"
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  return [enabled, setEnabled];
}
