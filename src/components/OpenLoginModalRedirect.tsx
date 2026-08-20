import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuthModal } from "@/context/AuthModalContext";
import { buildMeta } from "@/lib/buildMeta";

// Renders essentially nothing (the real work is opening the modal
// client-side, below) — without this, the page had no meta() of its own and
// fell back to root's default *indexable* tags, meaning a crawler that
// reached it directly (e.g. via an old external link — /login isn't in
// robots.txt's Disallow list for /register, and even /login's Disallow only
// stops well-behaved crawlers from fetching it in the first place) would see
// generic homepage-ish metadata over an essentially blank body.
export function meta() {
  return buildMeta({
    title: "Log In | WorldStories",
    description: "Log in to WorldStories.",
    path: "/login",
    noIndex: true,
  });
}

// Target for old /login and /register links: opens the shared login modal
// and sends the user back to the homepage instead of rendering a bare page.
const OpenLoginModalRedirect = () => {
  const { openLoginModal } = useAuthModal();
  const navigate = useNavigate();

  useEffect(() => {
    openLoginModal();
    navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default OpenLoginModalRedirect;
