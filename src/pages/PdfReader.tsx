import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/api/client";
import { storyApi } from "@/api/story";
import { useStory } from "@/hooks/useStory";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { getDecryptedBinary } from "@/hooks/useOfflineDownload";
import { makeDownloadId } from "@/lib/offlineDb";
import { queueFileProgress, saveFileProgressLocally } from "@/lib/progressSync";
import { ArrowLeft, Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Seo from "@/components/Seo";

GlobalWorkerOptions.workerSrc = workerSrc;

const PdfReader = () => {
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const saveProgressTimerRef = useRef<number | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1.2);
  const [readerError, setReaderError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isPageRendering, setIsPageRendering] = useState(false);

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
    if (!pdfDoc || !canvasRef.current) return;
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
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
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
  }, [pdfDoc, pageNumber, zoom]);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!pdfDoc) return;
      if (event.key === "ArrowRight") {
        setPageNumber((prev) => Math.min(numPages, prev + 1));
      } else if (event.key === "ArrowLeft") {
        setPageNumber((prev) => Math.max(1, prev - 1));
      } else if (event.key === "+" || event.key === "=") {
        setZoom((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))));
      } else if (event.key === "-") {
        setZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pdfDoc, numPages]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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

  return (
    <main className="min-h-screen bg-background px-2 py-2 sm:px-4 sm:py-4">
      <Seo
        title={`${story.title} — PDF | WorldStories`}
        description={`Read the PDF edition of ${story.title} on WorldStories.`}
        path={`/story/${slug}/pdf`}
        noIndex
      />
      <div ref={readerContainerRef} className={`mx-auto max-w-6xl space-y-3 ${isFullscreen ? "h-screen max-w-none bg-background p-2 sm:p-3" : ""}`}>
        <div className="flex items-center justify-between gap-2 rounded-xl border bg-card px-2 py-2 sm:px-3 sm:py-3">
          <div className="min-w-0">
            <h1 className="hidden truncate text-lg font-semibold sm:block sm:text-xl">{story.title}</h1>
            <p className="truncate text-sm font-medium sm:hidden">PDF Reader</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 px-2 sm:h-9 sm:px-3"
            >
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

        <div className={`rounded-xl border bg-card px-3 py-2 ${isFullscreen ? "sticky top-2 z-20" : ""}`}>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">{progressPercent}%</p>
        </div>

        {readerError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">
            {readerError}
          </div>
        )}

        {isPdfLoading && (
          <div className="flex items-center justify-center gap-2 rounded-md border bg-card p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="animate-pulse">Loading PDF...</span>
          </div>
        )}

        <div className={`overflow-auto rounded-xl border bg-muted/20 p-2 sm:p-4 ${isFullscreen ? "h-[calc(100vh-250px)]" : "max-h-[calc(100vh-245px)]"}`}>
          {isPageRendering && !isPdfLoading && (
            <div className="mb-2 flex items-center justify-center gap-2 rounded-md border bg-card p-2 text-center text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="animate-pulse">Rendering page...</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="mx-auto block max-w-full rounded-md bg-white shadow-sm"
          />
        </div>

        <div className="fixed right-3 top-1/2 z-30 -translate-y-1/2 rounded-xl border bg-card/95 p-2 shadow-md backdrop-blur">
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <p className="min-w-[52px] text-center text-xs text-muted-foreground">
              {Math.round(zoom * 100)}%
            </p>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="fixed bottom-2 left-2 right-2 z-30 mx-auto max-w-xs rounded-xl border bg-card/95 p-2 shadow-md backdrop-blur sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
              className="h-8 px-3"
            >
              Prev
            </Button>
            <p className="text-xs text-muted-foreground">
              Page {pageNumber} / {numPages || "-"}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={numPages === 0 || pageNumber >= numPages}
              onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
              className="h-8 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PdfReader;
