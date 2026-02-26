import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { clearTokens, getAccessToken } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasAccessToken = Boolean(getAccessToken());
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: hasAccessToken,
  });

  const isSuperuserLoggedIn = Boolean(hasAccessToken && me?.is_superuser);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const onLogout = () => {
    clearTokens();
    setShowLogoutModal(false);
    navigate("/admin/login");
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <header className="shrink-0 border-b bg-white/95 backdrop-blur">
        <div className="flex w-full items-center justify-between px-4 py-3">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Shield className="h-4 w-4" />
            WorldStories Admin
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/admin/content" className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100">
              Stories
            </Link>
            <Link to="/admin/submissions" className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100">
              Submissions
            </Link>
            {isSuperuserLoggedIn ? (
              <Button
                variant="ghost"
                className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                onClick={() => setShowLogoutModal(true)}
              >
                Logout
              </Button>
            ) : (
              <Link to="/admin/login" className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                Login
              </Link>
            )}
            <Link to="/" className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100">
              Website
            </Link>
          </nav>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}
        >
          <Card
            className="mx-auto w-full max-w-md border shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-logout-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="admin-logout-confirm-title" className="text-lg">
                Confirm logout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out from admin panel?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
