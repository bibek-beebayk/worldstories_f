import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_BASE_URL } from "@/api/client";
import { storyApi } from "@/api/story";
import { useStory } from "@/hooks/useStory";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { getDecryptedBinary } from "@/hooks/useOfflineDownload";
import { makeDownloadId } from "@/lib/offlineDb";
import { queueFileProgress, saveFileProgressLocally } from "@/lib/progressSync";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontalEnd,
  Layers,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  Moon,
  Settings,
  ScrollText,
  Sun,
  Type,
  ZoomIn,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Epub, { type Book, type Contents, type Location as EpubLocation, type Rendition } from "epubjs";
import type { NavItem } from "epubjs/types/navigation";
import Seo from "@/components/Seo";
import { FONTS } from "@/pages/StoryReader";
import {
  getSavedPageAnimation,
  PAGE_ANIMATION_OPTIONS,
  runReaderPageAnimation,
  type PageAnimationEffect,
} from "@/lib/readerAnimations";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";

const READER_FONT_KEYS = ["literata", "georgia", "times", "garamond", "helvetica"] as const;
type EpubFontKey = (typeof READER_FONT_KEYS)[number];

// Open-source metric equivalents for the fonts referenced in FONTS (Georgia/Times/
// Garamond/Helvetica aren't installed on most non-Mac/Windows systems), so each
// font choice actually renders distinctly instead of collapsing to the browser's
// generic serif/sans-serif fallback. Kept in sync with index.html's Google Fonts
// <link>, which covers the same families for the non-iframe chapter reader.
const READER_FONTS_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Gelasio:ital,wght@0,400;0,700;1,400&family=Tinos:ital,wght@0,400;0,700;1,400&family=Arimo:ital,wght@0,400;0,700;1,400&display=swap";

// Selectors are scoped to "body.<key>" (not a bare "body") because epub.js never
// removes or reorders a theme's injected <style> tag once created — it only
// toggles a class on <body> via themes.select(). With an unscoped selector,
// whichever theme's stylesheet was created *most recently* wins the CSS cascade,
// regardless of which theme is currently selected, so switching back to an
// earlier theme silently fails to reapply. Scoping to the toggled class ties the
// rule directly to whichever theme is actually active right now.
// The "text-align: left !important" rules below force left-alignment even when
// the EPUB's own stylesheet sets justify directly on <p>/<div>/etc (common in
// EPUB conversions) — a body-level override alone wouldn't win against that,
// since a direct rule on the element itself always beats one merely inherited
// from body. Justified text has a well-known browser rendering quirk in CSS
// multi-column layouts: the last word of a fully-stretched line can render a
// few pixels past the column's right edge (the amount varies with the words
// being justified, so no fixed safety margin fully covers it) — left-aligning
// sidesteps that class of overflow entirely, at the cost of a ragged right
// edge, the same tradeoff most e-readers default to.
// Matches the site header's own "scrolled" glass treatment (Header.tsx) —
// same gradient/blur/opacity values — so the reader's floating header/footer
// bars read as the same material as the rest of the app rather than a plain
// opaque card. The supports-[backdrop-filter] variants only kick in on
// browsers that actually support the blur; elsewhere the plain gradient
// stops still give a reasonable (just non-blurred) translucent look.
const READER_GLASS_PANEL_CLASS =
  "border-border bg-gradient-to-br from-primary/10 to-background/100 backdrop-blur supports-[backdrop-filter]:from-primary/10 supports-[backdrop-filter]:to-background/45";

const READER_THEMES = {
  light: { label: "Light", icon: Sun, background: "#ffffff", color: "#1a1a1a" },
  sepia: { label: "Sepia", icon: Sun, background: "#f4ecd8", color: "#5b4636" },
  dark: { label: "Dark", icon: Moon, background: "#1b2230", color: "#d1d5db" },
} as const;
type EpubThemeKey = keyof typeof READER_THEMES;
type EpubViewMode = "page" | "scroll";
const PAGE_ANIMATION_ICONS = {
  none: Ban,
  fade: Layers,
  slide: MoveHorizontal,
  zoom: ZoomIn,
  flip: GalleryHorizontalEnd,
} satisfies Record<PageAnimationEffect, typeof Ban>;

// Derived from READER_THEMES (rather than duplicating hex codes in a second
// place) so the outer reader panel's background — set inline from the same
// values, further down — can never drift out of sync with what epub.js
// actually applies inside the iframe.
const buildEpubThemeCss = (key: EpubThemeKey) => ({
  [`body.${key}`]: { background: READER_THEMES[key].background, color: READER_THEMES[key].color },
  [`body.${key} p, body.${key} div, body.${key} span, body.${key} li`]: { "text-align": "left !important" },
});

const EpubReader = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const location = useLocation();
  // Coming from the Downloads page should return there, not to the story
  // page — the entry point passes this via navigation state (see
  // ProfileDownloadedStory.tsx).
  const backHref = (location.state as { backTo?: string } | null)?.backTo || `/story/${slug}`;
  const { data: story, isLoading, isError } = useStory(slug || "");
  const isAuthenticated = useIsLoggedIn();
  const readerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const lastCfiRef = useRef<string | null>(null);
  const isPageTurningRef = useRef(false);
  const saveProgressTimerRef = useRef<number | null>(null);
  const directTouchDocumentsRef = useRef(new WeakSet<Document>());
  const scrollReportTimerRef = useRef<number | null>(null);

  const [toc, setToc] = useState<NavItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sectionPageCount, setSectionPageCount] = useState(1);
  const [fontSizePercent, setFontSizePercent] = useState(100);
  const [fontFamily, setFontFamily] = useState<EpubFontKey>("literata");
  const [theme, setTheme] = useState<EpubThemeKey>("light");
  const [viewMode, setViewMode] = useState<EpubViewMode>(() =>
    localStorage.getItem("epub-reader-view-mode") === "scroll" ? "scroll" : "page"
  );
  const viewModeRef = useRef<EpubViewMode>(viewMode);
  const [pageAnimation, setPageAnimation] = useState<PageAnimationEffect>(() =>
    getSavedPageAnimation("epub-reader-page-animation")
  );
  const pageAnimationRef = useRef<PageAnimationEffect>(pageAnimation);
  const [readerError, setReaderError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEpubLoading, setIsEpubLoading] = useState(true);
  // Immersive-reading toggle shared by every viewport: tapping/clicking the
  // page hides the header/footer chrome without resizing the rendition.
  const [controlsVisible, setControlsVisible] = useState(true);
  useContentSessionAnalytics("reading_session", slug, true, {
    format: "epub",
    view_mode: viewMode,
  });

  const storageKey = useMemo(() => {
    if (!story?.slug) return "";
    return `epub-reader-progress-${story.slug}`;
  }, [story?.slug]);

  // localStorage remains the source of truth for anonymous readers (and as an
  // instant local fallback for logged-in ones), but logged-in readers also get
  // their position synced to their account via the API — mirrors the same
  // debounced-save pattern StoryReader.tsx uses for chapter progress.
  const queueSaveFileProgress = (cfi: string, progressFraction: number) => {
    if (!story?.slug) return;
    if (saveProgressTimerRef.current) {
      window.clearTimeout(saveProgressTimerRef.current);
    }
    saveProgressTimerRef.current = window.setTimeout(() => {
      const normalized = Math.min(1, Math.max(0, progressFraction));
      saveFileProgressLocally(story.slug, "epub", normalized, cfi);
      if (isAuthenticated) {
        storyApi
          .saveFileReadingProgress(story.slug, "epub", normalized, cfi)
          .catch(() => queueFileProgress(story.slug, "epub", normalized, cfi));
      }
    }, 400);
  };

  // epub.js paginates by slicing content into CSS columns whose height matches
  // the container's pixel height exactly. If that height isn't a whole multiple
  // of the rendered line-height, the last line of a page only gets a sliver of
  // room and is clipped by the column's overflow — visible as unreadable text
  // cut off at the bottom. Forcing a fixed, known line-height (below) lets us
  // measure it in pixels and snap the rendered height down to the nearest whole
  // line, so a page never ends mid-line.
  //
  // Width and height are both rounded to whole integers here (and re-measured
  // fresh on every call, via the ResizeObserver below) rather than left as an
  // elastic percentage. epub.js turns pages with a *relative* scrollLeft step
  // sized from the container's measured width — if that width is ever fractional
  // (very common with percentage-based flex/grid layouts on non-integer-DPI
  // displays), the step is fractional too, while the browser rounds the actual
  // scroll position to a whole pixel on every turn. That mismatch is tiny on any
  // single page turn, but compounds with every one after it, which is why it only
  // becomes visible as clipped/overlapping columns deep into a long book rather
  // than on the first few pages.
  // epub.js only re-reports the current location (progress %, page number)
  // when its own internal view-manager scroll listener fires, which is
  // attached to whichever element *it* considers the scroll surface. That
  // didn't reliably match the actual scroll surface in our layout —
  // progress only updated on discrete events like chapter navigation, not
  // while scrolling through a long chapter, which is what "reads a lot,
  // percentage never moves" was. Calling the (public) reportLocation()
  // ourselves on our own scroll listeners, attached directly to the places
  // that could plausibly be the real scroll surface (see the two call
  // sites below), doesn't depend on epub.js's internal wiring lining up
  // with our CSS.
  const reportScrollLocation = useCallback(() => {
    if (scrollReportTimerRef.current) window.clearTimeout(scrollReportTimerRef.current);
    scrollReportTimerRef.current = window.setTimeout(() => {
      renditionRef.current?.reportLocation();
    }, 120);
  }, []);

  const snapPaginationHeight = (fallbackCfi?: string) => {
    if (viewModeRef.current === "scroll") return;
    const rendition = renditionRef.current;
    const viewerEl = viewerRef.current;
    if (!rendition || !viewerEl) return;
    const iframe = viewerEl.querySelector("iframe");
    const body = iframe?.contentDocument?.body;
    if (!body) return;
    const lineHeightPx = parseFloat(getComputedStyle(body).lineHeight);
    if (!lineHeightPx) return;
    const wholeLines = Math.floor(viewerEl.clientHeight / lineHeightPx);
    const snappedHeight = Math.floor(wholeLines * lineHeightPx);
    // The -2px safety margin guards against the browser's own CSS columns engine
    // (which is allowed to adjust rendered column widths slightly for "optimal"
    // fit, even given a whole-integer column-width) rendering a page a hair wider
    // than requested — without it, that sub-pixel rounding can leave a faint
    // sliver of the next column visible at the edge.
    const snappedWidth = Math.floor(viewerEl.clientWidth) - 2;
    if (snappedHeight <= 0 || snappedWidth <= 0) return;
    // rendition.resize() only redisplays automatically if epub.js already has an
    // internal "current location" recorded, which isn't guaranteed the very first
    // time this runs (right after the initial display() call resolves, before the
    // first "relocated" event). Re-displaying explicitly avoids depending on that
    // internal state and guards against ending up on a blank, un-rendered page.
    const targetCfi = lastCfiRef.current || fallbackCfi;
    rendition.resize(snappedWidth, snappedHeight);
    rendition.display(targetCfi);
  };

  // A lightweight "page turn" cue: epub.js swaps the iframe's content
  // essentially instantly, which otherwise reads as an abrupt jump-cut with
  // no sense of direction. This doesn't touch epub.js's own pagination at
  // all (a true page-curl/flip would need a completely different rendering
  // approach than epub.js's CSS-column layout supports) — it just slides
  // and fades viewerRef in from the turn direction *after* the swap, purely
  // as a cosmetic overlay on top of the instant content change underneath.
  // Plain imperative style writes (not React state) since this is a
  // transient, fire-and-forget effect with no rendered output of its own.
  const animatePageTurn = useCallback((direction: "next" | "prev") => {
    if (viewModeRef.current !== "page") return;
    const el = viewerRef.current;
    if (!el) return;
    runReaderPageAnimation(el, pageAnimationRef.current, direction);
  }, []);

  // Keep page turns strictly sequential. Calling next()/prev() again while
  // epub.js is still moving its CSS-column stage can make both operations use
  // the same starting location, which presents as a short sequence of pages
  // repeating. We also intentionally do not call display(lastCfi) after a turn:
  // display() rounds a CFI at a column boundary and can select the preceding
  // page, undoing the successful native turn.
  const turnPage = useCallback(
    async (direction: "next" | "prev") => {
      const rendition = renditionRef.current;
      if (!rendition || isPageTurningRef.current) return;
      isPageTurningRef.current = true;
      try {
        if (direction === "next") await rendition.next();
        else await rendition.prev();
        animatePageTurn(direction);
        // rendition.next()/prev() can resolve slightly before epub.js's own
        // internal position bookkeeping — which it updates via its own
        // requestAnimationFrame-scheduled "relocated" event — has actually
        // caught up. Releasing the lock immediately let a fast second swipe
        // start from that still-stale internal state, which is what let
        // rapid page turns occasionally jump backward to already-read
        // content rather than just being ignored. Waiting a couple of
        // frames here gives that internal update time to land before
        // another turn is allowed to start.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        // next()/prev() already trigger epub.js's own internal
        // reportLocation() call, but that call's actual work (reading
        // manager.currentLocation() and emitting "relocated") runs inside
        // its own later, separately-queued requestAnimationFrame — and
        // that read reflects whatever page is *currently* displayed at
        // the moment it finally runs, not the page this particular turn
        // landed on. Turn pages faster than that queue drains and several
        // of those backlogged reports end up reading the same later page,
        // so the tracker looks frozen through the intermediate pages and
        // then jumps straight to the current one. Calling it again
        // ourselves here — after our own settle delay above, with the
        // next turn still locked out — asserts one definitive, correctly-
        // ordered report per turn instead of trusting that queue's timing.
        rendition.reportLocation();
      } finally {
        isPageTurningRef.current = false;
      }
    },
    [animatePageTurn]
  );

  const goNext = useCallback(() => turnPage("next"), [turnPage]);
  const goPrev = useCallback(() => turnPage("prev"), [turnPage]);

  // Tapping the reader toggles the header/footer chrome; swiping left/right
  // turns pages in Page mode.
  // Distinguished by how much the touch moved — a near-stationary touch is a
  // tap, a mostly-horizontal one past the threshold is a swipe. Touch events
  // never fire for mouse input, so this naturally only affects touchscreens
  // without needing a separate viewport-width check.
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastHandledTouchTapAtRef = useRef(0);
  const SWIPE_THRESHOLD_PX = 28;
  const TAP_MAX_MOVEMENT_PX = 16;
  const TAP_MAX_DURATION_MS = 700;

  const resetGesturePreview = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.style.transition = "transform 140ms ease-out";
    viewer.style.transform = "translateX(0)";
  }, []);

  const completeReaderGesture = useCallback(
    (clientX: number, clientY: number) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      resetGesturePreview();
      if (!start) return;
      const dx = clientX - start.x;
      const dy = clientY - start.y;
      const elapsedMs = Date.now() - start.time;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (viewModeRef.current === "page" && absDx > SWIPE_THRESHOLD_PX && absDx > absDy * 1.15) {
        if (dx < 0) goNext();
        else goPrev();
      } else if (absDx < TAP_MAX_MOVEMENT_PX && absDy < TAP_MAX_MOVEMENT_PX && elapsedMs < TAP_MAX_DURATION_MS) {
        lastHandledTouchTapAtRef.current = Date.now();
        setControlsVisible((prev) => !prev);
      }
    },
    [goNext, goPrev, resetGesturePreview]
  );

  const handleReaderTouchStart = useCallback((event: TouchEvent | ReactTouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, []);

  const handleReaderTouchEnd = useCallback(
    (event: TouchEvent | ReactTouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      completeReaderGesture(touch.clientX, touch.clientY);
    },
    [completeReaderGesture]
  );

  const handleReaderContentClick = useCallback((event: MouseEvent) => {
    if (viewModeRef.current !== "scroll") return;
    if (Date.now() - lastHandledTouchTapAtRef.current < 600) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button, input, select, textarea")) return;
    setControlsVisible((visible) => !visible);
  }, []);

  const handleMobilePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    touchStartRef.current = { x: event.clientX, y: event.clientY, time: Date.now() };
  }, []);

  const handleMobilePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start || !event.isPrimary) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 5 || Math.abs(dx) <= Math.abs(dy)) return;
    event.preventDefault();
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.style.transition = "none";
    viewer.style.transform = `translateX(${Math.max(-30, Math.min(30, dx * 0.2))}px)`;
  }, []);

  const handleMobilePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      completeReaderGesture(event.clientX, event.clientY);
    },
    [completeReaderGesture]
  );

  const handleMobilePointerCancel = useCallback(() => {
    touchStartRef.current = null;
    resetGesturePreview();
  }, [resetGesturePreview]);

  useEffect(() => {
    if (!story?.epub_file || !viewerRef.current) return;
    let isMounted = true;

    const load = async () => {
      try {
        setReaderError("");
        setIsEpubLoading(true);
        isPageTurningRef.current = false;
        // Offline: read a previously-downloaded, decrypted copy straight into
        // memory instead of hitting the network at all — epub.js accepts an
        // ArrayBuffer directly and treats it as a packed archive, so no
        // openAs hint is needed for that path (only the URL form needs it,
        // since it lacks a ".epub" extension for epub.js to infer from).
        const offlineBuffer = !navigator.onLine
          ? await getDecryptedBinary(makeDownloadId(story.slug, "epub")).catch(() => null)
          : null;
        const book = offlineBuffer
          ? Epub(offlineBuffer)
          : Epub(`${API_BASE_URL}/stories/${story.slug}/epub-stream/`, { openAs: "epub" });
        bookRef.current = book;

        // epub.js's page-turn step size ("layout.delta") is just the container
        // width — it doesn't account for the column-gap it inserts between pages
        // unless one is given explicitly, in which case it auto-derives a gap from
        // the width instead (often 50-100+px). That gap-sized mismatch between the
        // step size and the real spacing between columns compounds with every page
        // turn within a chapter, which is exactly what shows up as the tail of the
        // current page clipped on one side and a sliver of the next page bleeding
        // in on the other. Passing an explicit gap of 0 removes the mismatch
        // entirely — the RenditionOptions type doesn't declare it, but epub.js
        // reads it via a plain object, so an untyped variable sidesteps that gap.
        const renditionOptions = {
          width: "100%",
          height: "100%",
          flow: viewMode === "scroll" ? "scrolled-doc" : "paginated",
          gap: 0,
          // Without this, epub.js shows two columns side by side on wide
          // viewports (a "spread", like a physical book opened flat). Combined
          // with gap:0 above, those two columns have no gutter between them, so
          // their text runs directly together. Forcing single-column keeps the
          // same (already page-turn-safe) layout at every screen size.
          spread: "none",
        };
        const rendition = book.renderTo(viewerRef.current!, renditionOptions);
        renditionRef.current = rendition;

        (Object.keys(READER_THEMES) as EpubThemeKey[]).forEach((name) => {
          rendition.themes.register(name, buildEpubThemeCss(name));
        });
        // EPUB content renders inside a sandboxed iframe with its own document, so
        // the Google Fonts <link> in index.html's <head> never reaches it. Loading
        // it under the "default" theme injects it into every rendered content
        // regardless of which light/sepia/dark theme is currently selected — see
        // Themes.inject(), which always includes "default" alongside the current one.
        rendition.themes.registerUrl("default", READER_FONTS_STYLESHEET_URL);
        rendition.themes.select(theme);
        rendition.themes.font(FONTS[fontFamily]?.value || "serif");
        rendition.themes.fontSize(`${fontSizePercent}%`);
        rendition.themes.override("line-height", "1.5", true);
        // if (viewMode === "scroll") {
        //   rendition.themes.override("margin-bottom", "20rem", true);
        // }
        // Many EPUBs set their own text-align: justify. Justified text has a
        // well-known browser rendering quirk in CSS multi-column layouts: the
        // last word of a fully-stretched line can render a few pixels past the
        // column's right edge (the exact amount varies with the words being
        // justified, so no fixed safety margin fully covers it). Forcing left
        // alignment sidesteps that class of overflow entirely, at the cost of a
        // ragged right edge — the same tradeoff most e-readers default to.
        rendition.themes.override("text-align", "left", true);

        const prepareReaderDocument = (doc?: Document) => {
          if (!doc) return;
          doc.documentElement.style.touchAction = "pan-y";
          if (doc.body) doc.body.style.touchAction = "pan-y";
          // iOS Safari has a long-standing quirk: it won't generate a
          // synthetic "click" event at all on a generic element (a <div>,
          // <body>, plain text) unless that element looks "clickable" —
          // specifically, has a cursor:pointer style (or a native onclick=
          // attribute). Without this, the click listener attached below
          // simply never fires on iOS, even though the exact same setup
          // works fine on Android/desktop — which is why Scroll mode's
          // tap-to-toggle was iOS-specific.
          doc.documentElement.style.cursor = "pointer";
          if (doc.body) doc.body.style.cursor = "pointer";
          if (directTouchDocumentsRef.current.has(doc)) return;

          directTouchDocumentsRef.current.add(doc);
          doc.addEventListener("touchstart", handleReaderTouchStart, { passive: true, capture: true });
          doc.addEventListener("touchend", handleReaderTouchEnd, { passive: true, capture: true });
          doc.addEventListener(
            "touchcancel",
            () => {
              touchStartRef.current = null;
            },
            { passive: true, capture: true }
          );
          // Covers the case where the content document's own body/html is
          // what actually scrolls in Scroll mode (rather than an epub.js-
          // managed ancestor in the parent document) — see
          // reportScrollLocation's comment above.
          doc.addEventListener("scroll", reportScrollLocation, { passive: true, capture: true });
          // Attached directly (like the touch listeners above) rather than
          // relying solely on epub.js's own click-forwarding chain
          // (Contents -> passEvents -> Rendition.emit("click", ...)) — that
          // chain is what Scroll mode's tap-to-toggle depended on
          // exclusively, and it wasn't firing reliably, leaving Scroll mode
          // taps completely dead while Page mode (which uses its own
          // dedicated pointer-event overlay, not this chain at all) kept
          // working fine.
          doc.addEventListener("click", handleReaderContentClick, { capture: true });
        };

        // The content hook runs as each iframe's Contents object is created,
        // which is earlier and more dependable on iOS than querying the iframe
        // document after the view reports that it has rendered.
        rendition.hooks.content.register((contents: Contents) => {
          prepareReaderDocument(contents.document);
        });

        // Attached before display() so the initial relocation (e.g. restoring a
        // saved position on reload) is captured — locations aren't generated yet
        // at that point, so percentage is computed once more after generate().
        rendition.on("relocated", (location: EpubLocation) => {
          const cfi = location.start.cfi;
          lastCfiRef.current = cfi;
          localStorage.setItem(storageKey, cfi);
          setCurrentPage(location.start.displayed?.page || 1);
          setSectionPageCount(location.start.displayed?.total || 1);

          const reportedPercentage = location.start.percentage;
          if (Number.isFinite(reportedPercentage) || book.locations.length()) {
            const percentage = Number.isFinite(reportedPercentage)
              ? reportedPercentage
              : book.locations.percentageFromCfi(cfi);
            setProgressPercent(Math.round(percentage * 100));
            queueSaveFileProgress(cfi, percentage);
          }
        });

        // EPUB.js forwards DOM events from every current and future content
        // iframe through the rendition. Listening here avoids relying on
        // Safari exposing an iframe Document at the exact moment "rendered"
        // fires, which is unreliable on iOS and previously left the reader
        // with no working tap/swipe controls.
        rendition.on("touchstart", handleReaderTouchStart);
        rendition.on("touchend", handleReaderTouchEnd);
        // Click is deliberately *not* also registered here via
        // rendition.on("click", ...) — it's now attached directly in
        // prepareReaderDocument above instead. Registering it both ways
        // would double-fire (once from the direct listener, once forwarded
        // through epub.js) with no guard against it the way touch has via
        // touchStartRef, which would toggle the chrome on then immediately
        // back off — looking exactly like tapping did nothing at all.

        // Tell mobile browsers that vertical gestures remain native while
        // horizontal gestures belong to the reader. This prevents iOS Safari
        // from claiming ordinary page-turn swipes as iframe panning.
        rendition.on("rendered", (_section: unknown, view: { document?: Document; contents?: { document?: Document } }) => {
          const doc = view?.document || view?.contents?.document;
          // Keep the rendered fallback for EPUBs/managers that bypass the
          // content hook. The WeakSet prevents duplicate native listeners.
          prepareReaderDocument(doc);
        });

        // A logged-in reader's account progress takes priority over
        // localStorage (which only reflects this one browser/device) — but
        // localStorage is still the fallback for anonymous readers, or if the
        // account fetch fails (offline, no saved progress yet, etc).
        let savedCfi = localStorage.getItem(storageKey) || undefined;
        if (isAuthenticated) {
          try {
            const remoteProgress = await storyApi.getFileReadingProgress(story.slug, "epub");
            if (remoteProgress.position) {
              savedCfi = remoteProgress.position;
            }
          } catch {
            // No saved progress yet (404) or request failed — localStorage
            // fallback above already covers this.
          }
        }
        if (!isMounted) return;
        await rendition.display(savedCfi);
        if (!isMounted) return;
        requestAnimationFrame(() => requestAnimationFrame(() => snapPaginationHeight(savedCfi)));

        await book.ready;
        // Fine-grained locations keep whole-book progress responsive on every
        // reflowed page. The previous 1,024-character interval made multiple
        // visual pages share one location, so the percentage appeared stuck.
        await book.locations.generate(150);
        if (!isMounted) return;

        if (lastCfiRef.current) {
          const percentage = book.locations.percentageFromCfi(lastCfiRef.current);
          setProgressPercent(Math.round(percentage * 100));
          queueSaveFileProgress(lastCfiRef.current, percentage);
        }

        const nav = await book.loaded.navigation;
        if (!isMounted) return;
        setToc(nav.toc);
      } catch {
        if (isMounted) setReaderError("Could not load EPUB in reader.");
      } finally {
        if (isMounted) setIsEpubLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
      renditionRef.current = null;
      bookRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.epub_file, story?.slug, storageKey]);

  useEffect(() => {
    const viewerEl = viewerRef.current;
    if (!viewerEl) return;

    // Because renderTo() is given percentage width/height, epub.js only re-measures
    // its internal pagination on the browser's own "resize" event — it has no way to
    // notice the container's own pixel size settling after mount (fonts loading,
    // sibling elements changing height, etc). When that happens unnoticed, epub.js
    // paginates against a stale, taller size than what's actually visible, so the
    // last line of a page ends up clipped by the container's overflow. Watching the
    // container directly keeps pagination in sync with its real, current size.
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(snapPaginationHeight, 150);
    });
    observer.observe(viewerEl);

    return () => {
      clearTimeout(resizeTimeout);
      observer.disconnect();
    };
  }, []);

  // Covers the case where the real scroll surface in Scroll mode is an
  // epub.js-managed element *within* viewerRef (in this, the parent,
  // document) rather than the content iframe's own document — the other
  // call site, inside prepareReaderDocument, covers that second
  // possibility. "scroll" doesn't bubble, but a capture-phase listener on
  // an ancestor still receives it from any scrollable descendant, so this
  // doesn't need to know exactly which nested element epub.js is using.
  useEffect(() => {
    const viewerEl = viewerRef.current;
    if (!viewerEl) return;
    viewerEl.addEventListener("scroll", reportScrollLocation, { passive: true, capture: true });
    return () => viewerEl.removeEventListener("scroll", reportScrollLocation, { capture: true });
  }, [reportScrollLocation]);

  useEffect(() => {
    renditionRef.current?.themes.select(theme);
  }, [theme]);

  useEffect(() => {
    pageAnimationRef.current = pageAnimation;
    localStorage.setItem("epub-reader-page-animation", pageAnimation);
  }, [pageAnimation]);

  useEffect(() => {
    viewModeRef.current = viewMode;
    localStorage.setItem("epub-reader-view-mode", viewMode);
    const rendition = renditionRef.current;
    if (!rendition) return;
    const currentCfi = lastCfiRef.current || undefined;
    const themes = rendition.themes as typeof rendition.themes & { removeOverride: (name: string) => void };
    if (viewMode === "scroll") {
      setControlsVisible(true);
      themes.override("padding-bottom", "3rem", true);
    } else {
      themes.removeOverride("padding-bottom");
    }
    rendition.flow(viewMode === "scroll" ? "scrolled-doc" : "paginated");
    requestAnimationFrame(() => {
      rendition.display(currentCfi).then(() => {
        if (viewMode === "page") {
          requestAnimationFrame(() => snapPaginationHeight(currentCfi));
        }
      }).catch(() => setReaderError("Could not switch the EPUB view mode."));
    });
  }, [viewMode]);

  useEffect(() => {
    renditionRef.current?.themes.font(FONTS[fontFamily]?.value || "serif");
  }, [fontFamily]);

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSizePercent}%`);
    requestAnimationFrame(() => requestAnimationFrame(snapPaginationHeight));
  }, [fontSizePercent]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!renditionRef.current) return;
      if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // The reader panel is fixed at every resolution, so lock the document body
  // and let EPUB.js own the scrolling surface in Scroll mode.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const viewerEl = viewerRef.current;
    if (!viewerEl) return;

    // The EPUB content renders inside an <iframe> — a separate document — so a
    // click there never reaches the outer document's event listeners. Radix's
    // Popover only listens for outside clicks on the top-level document, so
    // clicking the actual book content (the largest "outside" area on this page)
    // would otherwise leave the popover stuck open. Listening directly on each
    // rendered iframe's own document closes it in that case too.
    const close = () => setIsSettingsOpen(false);
    const iframes = Array.from(viewerEl.querySelectorAll("iframe"));
    iframes.forEach((iframe) => {
      iframe.contentDocument?.addEventListener("pointerdown", close);
    });

    return () => {
      iframes.forEach((iframe) => {
        iframe.contentDocument?.removeEventListener("pointerdown", close);
      });
    };
  }, [isSettingsOpen]);

  // iOS Safari (specifically iPhone — iPad is different) doesn't support the
  // Fullscreen API for arbitrary elements at all, only for <video>, so
  // requestFullscreen() always fails there. isFullscreen is toggled
  // optimistically up front, driving the same CSS full-viewport layout either
  // way, so the reader still gets an immersive fallback on iOS even though
  // real OS-level fullscreen (hiding Safari's own chrome) isn't possible.
  const toggleFullscreen = async () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    try {
      if (next && document.fullscreenEnabled && readerContainerRef.current) {
        await readerContainerRef.current.requestFullscreen();
      } else if (!next && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // No-op: the CSS-driven layout above already applied, which is the
      // best available experience on platforms without real fullscreen.
    }
  };

  const goToTocItem = (href: string) => {
    renditionRef.current?.display(href);
    setIsTocOpen(false);
  };

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isError || !story) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-sm text-red-500">Unable to load story EPUB.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!story.epub_file) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-sm text-muted-foreground">This story does not have an EPUB file.</p>
        <Link to={backHref}>
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Story
          </Button>
        </Link>
      </div>
    );
  }

  // Keeping one fixed-size panel at every resolution means toggling chrome
  // never forces EPUB.js to repaginate or shifts the reader's current CFI.
  const readerPanelClassName = [
    "fixed inset-y-0 left-1/2 z-0 !mt-0 h-[100dvh] w-full -translate-x-1/2 overflow-hidden border-0 px-3",
    isFullscreen ? "max-w-none" : "max-w-6xl",
  ].join(" ");

  return (
    <main className="min-h-screen bg-background px-2 py-2 sm:px-4 sm:py-4">
      <Seo
        title={`${story.title} — EPUB | WorldStories`}
        description={`Read the EPUB edition of ${story.title} on WorldStories.`}
        path={`/story/${slug}/epub`}
        noIndex
      />
      <div
        ref={readerContainerRef}
        className={`mx-auto max-w-6xl space-y-3 ${isFullscreen ? "h-screen max-w-none bg-background p-2 sm:p-3" : ""}`}
      >
        {/* Floats over the always-full-viewport reader panel below
            rather than sharing space with it — sliding in/out instead of
            resizing anything means toggling this never changes the reader's
            own box size, so it never triggers epub.js to re-paginate and
            shift the visible page. Slides (translate) rather than fades
            (opacity): this panel's glass background is translucent, so
            fading its opacity mid-transition let the reader text underneath
            and this bar's own text show through each other at the same
            time — a "double exposure" look. Sliding keeps it at full
            opacity/blur throughout; only its position animates, so whatever
            it moves over is cleanly covered the instant it arrives, never
            partially. */}
        <div
          className={`fixed inset-x-0 top-0 z-50 !mt-0 px-2 pt-2 transition-transform duration-300 ease-in-out ${
            controlsVisible ? "translate-y-0" : "-translate-y-full pointer-events-none"
          }`}
        >
        <div
          // Adding the site's own "dark" class (rather than hand-picking
          // text/icon colors) re-scopes every CSS-variable-driven color
          // this bar's contents use — bg-card, text-muted-foreground,
          // button variants, borders — to the dark palette in one go, so
          // contrast stays correct without touching each child individually.
          // Only needed for the epub reader's own "dark" theme: sepia/light
          // both have light backgrounds close enough to the site's default
          // light palette that the normal (light) colors already read fine.
          // text-foreground is required alongside "dark", not implied by
          // it: redefining the --foreground CSS variable doesn't
          // retroactively change already-inherited `color` anywhere below
          // — the title/buttons here never set their own color, so without
          // an explicit text-foreground *at this scope* to re-read the
          // (now-corrected) variable, they'd keep inheriting the site's
          // outer light-mode black straight through.
          className={`mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-xl border px-2 py-2 text-foreground shadow-lg sm:px-3 sm:py-3 ${READER_GLASS_PANEL_CLASS} ${
            theme === "dark" ? "dark" : ""
          }`}
        >
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-xl">{story.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsTocOpen(true)} className="h-8 px-2 sm:h-9 sm:px-3">
              <List className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Contents</span>
            </Button>
            <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:h-9 sm:px-3">
                  <Settings className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                container={isFullscreen ? readerContainerRef.current ?? undefined : undefined}
                className="w-72 space-y-4"
              >
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">View</p>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "page" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("page")}
                      aria-label="Page view"
                      title="Page view"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "scroll" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("scroll")}
                      aria-label="Scroll view"
                      title="Scroll view"
                    >
                      <ScrollText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Page animation</p>
                  <div className="grid grid-cols-5 gap-2">
                    {PAGE_ANIMATION_OPTIONS.map((option) => {
                      const Icon = PAGE_ANIMATION_ICONS[option.value];
                      return (
                        <Button
                          key={option.value}
                          variant={pageAnimation === option.value ? "default" : "outline"}
                          size="icon"
                          disabled={viewMode !== "page"}
                          onClick={() => setPageAnimation(option.value)}
                          aria-label={`${option.label} page animation`}
                          title={option.label}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Theme</p>
                  <div className="flex items-center gap-1">
                    {(Object.keys(READER_THEMES) as EpubThemeKey[]).map((key) => {
                      const Icon = READER_THEMES[key].icon;
                      return (
                        <Button
                          key={key}
                          variant={theme === key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTheme(key)}
                          className="h-8 px-2"
                          aria-label={READER_THEMES[key].label}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Font Size</p>
                  <div className="flex items-center gap-1">
                    <Type className="h-3.5 w-3.5 text-muted-foreground" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFontSizePercent((prev) => Math.max(70, prev - 10))}
                      className="h-8 px-2 text-xs"
                    >
                      A-
                    </Button>
                    <span className="w-10 text-center text-xs text-muted-foreground">{fontSizePercent}%</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFontSizePercent((prev) => Math.min(200, prev + 10))}
                      className="h-8 px-2 text-xs"
                    >
                      A+
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Font</p>
                  <select
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as EpubFontKey)}
                  >
                    {READER_FONT_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {FONTS[key]?.label || key}
                      </option>
                    ))}
                  </select>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={toggleFullscreen} className="h-8 px-2 sm:h-9 sm:px-3">
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </Button>
            {!isFullscreen && (
              <Link to={backHref}>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:h-9 sm:px-3">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
        </div>

        {readerError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">
            {readerError}
          </div>
        )}

        <div
          className={readerPanelClassName}
          // Matches the currently-selected epub theme instead of the site's
          // generic card background — otherwise the padding around the
          // iframe (where the actual themed page background lives) shows as
          // a mismatched white/card-colored border around the content.
          style={{ backgroundColor: READER_THEMES[theme].background }}
        >
          {isEpubLoading && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
              style={{ backgroundColor: READER_THEMES[theme].background }}
              role="status"
              aria-live="polite"
            >
              <div className="relative flex h-14 w-20 items-center justify-center [perspective:500px]">
                <div className="absolute inset-y-0 left-0 w-1/2 rounded-l border border-primary/30 bg-card shadow-sm" />
                <div className="absolute inset-y-0 right-0 w-1/2 rounded-r border border-primary/30 bg-card shadow-sm" />
                <div className="absolute inset-y-0 left-1/2 w-1/2 origin-left animate-page-turn rounded-r border border-primary/40 bg-primary/40 [backface-visibility:hidden]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: READER_THEMES[theme].color }}>
                  Loading {story.title}
                </p>
                <p className="mt-1 text-xs opacity-60" style={{ color: READER_THEMES[theme].color }}>
                  Preparing your book…
                </p>
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            </div>
          )}
          {/* The padding lives on this outer wrapper, not on viewerRef itself —
              snapPaginationHeight() measures viewerRef.clientWidth and passes it
              straight to epub.js, and clientWidth includes an element's own
              padding. Padding here instead just shrinks viewerRef's available
              box, so that measurement stays accurate with no subtraction needed. */}
          <div ref={viewerRef} className="h-full w-full" />
          {!isEpubLoading && viewMode === "page" && (
            <div
              className="absolute inset-0 z-10"
              style={{ touchAction: "none" }}
              onPointerDown={handleMobilePointerDown}
              onPointerMove={handleMobilePointerMove}
              onPointerUp={handleMobilePointerUp}
              onPointerCancel={handleMobilePointerCancel}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Compact reading-progress readout shown only while
            the header/footer chrome is hidden, so there's still some
            orientation without bringing the full toolbar back. Slides in/out
            inverse to the footer bar below, using the same translate-based
            reveal (not a fade) to avoid the translucent-panel "double
            exposure" a fade causes over visible reader text — same reasoning
            as the header/footer comments above. */}
        <div
          className={`pointer-events-none fixed bottom-2 right-2 z-40 transition-transform duration-300 ease-in-out ${
            controlsVisible ? "translate-y-10" : "translate-y-0"
          }`}
        >
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground shadow-sm ${READER_GLASS_PANEL_CLASS} ${
              theme === "dark" ? "dark" : ""
            }`}
          >
            {progressPercent}%
          </span>
        </div>

        {/* Same floating-overlay treatment as the header above, and for the
            same reason: sliding rather than resizing keeps the reader
            panel's box permanently constant so toggling never re-paginates
            it, and sliding rather than fading avoids the "double exposure"
            look a translucent glass panel gets when its opacity animates
            over visible reader text (see the header's comment above). */}
        <div
          className={`fixed inset-x-0 bottom-0 z-50 !mt-0 px-3 pb-2 transition-transform duration-300 ease-in-out ${
            controlsVisible ? "translate-y-0" : "translate-y-full pointer-events-none"
          }`}
        >
        <div
          className={`mx-auto grid max-w-6xl grid-cols-3 items-center rounded-xl border px-3 py-2 text-foreground shadow-lg ${READER_GLASS_PANEL_CLASS} ${
            theme === "dark" ? "dark" : ""
          }`}
        >
          <div className="flex justify-start">
            <Button variant="outline" size="sm" onClick={goPrev} className="h-8 px-3">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <p className="whitespace-nowrap text-center text-xs text-muted-foreground">
            {viewMode === "page" && `Page ${currentPage} / ${sectionPageCount} · `}
            {progressPercent}%
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={goNext} className="h-8 px-3">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      </div>

      <Sheet open={isTocOpen} onOpenChange={setIsTocOpen}>
        <SheetContent
          side="left"
          className="flex w-80 flex-col"
          container={isFullscreen ? readerContainerRef.current ?? undefined : undefined}
        >
          <SheetHeader>
            <SheetTitle>Contents</SheetTitle>
          </SheetHeader>
          <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
            {toc.length === 0 ? (
              <p className="text-sm text-muted-foreground">No table of contents available.</p>
            ) : (
              toc.map((item) => (
                <button
                  key={item.id || item.href}
                  type="button"
                  onClick={() => goToTocItem(item.href)}
                  className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  {item.label?.trim() || item.href}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default EpubReader;
