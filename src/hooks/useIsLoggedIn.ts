import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT, getAccessToken } from "@/api/client";

export function useIsLoggedIn() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    const syncAuthState = () => setIsLoggedIn(Boolean(getAccessToken()));

    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  return isLoggedIn;
}
