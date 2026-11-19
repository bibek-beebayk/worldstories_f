import { redirect } from "react-router";

// The Originals page is switched off for now. Its files (pages/Originals.tsx)
// are kept so it can come back by pointing the route at them again. Until
// then /originals lands on the Library's "Originals only" filter, so the
// remaining links to it (story badges, "See all" links) still go somewhere
// useful. 302, not 301: this is temporary and must not be cached as permanent.
export function loader() {
  return redirect("/library?original=true", 302);
}

export default function OriginalsRedirect() {
  return null;
}
