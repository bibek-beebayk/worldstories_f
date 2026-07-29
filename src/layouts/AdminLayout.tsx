import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";

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
      <Seo
        title="Admin | WorldStories"
        description="WorldStories administration."
        path={location.pathname}
        noIndex
      />
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
