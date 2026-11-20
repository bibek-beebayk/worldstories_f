import { data, useLocation } from "react-router";
import { useEffect } from "react";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/NotFound";
import NotFoundBody from "@/components/NotFoundBody";

// Without this, the catch-all route below is a legitimately *matched* route
// as far as the router is concerned (it's an explicit route in routes.ts,
// not an unmatched-path fallback), so it would otherwise render this page
// with a 200 — a "soft 404" that search engines specifically flag.
export function loader() {
  return data(null, { status: 404 });
}

export function meta({ location }: Route.MetaArgs) {
  return buildMeta({
    title: "Page Not Found | WorldStories",
    description: "The requested WorldStories page could not be found.",
    path: location.pathname,
    noIndex: true,
  });
}

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return <NotFoundBody />;
};

export default NotFound;
