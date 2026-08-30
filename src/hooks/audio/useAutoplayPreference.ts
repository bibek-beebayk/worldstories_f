import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const AUTOPLAY_STORAGE_KEY = "audiobook-autoplay";

/**
 * Locally-persisted "advance to the next track automatically" toggle.
 * Defaults to on; only an explicit "false" in storage turns it off (so a
 * first-time listener and SSR both start enabled).
 */
export function useAutoplayPreference(): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [autoplayEnabled, setAutoplayEnabled] = useState(
    () => typeof window === "undefined" || localStorage.getItem(AUTOPLAY_STORAGE_KEY) !== "false"
  );

  useEffect(() => {
    localStorage.setItem(AUTOPLAY_STORAGE_KEY, String(autoplayEnabled));
  }, [autoplayEnabled]);

  return [autoplayEnabled, setAutoplayEnabled];
}
