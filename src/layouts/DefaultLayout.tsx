import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";

const routeSeo: Record<string, { title: string; description: string; noIndex?: boolean }> = {
  "/": {
    title: "WorldStories | Discover Stories from Around the World",
    description:
      "Discover original stories, trending reads, audiobooks, and diverse voices from around the world on WorldStories.",
  },
  "/library": {
    title: "Story Library | WorldStories",
    description:
      "Browse the WorldStories library by genre, popularity, rating, and publication status.",
  },
  "/trending": {
    title: "Trending Stories | WorldStories",
    description: "Read the stories currently trending with WorldStories readers.",
  },
  "/discover": {
    title: "Discover New Stories | WorldStories",
    description: "Find recommended, original, and newly published stories on WorldStories.",
  },
  "/contest": {
    title: "Story Contests | WorldStories",
    description: "Discover upcoming writing contests and opportunities from WorldStories.",
  },
  "/publish": {
    title: "Submit Your Story | WorldStories",
    description: "Submit your original writing to the WorldStories editorial team.",
    noIndex: true,
  },
  "/login": {
    title: "Sign In | WorldStories",
    description: "Sign in to your WorldStories account.",
    noIndex: true,
  },
  "/profile": {
    title: "Your Profile | WorldStories",
    description: "Manage your WorldStories profile and personal library.",
    noIndex: true,
  },
};

export default function DefaultLayout() {
  const location = useLocation();
  const isPrivateUtilityRoute =
    location.pathname.startsWith("/read/") ||
    location.pathname.startsWith("/listen/") ||
    location.pathname.endsWith("/pdf") ||
    location.pathname === "/search";
  const metadata = routeSeo[location.pathname] || {
    title: "WorldStories | Stories from Around the World",
    description: "Read and discover diverse stories from writers around the world.",
    noIndex: isPrivateUtilityRoute,
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <>
      <Seo
        title={metadata.title}
        description={metadata.description}
        path={location.pathname}
        noIndex={metadata.noIndex}
      />
      <Header />

      <main className="min-h-[calc(100vh-200px)]">
        <Outlet /> {/* child routes render here */}
      </main>

      <Footer />
    </>
  );
}
