import { useEffect, useRef, useState } from "react";
import { authApi } from "@/api/auth";

export type UsernameAvailability = "idle" | "checking" | "available" | "taken" | "error";

const DEBOUNCE_MS = 400;

/** Debounced live username-availability check. Skips the request entirely
 * when the value equals `currentUsername` — no need to ask the server
 * whether you can keep the name you already have. */
export function useUsernameAvailability(username: string, currentUsername: string) {
  const [status, setStatus] = useState<UsernameAvailability>("idle");
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === currentUsername) {
      setStatus("idle");
      return;
    }

    setStatus("checking");
    const requestId = ++requestIdRef.current;
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await authApi.checkUsername(trimmed);
        // A newer keystroke may have started a later check that resolved
        // first — ignore this response if it's no longer the latest.
        if (requestIdRef.current !== requestId) return;
        setStatus(result.available ? "available" : "taken");
      } catch {
        if (requestIdRef.current !== requestId) return;
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [username, currentUsername]);

  return status;
}
