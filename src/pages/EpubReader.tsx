import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { API_BASE_URL } from "@/api/client";
import { storyApi } from "@/api/story";
import { useStory } from "@/hooks/useStory";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  Moon,
  Settings,
  Sun,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Epub, { type Book, type Rendition } from "epubjs";
import type { NavItem } from "epubjs/types/navigation";
import Seo from "@/components/Seo";
import { FONTS } from "@/pages/StoryReader";

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
const READER_THEMES = {
  light: {
    label: "Light",
    icon: Sun,
    css: {
      "body.light": { background: "#ffffff", color: "#1a1a1a" },
      "body.light p, body.light div, body.light span, body.light li": { "text-align": "left !important" },
    },
  },
  sepia: {
    label: "Sepia",
    icon: Sun,
    css: {
      "body.sepia": { background: "#f4ecd8", color: "#5b4636" },
      "body.sepia p, body.sepia div, body.sepia span, body.sepia li": { "text-align": "left !important" },
    },
  },
  dark: {
    label: "Dark",
    icon: Moon,
    css: {
      "body.dark": { background: "#1b2230", color: "#d1d5db" },
      "body.dark p, body.dark div, body.dark span, body.dark li": { "text-align": "left !important" },
    },
  },
} as const;
type EpubThemeKey = keyof typeof READER_THEMES;

const EpubReader = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { data: story, isLoading, isError } = useStory(slug || "");
  const isAuthenticated = useIsLoggedIn();
  const readerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const lastCfiRef = useRef<string | null>(null);
  const pageTurnCountRef = useRef(0);
  const saveProgressTimerRef = useRef<number | null>(null);

  const [toc, setToc] = useState<NavItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  const [fontSizePercent, setFontSizePercent] = useState(100);
  const [fontFamily, setFontFamily] = useState<EpubFontKey>("literata");
  const [theme, setTheme] = useState<EpubThemeKey>("light");
  const [readerError, setReaderError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEpubLoading, setIsEpubLoading] = useState(false);

  const storageKey = useMemo(() => {
    if (!story?.slug) return "";
    return `epub-reader-progress-${story.slug}`;
  }, [story?.slug]);

  // localStorage remains the source of truth for anonymous readers (and as an
  // instant local fallback for logged-in ones), but logged-in readers also get
  // their position synced to their account via the API — mirrors the same
  // debounced-save pattern StoryReader.tsx uses for chapter progress.
  const queueSaveFileProgress = (cfi: string, progressFraction: number) => {
    if (!isAuthenticated || !story?.slug) return;
    if (saveProgressTimerRef.current) {
      window.clearTimeout(saveProgressTimerRef.current);
    }
    saveProgressTimerRef.current = window.setTimeout(() => {
      storyApi
        .saveFileReadingProgress(story.slug, "epub", Math.min(1, Math.max(0, progressFraction)), cfi)
        .catch(() => {});
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
  const snapPaginationHeight = (fallbackCfi?: string) => {
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

  useEffect(() => {
    if (!story?.epub_file || !viewerRef.current) return;
    let isMounted = true;

    const load = async () => {
      try {
        setReaderError("");
        setIsEpubLoading(true);
        pageTurnCountRef.current = 0;
        // The stream URL doesn't end in ".epub", so epub.js can't infer from the
        // extension that this is a packed archive (it would otherwise try to
        // fetch internal paths like "META-INF/container.xml" as if this were an
        // already-unpacked directory) — openAs forces the correct interpretation.
        const book = Epub(`${API_BASE_URL}/stories/${story.slug}/epub-stream/`, { openAs: "epub" });
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
          flow: "paginated",
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

        Object.entries(READER_THEMES).forEach(([name, config]) => {
          rendition.themes.register(name, config.css);
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
        // Many EPUBs set their own text-align: justify. Justified text has a
        // well-known browser rendering quirk in CSS multi-column layouts: the
        // last word of a fully-stretched line can render a few pixels past the
        // column's right edge (the exact amount varies with the words being
        // justified, so no fixed safety margin fully covers it). Forcing left
        // alignment sidesteps that class of overflow entirely, at the cost of a
        // ragged right edge — the same tradeoff most e-readers default to.
        rendition.themes.override("text-align", "left", true);

        // Attached before display() so the initial relocation (e.g. restoring a
        // saved position on reload) is captured — locations aren't generated yet
        // at that point, so percentage is computed once more after generate().
        rendition.on("relocated", (location: { start: { cfi: string } }) => {
          const cfi = location.start.cfi;
          lastCfiRef.current = cfi;
          localStorage.setItem(storageKey, cfi);
          if (book.locations.length()) {
            const percentage = book.locations.percentageFromCfi(cfi);
            setProgressPercent(Math.round(percentage * 100));
            setCurrentLocation(book.locations.locationFromCfi(cfi));
            queueSaveFileProgress(cfi, percentage);
          }
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
        await book.locations.generate(1024);
        if (!isMounted) return;

        setTotalLocations(book.locations.length());
        if (lastCfiRef.current) {
          const percentage = book.locations.percentageFromCfi(lastCfiRef.current);
          setProgressPercent(Math.round(percentage * 100));
          setCurrentLocation(book.locations.locationFromCfi(lastCfiRef.current));
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

  useEffect(() => {
    renditionRef.current?.themes.select(theme);
  }, [theme]);

  useEffect(() => {
    renditionRef.current?.themes.font(FONTS[fontFamily]?.value || "serif");
  }, [fontFamily]);

  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSizePercent}%`);
    requestAnimationFrame(() => requestAnimationFrame(snapPaginationHeight));
  }, [fontSizePercent]);

  // Re-displaying the CFI landed on after *every* next()/prev() call once
  // caused an intermittent bug: epub.js's moveTo() (which display() uses to
  // re-target a CFI) picks the page via Math.floor(offset.left / layout.delta)
  // — right after a page turn, that offset sits essentially exactly at the new
  // page's start, so a sub-pixel floating-point rounding artifact could floor
  // down to the *previous* page instead, snapping the view backward right
  // after it had correctly advanced ("brief glimpse of the next page, then
  // reverts to current"). But without any resync at all, the residual drift
  // that gap:0/spread:none/integer-dimensions don't fully eliminate keeps
  // compounding for as long as the reader goes without a resize or font-size
  // change (our other resync points) — small enough to take ~200+ pages to
  // become visible, but still eventually clips text. Resyncing only every 20
  // turns splits the difference: frequent enough to keep drift imperceptible,
  // infrequent enough that hitting the floor-rounding edge case is rare rather
  // than a near-guarantee on every single page turn.
  const RESYNC_EVERY_N_TURNS = 20;

  const maybeResyncAfterTurn = () => {
    pageTurnCountRef.current += 1;
    if (pageTurnCountRef.current % RESYNC_EVERY_N_TURNS === 0) {
      // Give the "relocated" event (scheduled via requestAnimationFrame inside
      // next()/prev()) a moment to fire and update lastCfiRef before resyncing.
      requestAnimationFrame(() => requestAnimationFrame(() => snapPaginationHeight()));
    }
  };

  const goNext = async () => {
    await renditionRef.current?.next();
    maybeResyncAfterTurn();
  };
  const goPrev = async () => {
    await renditionRef.current?.prev();
    maybeResyncAfterTurn();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!renditionRef.current) return;
      if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
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
        <Link to={`/story/${story.slug}`}>
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Story
          </Button>
        </Link>
      </div>
    );
  }

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
        <div className="flex items-center justify-between gap-2 rounded-xl border bg-card px-2 py-2 sm:px-3 sm:py-3">
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
              <Link to={`/story/${story.slug}`}>
                <Button variant="outline" size="sm" className="h-8 px-2 sm:h-9 sm:px-3">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {readerError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">
            {readerError}
          </div>
        )}

        {isEpubLoading && (
          <div className="flex items-center justify-center gap-2 rounded-md border bg-card p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="animate-pulse">Loading EPUB...</span>
          </div>
        )}

        <div
          className={`relative overflow-hidden rounded-xl border bg-card px-4 sm:px-6 ${
            isFullscreen ? "h-[calc(100vh-130px)]" : "h-[76vh] sm:h-[calc(100vh-200px)]"
          }`}
        >
          {/* The padding lives on this outer wrapper, not on viewerRef itself —
              snapPaginationHeight() measures viewerRef.clientWidth and passes it
              straight to epub.js, and clientWidth includes an element's own
              padding. Padding here instead just shrinks viewerRef's available
              box, so that measurement stays accurate with no subtraction needed. */}
          <div ref={viewerRef} className="h-full w-full" />
        </div>

        <div className="grid grid-cols-3 items-center rounded-xl border bg-card px-3 py-2">
          <div className="flex justify-start">
            <Button variant="outline" size="sm" onClick={goPrev} className="h-8 px-3">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <p className="whitespace-nowrap text-center text-xs text-muted-foreground">
            {totalLocations > 0 ? `Page ${currentLocation + 1} / ${totalLocations}` : "Page - / -"}
            {" · "}
            {progressPercent}%
          </p>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={goNext} className="h-8 px-3">
              <ChevronRight className="h-4 w-4" />
            </Button>
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
