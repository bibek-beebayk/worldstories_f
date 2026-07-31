import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginModal from "@/components/LoginModal";
import PullToRefresh from "@/components/PullToRefresh";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";
import { useImmersiveReader } from "@/context/ImmersiveReaderContext";

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
  "/profile": {
    title: "Your Profile | WorldStories",
    description: "Manage your WorldStories profile and personal library.",
    noIndex: true,
  },
};

export default function DefaultLayout() {
  const location = useLocation();
  const { isImmersiveReaderActive } = useImmersiveReader();
  const isPrivateUtilityRoute =
    location.pathname.startsWith("/read/") ||
    location.pathname.startsWith("/listen/") ||
    location.pathname.endsWith("/pdf") ||
    location.pathname.endsWith("/epub") ||
    location.pathname === "/search";
  // The PDF/EPUB readers are meant to be a full-viewport, distraction-free
  // reading experience with their own internal header/controls — their height
  // math (calc(100vh-...)) is tuned assuming they own the whole viewport, so
  // the site's own nav header and footer would otherwise eat into that budget
  // and push the reader's bottom bar off-screen. The HTML chapter reader
  // (StoryReader) isn't its own route — it toggles the same distraction-free
  // state in place via isImmersiveReaderActive (set through
  // ImmersiveReaderContext), rather than always hiding chrome for /read/.
  const isImmersiveReaderRoute =
    location.pathname.endsWith("/pdf") || location.pathname.endsWith("/epub") || isImmersiveReaderActive;
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
      {!isImmersiveReaderRoute && <Header />}

      {/* PullToRefresh always wraps <Outlet/> here (just internally disabled
          for immersive routes/modes) rather than being conditionally present —
          swapping which wrapper elements exist around <Outlet/> would change
          its position in the tree and make React remount whatever route is
          currently rendered (StoryReader included), wiping its in-place
          "reader mode" state right as it turns on. Disabled because the
          PDF/EPUB readers and the HTML reader's own fullscreen mode scroll
          their own internal container rather than the window, and already
          have their own touch handling (page-turn swipes / pinch-zoom), which
          a window-level pull gesture would otherwise fight with. */}
      <PullToRefresh disabled={isImmersiveReaderRoute}>
        <main className={isImmersiveReaderRoute ? "" : "min-h-[calc(100vh-200px)]"}>
          <Outlet /> {/* child routes render here */}
        </main>
      </PullToRefresh>

      {!isImmersiveReaderRoute && <Footer />}
      <LoginModal />
    </>
  );
}
