import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router";
import { getAccessToken } from "@/api/client";
import { authApi } from "@/api/auth";
import FullScreenLoader from "@/components/FullScreenLoader";

export default function RequireAdminAuth() {
  // Deliberately not read directly during render (that was the previous
  // approach) — the server always sees no localStorage, so an already
  // logged-in admin's very first client render would disagree with the
  // server (client renders the real dashboard tree; server rendered
  // <Navigate>, which renders nothing) — a hydration mismatch severe enough
  // that React discards and rebuilds the whole subtree client-side, which
  // silently drops the page's CSS along with it. Starting at null (matching
  // the server) and reading the real token in an effect after mount avoids
  // the mismatch entirely; see useIsLoggedIn.ts for the identical pattern.
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [checkedToken, setCheckedToken] = useState(false);

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

  if (!checkedToken || isLoading) {
    return <FullScreenLoader />;
  }

  if (!accessToken) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isError || !user?.is_superuser) {
    return <Navigate to="/admin/login" replace state={{ adminAccessDenied: true }} />;
  }

  return <Outlet />;
}
