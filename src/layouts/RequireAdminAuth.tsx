import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Outlet } from "react-router";
import { getAccessToken } from "@/api/client";
import { authApi } from "@/api/auth";
import FullScreenLoader from "@/components/FullScreenLoader";

export default function RequireAdminAuth() {
  // Deliberately not read directly during render (that was the previous
  // approach) — the server always sees no localStorage, so an already
  // logged-in admin's very first client render would disagree with the
  // server (client renders the real dashboard tree; server rendered
  // nothing during the redirect check) — a hydration mismatch severe
  // enough that React discards and rebuilds the whole subtree client-side,
  // which silently drops the page's CSS along with it. Starting at null
  // (matching the server) and reading the real token in an effect after
  // mount avoids the mismatch entirely; see useIsLoggedIn.ts for the
  // identical pattern.
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [checkedToken, setCheckedToken] = useState(false);
  // Redirecting via an imperative navigate() call in a ref-guarded effect,
  // not a declaratively-rendered <Navigate>, deliberately — <Navigate>
  // fires its own navigate() on every render with no way to gate it, so if
  // anything upstream keeps this component mounted and re-rendering after
  // the first redirect (a parent context re-render, a query re-render,
  // etc.) it calls navigate() again on every single one of those renders,
  // which is exactly what produced a "Maximum update depth exceeded" loop
  // here. This ref makes the redirect fire at most once per mount, full stop.
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    setAccessToken(getAccessToken());
    setCheckedToken(true);
  }, []);

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-auth", accessToken],
    queryFn: authApi.getMe,
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 60_000,
  });

  const shouldRedirectToLogin = checkedToken && !isLoading && (!accessToken || isError || !user?.is_superuser);

  useEffect(() => {
    if (!shouldRedirectToLogin || hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    navigate("/admin/login", {
      replace: true,
      state: accessToken ? { adminAccessDenied: true } : undefined,
    });
  }, [shouldRedirectToLogin, accessToken, navigate]);

  if (!checkedToken || isLoading || shouldRedirectToLogin) {
    return <FullScreenLoader />;
  }

  return <Outlet />;
}
