import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
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
  Loader2,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  Moon,
  Settings,
  ScrollText,
  Sun,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { data, Link, useLocation, useNavigate, useParams } from "react-router";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/PdfReader";

// Fetched here purely to supply meta() with real data server-side — the
// component below still fetches independently via useStory().
export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getStory(params.slug!);
  } catch {
    return data(null, { status: 404 });
  }
}

// Always noIndex: this is a reading UI, not a page anyone should land on
// from search — the story's own page is the indexable surface.
export function meta({ data: story, params }: Route.MetaArgs) {
  return buildMeta({
    title: story ? `${story.title} — PDF | WorldStories` : "PDF Not Found | WorldStories",
    description: story
      ? `Read the PDF edition of ${story.title} on WorldStories.`
      : "The requested PDF could not be found.",
    path: `/story/${params.slug}/pdf`,
    noIndex: true,
  });
}
import {
  getSavedPageAnimation,
  PAGE_ANIMATION_OPTIONS,
  runReaderPageAnimation,
  type PageAnimationEffect,
  type PageTurnDirection,
} from "@/lib/readerAnimations";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";

GlobalWorkerOptions.workerSrc = workerSrc;

const READER_GLASS_PANEL_CLASS =
  "border-border bg-gradient-to-br from-primary/10 to-background/100 backdrop-blur supports-[backdrop-filter]:from-primary/10 supports-[backdrop-filter]:to-background/45";

const PDF_READER_THEMES = {
  light: { label: "Light", icon: Sun, background: "#f8fafc", color: "#1a1a1a", pageFilter: "none" },
  sepia: {
    label: "Sepia",
    icon: Sun,
    background: "#eee5ce",
    color: "#5b4636",
    pageFilter: "sepia(0.38) saturate(0.82) brightness(0.96) contrast(0.94)",
  },
  dark: {
    label: "Dark",
    icon: Moon,
    background: "#111827",
    color: "#d1d5db",
    pageFilter: "invert(0.9) hue-rotate(180deg) brightness(0.86) contrast(0.92)",
  },
} as const;
type PdfThemeKey = keyof typeof PDF_READER_THEMES;
type PdfViewMode = "page" | "scroll";
const PAGE_ANIMATION_ICONS = {
  none: Ban,
  fade: Layers,
  slide: MoveHorizontal,
  zoom: ZoomIn,
  flip: GalleryHorizontalEnd,
} satisfies Record<PageAnimationEffect, typeof Ban>;

interface ScrollPdfPageProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  pageFilter: string;
}

const ScrollPdfPage = ({ pdfDoc, pageNumber, zoom, pageFilter }: ScrollPdfPageProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  // The canvas's width/height attributes now drive a higher-resolution
  // backing store (see the DPR comment below), so its default/intrinsic CSS
  // size would inflate along with it — harmless where the mobile CSS below
  // sizes it by percentage (which ignores intrinsic size entirely), but
  // wrong at the md: breakpoint, which sizes it by that same intrinsic
  // width. Tracking the *unscaled* viewport size here lets the md: rule
  // pin the display size explicitly instead of trusting the (now inflated)
  // attribute.
  const [nativeSize, setNativeSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || shouldRender) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender || !canvasRef.current) return;
    let canceled = false;
    let renderTask: RenderTask | null = null;

    const render = async () => {
      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (canceled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;
        setNativeSize({ width: viewport.width, height: viewport.height });
        // Sizing the backing store to viewport.width/height 1:1 renders at
        // only 1 device pixel per CSS pixel — fine on old 1x displays, but
        // every modern phone/laptop screen is 2x-3x, so the browser then
        // stretches that single-resolution bitmap to fill the (CSS-sized,
        // unchanged) canvas element, which is what reads as dim/blurred
        // text despite the source PDF being high quality. Rendering at
        // devicePixelRatio and scaling the draw calls down via `transform`
        // keeps the on-screen size identical (nativeSize/the CSS below pin
        // display size independently of this) while giving native displays
        // a full-resolution bitmap to show instead of an upscaled one.
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        });
        await renderTask.promise;
      } catch {
        // Keep the placeholder in place; another nearby-page/zoom render can
        // still proceed even if one PDF page is malformed.
      } finally {
        if (!canceled) setIsRendering(false);
      }
    };

    render();
    return () => {
      canceled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNumber, shouldRender, zoom]);

  return (
    <div
      ref={wrapperRef}
      data-pdf-page={pageNumber}
      className="relative flex min-h-[60vh] scroll-mt-4 items-start justify-center"
    >
      {isRendering && (
        <div className="absolute top-4 z-10 flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Page {pageNumber}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="block h-auto w-[var(--pdf-mobile-width)] max-w-none rounded-md bg-white shadow-xl transition-[filter] duration-200 md:h-[var(--pdf-native-height)] md:w-[var(--pdf-native-width)] md:max-w-full"
        style={
          {
            "--pdf-mobile-width": `${zoom * 100}%`,
            "--pdf-native-width": nativeSize ? `${nativeSize.width}px` : "auto",
            "--pdf-native-height": nativeSize ? `${nativeSize.height}px` : "auto",
            filter: pageFilter,
          } as CSSProperties
        }
        aria-label={`PDF page ${pageNumber}`}
      />
    </div>
  );
};

const PdfReader = ({ loaderData }: Route.ComponentProps) => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const location = useLocation();
  // Coming from the Downloads page should return there, not to the story
  // page — the entry point passes this via navigation state (see
  // ProfileDownloadedStory.tsx).
  const backHref = (location.state as { backTo?: string } | null)?.backTo || `/story/${slug}`;
  const { data: story, isLoading, isError } = useStory(slug || "", loaderData || undefined);
  const isAuthenticated = useIsLoggedIn();
  const readerContainerRef = useRef<HTMLDivElement | null>(null);
  const pageViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const saveProgressTimerRef = useRef<number | null>(null);
  // See the matching comment in ScrollPdfPage: the canvas's width/height
  // attributes drive a devicePixelRatio-scaled backing store now, so the
  // md: breakpoint's display size is pinned from this (unscaled) size
  // instead of trusting the (now inflated) attribute's intrinsic size.
  const [nativeSize, setNativeSize] = useState<{ width: number; height: number } | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? 1.35 : 1.2
  );
  const [readerError, setReaderError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [theme, setTheme] = useState<PdfThemeKey>("light");
  const [viewMode, setViewMode] = useState<PdfViewMode>(() =>
    typeof window !== "undefined" && localStorage.getItem("pdf-reader-view-mode") === "scroll"
      ? "scroll"
      : "page"
  );
  const [pageAnimation, setPageAnimation] = useState<PageAnimationEffect>(() =>
    getSavedPageAnimation("pdf-reader-page-animation")
  );
  const pageAnimationRef = useRef<PageAnimationEffect>(pageAnimation);
  const pendingAnimationDirectionRef = useRef<PageTurnDirection | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  useContentSessionAnalytics("reading_session", slug, true, {
    format: "pdf",
    view_mode: viewMode,
  });
  const touchStartRef = useRef<{ x: number; y: number; time: number; scrollLeft: number } | null>(null);
  const lastTapAtRef = useRef(0);
  const singleTapTimerRef = useRef<number | null>(null);
  const lastNonFitZoomRef = useRef(zoom === 1 ? 1.35 : zoom);

  const storageKey = useMemo(() => {
    if (!story?.slug) return "";
    return `pdf-reader-progress-${story.slug}`;
  }, [story?.slug]);

  useEffect(() => {
    if (!story?.pdf_file) return;
    let isMounted = true;

    const loadPdf = async () => {
      try {
        setReaderError("");
        setIsPdfLoading(true);
        // Offline: read a previously-downloaded, decrypted copy straight into
        // memory instead of hitting the network at all.
        const offlineBuffer = !navigator.onLine
          ? await getDecryptedBinary(makeDownloadId(story.slug, "pdf")).catch(() => null)
          : null;
        const loadingTask = offlineBuffer
          ? getDocument({ data: offlineBuffer })
          : getDocument({ url: `${API_BASE_URL}/stories/${story.slug}/pdf-stream/` });
        const doc = await loadingTask.promise;
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);

        // A logged-in reader's account progress takes priority over
        // localStorage (which only reflects this one browser/device) — but
        // localStorage is still the fallback for anonymous readers, or if the
        // account fetch fails (offline, no saved progress yet, etc).
        let savedPageRaw = localStorage.getItem(storageKey);
        if (isAuthenticated) {
          try {
            const remoteProgress = await storyApi.getFileReadingProgress(story.slug, "pdf");
            if (remoteProgress.position) {
              savedPageRaw = remoteProgress.position;
            }
          } catch {
            // No saved progress yet (404) or request failed — localStorage
            // fallback above already covers this.
          }
        }
        if (!isMounted) return;

        const savedPage = Number(savedPageRaw || "1");
        const safePage = Number.isFinite(savedPage)
          ? Math.max(1, Math.min(savedPage, doc.numPages))
          : 1;
        setPageNumber(safePage);
      } catch {
        if (!isMounted) return;
        setReaderError("Could not load PDF in reader.");
      } finally {
        if (isMounted) {
          setIsPdfLoading(false);
        }
      }
    };

    loadPdf();
    return () => {
      isMounted = false;
    };
  }, [story?.pdf_file, story?.slug, storageKey, isAuthenticated]);

  useEffect(() => {
    if (viewMode !== "page" || !pdfDoc || !canvasRef.current) return;
    let canceled = false;
    let renderTask: RenderTask | null = null;

    const renderPage = async () => {
      try {
        setIsPageRendering(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (canceled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;
        setNativeSize({ width: viewport.width, height: viewport.height });
        // Sizing the backing store to viewport.width/height 1:1 renders at
        // only 1 device pixel per CSS pixel — fine on old 1x displays, but
        // every modern phone/laptop screen is 2x-3x, so the browser then
        // stretches that single-resolution bitmap to fill the (CSS-sized,
        // unchanged) canvas element, which is what reads as dim/blurred
        // text despite the source PDF being high quality. Rendering at
        // devicePixelRatio and scaling the draw calls down via `transform`
        // keeps the on-screen size identical (nativeSize/the CSS below pin
        // display size independently of this) while giving native displays
        // a full-resolution bitmap to show instead of an upscaled one.
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        });
        await renderTask.promise;
        const direction = pendingAnimationDirectionRef.current;
        pendingAnimationDirectionRef.current = null;
        if (!canceled && direction) {
          runReaderPageAnimation(canvas, pageAnimationRef.current, direction);
        }
      } catch {
        if (!canceled) {
          setReaderError("Could not render this page.");
        }
      } finally {
        if (!canceled) {
          setIsPageRendering(false);
        }
      }
    };

    renderPage();
    return () => {
      canceled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber, zoom, viewMode]);

  useEffect(() => {
    if (!storageKey || !pageNumber) return;
    localStorage.setItem(storageKey, String(pageNumber));
    if (story?.slug && numPages) {
      saveFileProgressLocally(story.slug, "pdf", Math.min(1, pageNumber / numPages), String(pageNumber));
    }

    // localStorage above covers anonymous readers instantly; logged-in
    // readers additionally get their position synced to their account,
    // debounced the same way StoryReader.tsx debounces chapter progress.
    if (!isAuthenticated || !story?.slug || !numPages) return;
    if (saveProgressTimerRef.current) {
      window.clearTimeout(saveProgressTimerRef.current);
    }
    saveProgressTimerRef.current = window.setTimeout(() => {
      const fraction = Math.min(1, Math.max(0, pageNumber / numPages));
      storyApi
        .saveFileReadingProgress(story.slug, "pdf", fraction, String(pageNumber))
        .catch(() => queueFileProgress(story.slug, "pdf", fraction, String(pageNumber)));
    }, 400);
  }, [storageKey, pageNumber, isAuthenticated, story?.slug, numPages]);

  const goPrev = useCallback(() => {
    const target = Math.max(1, pageNumber - 1);
    if (target === pageNumber) return;
    if (viewMode === "page") pendingAnimationDirectionRef.current = "prev";
    setPageNumber(target);
    if (viewMode === "scroll") {
      pageViewportRef.current
        ?.querySelector<HTMLElement>(`[data-pdf-page="${target}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pageNumber, viewMode]);

  const goNext = useCallback(() => {
    const target = Math.min(numPages, pageNumber + 1);
    if (target === pageNumber) return;
    if (viewMode === "page") pendingAnimationDirectionRef.current = "next";
    setPageNumber(target);
    if (viewMode === "scroll") {
      pageViewportRef.current
        ?.querySelector<HTMLElement>(`[data-pdf-page="${target}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [numPages, pageNumber, viewMode]);

  const togglePageFit = useCallback(() => {
    setZoom((currentZoom) => {
      if (Math.abs(currentZoom - 1) < 0.01) {
        return Math.max(1.1, lastNonFitZoomRef.current);
      }
      lastNonFitZoomRef.current = currentZoom;
      return 1;
    });
  }, []);

  const handleReaderTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      scrollLeft: event.currentTarget.scrollLeft,
    };
  }, []);

  const handleReaderTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const elapsed = Date.now() - start.time;

      if (viewMode === "page" && absDx > 32 && absDx > absDy * 1.2) {
        const viewport = pageViewportRef.current;
        const maxScrollLeft = viewport ? Math.max(0, viewport.scrollWidth - viewport.clientWidth) : 0;
        const pageFitsViewport = maxScrollLeft <= 2;
        const startedAtLeftEdge = start.scrollLeft <= 2;
        const startedAtRightEdge = start.scrollLeft >= maxScrollLeft - 2;

        // A zoomed page gets the horizontal gesture first so readers can pan
        // across it. Page turning remains available once they swipe outward
        // from the corresponding edge, and works normally when the page fits.
        if (dx < 0 && (pageFitsViewport || startedAtRightEdge)) goNext();
        else if (dx > 0 && (pageFitsViewport || startedAtLeftEdge)) goPrev();
      } else if (absDx < 16 && absDy < 16 && elapsed < 700) {
        const now = Date.now();
        if (now - lastTapAtRef.current < 320) {
          event.preventDefault();
          lastTapAtRef.current = 0;
          if (singleTapTimerRef.current) {
            window.clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }
          togglePageFit();
        } else {
          lastTapAtRef.current = now;
          singleTapTimerRef.current = window.setTimeout(() => {
            setControlsVisible((visible) => !visible);
            singleTapTimerRef.current = null;
          }, 320);
        }
      }
    },
    [goNext, goPrev, togglePageFit, viewMode]
  );

  const handleReaderPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    setControlsVisible((visible) => !visible);
  }, []);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) window.clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!pdfDoc) return;
      if (event.key === "ArrowRight") {
        goNext();
      } else if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "+" || event.key === "=") {
        setZoom((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))));
      } else if (event.key === "-") {
        setZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pdfDoc, goNext, goPrev]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("pdf-reader-view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    pageAnimationRef.current = pageAnimation;
    localStorage.setItem("pdf-reader-page-animation", pageAnimation);
  }, [pageAnimation]);

  useEffect(() => {
    if (viewMode !== "scroll") return;
    const viewport = pageViewportRef.current;
    if (!viewport) return;
    let frame = 0;

    const updateVisiblePage = () => {
      frame = 0;
      const viewportTop = viewport.getBoundingClientRect().top;
      let closestPage = pageNumber;
      let closestDistance = Number.POSITIVE_INFINITY;
      viewport.querySelectorAll<HTMLElement>("[data-pdf-page]").forEach((element) => {
        const distance = Math.abs(element.getBoundingClientRect().top - viewportTop - 12);
        if (distance >= closestDistance) return;
        closestDistance = distance;
        closestPage = Number(element.dataset.pdfPage || closestPage);
      });
      setPageNumber((current) => (current === closestPage ? current : closestPage));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateVisiblePage);
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    requestAnimationFrame(updateVisiblePage);
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // pageNumber is intentionally read only to seed the closest-page search;
    // scrolling updates it without rebuilding this listener on every page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, numPages]);

  const changeViewMode = (nextMode: PdfViewMode) => {
    if (nextMode === viewMode) return;
    const currentPage = pageNumber;
    setViewMode(nextMode);
    if (nextMode === "scroll") {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          pageViewportRef.current
            ?.querySelector<HTMLElement>(`[data-pdf-page="${currentPage}"]`)
            ?.scrollIntoView({ block: "start" });
        })
      );
    } else {
      requestAnimationFrame(() => pageViewportRef.current?.scrollTo({ top: 0, left: 0 }));
    }
  };

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

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isError || !story) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-sm text-red-500">Unable to load story PDF.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!story.pdf_file) {
    return (
      <div className="container mx-auto px-4 py-10">
        <p className="text-sm text-muted-foreground">This story does not have a PDF file.</p>
        <Link to={backHref}>
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Story
          </Button>
        </Link>
      </div>
    );
  }

  const progressPercent = numPages > 0 ? Math.round((pageNumber / numPages) * 100) : 0;
  const readerPanelClassName = [
    "fixed inset-0 z-0 !mt-0 h-[100dvh] w-screen overflow-hidden rounded-none border-0",
  ].join(" ");

  return (
    <main className="min-h-screen bg-background px-2 py-2 md:px-4 md:py-4">
      <div
        ref={readerContainerRef}
        className={`mx-auto max-w-6xl space-y-3 ${isFullscreen ? "h-screen max-w-none bg-background p-2 md:p-3" : ""}`}
      >
        <div
          className={`fixed inset-x-0 top-0 z-50 !mt-0 px-2 pt-2 transition-transform duration-300 ease-in-out ${
            controlsVisible ? "translate-y-0" : "-translate-y-full pointer-events-none"
          }`}
        >
          <div
            className={`mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-xl border px-2 py-2 text-foreground shadow-lg md:px-3 md:py-3 ${READER_GLASS_PANEL_CLASS} ${
              theme === "dark" ? "dark" : ""
            }`}
          >
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold md:text-xl">{story.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2 md:h-9 md:px-3">
                    <Settings className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Settings</span>
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
                        onClick={() => changeViewMode("page")}
                        aria-label="Page view"
                        title="Page view"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "scroll" ? "default" : "outline"}
                        size="icon"
                        onClick={() => changeViewMode("scroll")}
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
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Reader theme</p>
                    <div className="flex items-center gap-1">
                      {(Object.keys(PDF_READER_THEMES) as PdfThemeKey[]).map((key) => {
                        const Icon = PDF_READER_THEMES[key].icon;
                        return (
                          <Button
                            key={key}
                            variant={theme === key ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTheme(key)}
                            className="h-8 px-2"
                            aria-label={PDF_READER_THEMES[key].label}
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Zoom</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="min-w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="px-2 text-xs" onClick={togglePageFit}>
                        {Math.abs(zoom - 1) < 0.01 ? "Restore" : "Fit"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={toggleFullscreen} className="h-8 px-2 md:h-9 md:px-3">
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Fullscreen</span>
                  </>
                )}
              </Button>
              {!isFullscreen && (
                <Link to={backHref}>
                  <Button variant="outline" size="sm" className="h-8 px-2 md:h-9 md:px-3">
                    <ArrowLeft className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Back</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div
          className={readerPanelClassName}
          style={{ backgroundColor: PDF_READER_THEMES[theme].background }}
        >
          {readerError && (
            <div className="absolute inset-x-4 top-20 z-30 rounded-md border border-red-500/30 bg-background/95 p-3 text-sm text-red-600 shadow-lg">
              {readerError}
            </div>
          )}
          {isPdfLoading && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
              style={{ color: PDF_READER_THEMES[theme].color, backgroundColor: PDF_READER_THEMES[theme].background }}
              role="status"
              aria-live="polite"
            >
              <div className="relative h-16 w-12 rounded-sm border border-primary/40 bg-white shadow-lg">
                <div className="absolute inset-x-2 top-3 h-1 rounded bg-primary/25" />
                <div className="absolute inset-x-2 top-6 h-1 rounded bg-primary/20" />
                <div className="absolute inset-x-2 top-9 h-1 rounded bg-primary/15" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">Loading {story.title}</p>
                <p className="mt-1 text-xs opacity-60">Preparing your document…</p>
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            </div>
          )}
          {viewMode === "page" && isPageRendering && !isPdfLoading && (
            <div className="pointer-events-none absolute left-1/2 top-16 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Rendering page…
            </div>
          )}
          <div
            ref={pageViewportRef}
            className={`h-full w-full overflow-auto px-3 py-16 md:px-6 md:py-20 ${
              viewMode === "page" ? "flex flex-col" : ""
            }`}
            style={{ touchAction: "manipulation" }}
            onTouchStart={handleReaderTouchStart}
            onTouchEnd={handleReaderTouchEnd}
            onPointerUp={handleReaderPointerUp}
          >
            {viewMode === "page" ? (
              <canvas
                ref={canvasRef}
                className="m-auto block h-auto w-[var(--pdf-mobile-width)] max-w-none rounded-md bg-white shadow-xl transition-[filter] duration-200 md:h-[var(--pdf-native-height)] md:w-[var(--pdf-native-width)] md:max-w-full"
                style={{
                  "--pdf-mobile-width": `${zoom * 100}%`,
                  "--pdf-native-width": nativeSize ? `${nativeSize.width}px` : "auto",
                  "--pdf-native-height": nativeSize ? `${nativeSize.height}px` : "auto",
                  filter: PDF_READER_THEMES[theme].pageFilter,
                } as CSSProperties}
              />
            ) : (
              <div className="space-y-5 pb-6">
                {pdfDoc && Array.from({ length: numPages }, (_, index) => (
                  <ScrollPdfPage
                    key={index + 1}
                    pdfDoc={pdfDoc}
                    pageNumber={index + 1}
                    zoom={zoom}
                    pageFilter={PDF_READER_THEMES[theme].pageFilter}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

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
              <Button variant="outline" size="sm" disabled={pageNumber <= 1} onClick={goPrev} className="h-8 px-3">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <p className="whitespace-nowrap text-center text-xs text-muted-foreground">
              Page {numPages > 0 ? `${pageNumber} / ${numPages}` : "- / -"} · {progressPercent}%
            </p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={numPages === 0 || pageNumber >= numPages}
                onClick={goNext}
                className="h-8 px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PdfReader;
