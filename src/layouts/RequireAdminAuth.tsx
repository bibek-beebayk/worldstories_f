import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router";
import { getAccessToken } from "@/api/client";
import { authApi } from "@/api/auth";
import FullScreenLoader from "@/components/FullScreenLoader";

export default function RequireAdminAuth() {
  const accessToken = getAccessToken();
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

  if (!accessToken) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isError || !user?.is_superuser) {
    return <Navigate to="/admin/login" replace state={{ adminAccessDenied: true }} />;
  }

  return <Outlet />;
}
