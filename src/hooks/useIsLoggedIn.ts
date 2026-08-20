import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT, getAccessToken } from "@/api/client";

export function useIsLoggedIn() {
  // Always starts false (matching what the server renders — there's no
  // localStorage there) even for an already-logged-in client, and corrects
  // itself in the effect below right after mount. Reading getAccessToken()
  // directly in useState's initializer would make the very first client
  // render disagree with the server for any logged-in user (server: logged
  // out; client: logged in), which is a real hydration mismatch — React
  // then discards the server-rendered DOM and rebuilds the whole tree
  // client-side, which is what was dropping the page's CSS.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncAuthState = () => setIsLoggedIn(Boolean(getAccessToken()));
    syncAuthState();

    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  return isLoggedIn;
}
