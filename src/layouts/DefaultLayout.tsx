import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoggedOutBanner from "@/components/LoggedOutBanner";
import LoginModal from "@/components/LoginModal";
import FirstLoginSetupModal from "@/components/FirstLoginSetupModal";
import PullToRefresh from "@/components/PullToRefresh";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { useImmersiveReader } from "@/context/ImmersiveReaderContext";
import { flushPendingSaves } from "@/lib/progressSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/DefaultLayout";

// Fallback only, for whichever child routes don't yet define their own
// meta() — every static page under this layout does now; the dynamic ones
// (story/chapter/author detail, readers) are next. Mirrors the noIndex logic
// those routes already use below (isPrivateUtilityRoute) so an
// not-yet-converted reader/search page doesn't get marked indexable by
// mistake in the meantime.
export function meta({ location }: Route.MetaArgs) {
  const isPrivateUtilityRoute =
    location.pathname.startsWith("/read/") ||
    location.pathname.startsWith("/listen/") ||
    location.pathname.endsWith("/pdf") ||
    location.pathname.endsWith("/epub") ||
    location.pathname === "/search";

  return buildMeta({
    title: "WorldStories | Stories from Around the World",
    description: "Read and discover diverse stories from writers around the world.",
    path: location.pathname,
    noIndex: isPrivateUtilityRoute,
  });
}

export default function DefaultLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { isImmersiveReaderActive } = useImmersiveReader();

  // Offline, only content that can actually work without a network — the
  // readers/player (which fall back to a downloaded, decrypted copy) and the
  // Downloads page itself (purely local IndexedDB) — stays reachable.
  // Everything else depends on the API and would otherwise just dead-end.
  const isReaderOrListenerRoute =
    location.pathname.startsWith("/read/") ||
    location.pathname.startsWith("/listen/") ||
    location.pathname.endsWith("/pdf") ||
    location.pathname.endsWith("/epub");
  const isDownloadsPage = location.pathname === "/downloads";
  const isAllowedOffline = isReaderOrListenerRoute || isDownloadsPage;

  useEffect(() => {
    if (!isOnline && !isAllowedOffline) {
      navigate("/downloads", { replace: true });
    }
  }, [isOnline, isAllowedOffline, navigate]);

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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    trackAnalyticsEvent({
      event_type: "visit",
      metadata: { path: location.pathname },
    });
  }, [location.pathname]);

  // Retries any progress saves that failed while offline. Runs once on
  // mount (catches anything left queued from a previous offline session)
  // and again every time the browser regains connectivity.
  useEffect(() => {
    flushPendingSaves();
    window.addEventListener("online", flushPendingSaves);
    return () => window.removeEventListener("online", flushPendingSaves);
  }, []);

  return (
    <>
      {!isImmersiveReaderRoute && (
        <>
          <Header />
          <LoggedOutBanner />
        </>
      )}

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
      <FirstLoginSetupModal />
    </>
  );
}
