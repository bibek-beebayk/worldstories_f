import { redirect } from "react-router";

// /trending was permanently renamed to /discover. A loader-based redirect
// (unlike the old client-only <Navigate>) produces a real HTTP redirect on
// the server for any direct/crawled request, not just after JS loads — 301
// so search engines consolidate ranking onto the new URL, matching the
// permanent-rename redirects already used elsewhere (e.g. /catalogue in
// netlify.toml).
export function loader() {
  return redirect("/discover", 301);
}

export default function TrendingRedirect() {
  return null;
}
