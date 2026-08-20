import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/AdminLayout";

// Fallback for every admin route that doesn't define its own meta() — none
// of them do today, since the admin panel is noindex/login-gated and isn't
// the SEO target this migration is for.
export function meta({ location }: Route.MetaArgs) {
  return buildMeta({
    title: "Admin | WorldStories",
    description: "WorldStories administration.",
    path: location.pathname,
    noIndex: true,
  });
}

export default function AdminLayout() {
  const location = useLocation();

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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
