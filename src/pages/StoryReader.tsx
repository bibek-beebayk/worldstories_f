import FullScreenLoader from "@/components/FullScreenLoader";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useChapter } from "@/hooks/useChapter";
import { useStory } from "@/hooks/useStory";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookMarked, Heart, Moon, SlidersHorizontal, Sun, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type ReaderMode = "scroll" | "paged";
type ReaderThemeKey = "parchment" | "sepia" | "mist" | "night";
type ReaderFontKey = "literata" | "georgia" | "system" | "mono";

const THEMES: Record<
  ReaderThemeKey,
  {
    label: string;
    cardClass: string;
    proseClass: string;
  }
> = {
  parchment: {
    label: "Parchment",
    cardClass: "bg-[#f4ede0] border-[#decfb8]",
    proseClass: "prose-neutral",
  },
  sepia: {
    label: "Sepia",
    cardClass: "bg-[#efe3cf] border-[#d7c2a2]",
    proseClass: "prose-neutral",
  },
  mist: {
    label: "Mist",
    cardClass: "bg-slate-100 border-slate-300",
    proseClass: "prose-slate",
  },
  night: {
    label: "Night",
    cardClass: "bg-[#121212] border-[#2a2a2a] text-slate-100",
    proseClass: "prose-invert",
  },
};

const FONTS: Record<ReaderFontKey, { label: string; value: string }> = {
  literata: {
    label: "Literata",
    value: "\"Palatino Linotype\", \"Book Antiqua\", Palatino, serif",
  },
  georgia: {
    label: "Georgia",
    value: "Georgia, serif",
  },
  system: {
    label: "Sans",
    value: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
  },
  mono: {
    label: "Mono",
    value: "\"IBM Plex Mono\", \"Cascadia Code\", Menlo, monospace",
  },
};

const StoryReader = () => {
  const { story_slug, chapter_slug } = useParams();
  const navigate = useNavigate();

  const { data: chapter, isLoading, isError } = useChapter(story_slug, chapter_slug, "text");
  const { data: story } = useStory(story_slug);
  const isAuthenticated = Boolean(getAccessToken());

  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState<ReaderFontKey>(
    () => (localStorage.getItem("reader_font") as ReaderFontKey) || "literata"
  );
  const [mode, setMode] = useState<ReaderMode>(
    () => (localStorage.getItem("reader_mode") as ReaderMode) || "scroll"
  );
  const [theme, setTheme] = useState<ReaderThemeKey>(
    () => (localStorage.getItem("reader_theme") as ReaderThemeKey) || "parchment"
  );
  const [showControls, setShowControls] = useState(false);

  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageHeight, setPageHeight] = useState(800);
  const [liveProgress, setLiveProgress] = useState(0);

  const hiddenRef = useRef<HTMLDivElement>(null);
  const contentTopRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const hasRestoredRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const { data: readingProgress } = useQuery({
    queryKey: ["reading-progress", story_slug],
    queryFn: () => storyApi.getReadingProgress(story_slug!),
    enabled: !!story_slug && isAuthenticated,
    retry: false,
  });

  const currentChapterIndex = useMemo(() => {
    if (!story?.chapters?.length || !chapter_slug) return -1;
    return story.chapters.findIndex((item) => item.slug === chapter_slug);
  }, [story?.chapters, chapter_slug]);

  const prevChapterSlug =
    currentChapterIndex > 0 ? story?.chapters[currentChapterIndex - 1]?.slug : undefined;
  const nextChapterSlug =
    currentChapterIndex >= 0 && currentChapterIndex < (story?.chapters.length || 0) - 1
      ? story?.chapters[currentChapterIndex + 1]?.slug
      : undefined;

  useEffect(() => {
    localStorage.setItem("reader_mode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("reader_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("reader_font", fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    const updatePageHeight = () => {
      const calculated = Math.max(520, window.innerHeight - 360);
      setPageHeight(calculated);
    };

    updatePageHeight();
    window.addEventListener("resize", updatePageHeight);
    return () => window.removeEventListener("resize", updatePageHeight);
  }, []);

  useEffect(() => {
    setLiveProgress(0);
  }, [chapter_slug]);

  useEffect(() => {
    if (!chapter?.content || mode !== "paged") return;

    setPages([]);
    setCurrentPage(0);

    const timer = window.setTimeout(() => {
      const container = hiddenRef.current;
      if (!container) return;

      container.innerHTML = chapter.content;

      const children = Array.from(container.childNodes);
      const pagesArr: string[] = [];
      let currentPageContent: Node[] = [];

      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.visibility = "hidden";
      tempDiv.style.width = container.clientWidth + "px";
      tempDiv.style.fontSize = fontSize + "px";
      tempDiv.style.lineHeight = String(lineHeight);
      document.body.appendChild(tempDiv);

      for (const child of children) {
        const clone = child.cloneNode(true);
        tempDiv.appendChild(clone);

        if (tempDiv.scrollHeight > pageHeight) {
          const pageHTML = currentPageContent
            .map((n) =>
              n.nodeType === Node.ELEMENT_NODE
                ? (n as Element).outerHTML
                : n.textContent ?? ""
            )
            .join("");

          pagesArr.push(pageHTML);

          tempDiv.innerHTML = "";
          currentPageContent = [clone];
          tempDiv.appendChild(clone);
        } else {
          currentPageContent.push(clone);
        }
      }

      if (currentPageContent.length > 0) {
        const lastPageHTML = currentPageContent
          .map((n) =>
            n.nodeType === Node.ELEMENT_NODE
              ? (n as Element).outerHTML
              : n.textContent ?? ""
          )
          .join("");
        pagesArr.push(lastPageHTML);
      }

      document.body.removeChild(tempDiv);
      setPages(pagesArr);
    }, 50);

    return () => window.clearTimeout(timer);
  }, [chapter, fontSize, mode, lineHeight, pageHeight]);

  useEffect(() => {
    if (mode !== "paged") return;
    if (contentTopRef.current) {
      contentTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPage, mode]);

  useEffect(() => {
    hasRestoredRef.current = false;
  }, [chapter_slug, mode]);

  const queueSaveProgress = (progress: number) => {
    if (!isAuthenticated || !story_slug || !chapter_slug) return;
    const normalized = Math.min(1, Math.max(0, progress));
    setLiveProgress(normalized);

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      storyApi.saveReadingProgress(story_slug, chapter_slug, normalized).catch(() => {});
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      mode !== "paged" ||
      !readingProgress ||
      readingProgress.chapter_slug !== chapter_slug ||
      pages.length === 0 ||
      hasRestoredRef.current
    ) {
      return;
    }

    const targetPage = Math.max(
      0,
      Math.min(pages.length - 1, Math.round(readingProgress.progress * (pages.length - 1)))
    );
    setCurrentPage(targetPage);
    setLiveProgress(readingProgress.progress);
    hasRestoredRef.current = true;
  }, [mode, readingProgress, chapter_slug, pages.length]);

  useEffect(() => {
    if (
      mode !== "scroll" ||
      !readingProgress ||
      readingProgress.chapter_slug !== chapter_slug ||
      !chapter?.content ||
      hasRestoredRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      const content = scrollContentRef.current;
      if (!content) return;
      const rect = content.getBoundingClientRect();
      const contentTop = window.scrollY + rect.top;
      const maxScrollable = Math.max(1, content.scrollHeight - window.innerHeight);
      const targetY = contentTop + readingProgress.progress * maxScrollable;
      window.scrollTo({ top: targetY, behavior: "smooth" });
      setLiveProgress(readingProgress.progress);
      hasRestoredRef.current = true;
    }, 120);

    return () => window.clearTimeout(timer);
  }, [mode, readingProgress, chapter_slug, chapter?.content]);

  useEffect(() => {
    if (!isAuthenticated || mode !== "paged" || pages.length === 0) return;
    const progress = pages.length === 1 ? 1 : currentPage / (pages.length - 1);
    queueSaveProgress(progress);
  }, [mode, currentPage, pages.length, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || mode !== "scroll") return;

    const handleScroll = () => {
      const content = scrollContentRef.current;
      if (!content) return;
      const rect = content.getBoundingClientRect();
      const contentTop = window.scrollY + rect.top;
      const maxScrollable = Math.max(1, content.scrollHeight - window.innerHeight);
      const scrolled = Math.min(Math.max(window.scrollY - contentTop, 0), maxScrollable);
      const progress = maxScrollable === 0 ? 0 : scrolled / maxScrollable;
      queueSaveProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const initialTimer = window.setTimeout(handleScroll, 100);

    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [mode, chapter_slug, isAuthenticated]);

  if (isLoading) return <FullScreenLoader />;

  if (isError || !chapter) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Failed to load chapter.</p>
      </div>
    );
  }

  const activeTheme = THEMES[theme];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-40 border-b bg-background/90 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link to={`/story/${story_slug}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h2 className="font-semibold line-clamp-1">{chapter.title}</h2>
              <p className="text-xs text-muted-foreground">{story_slug}</p>
            </div>
          </div>

          <div />
        </div>

        {isAuthenticated ? (
          <>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round(liveProgress * 100)}%` }}
              />
            </div>

            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Chapter {chapter.order}
                {story?.chapter_count ? ` of ${story.chapter_count}` : ""}
              </span>
              <span>{Math.round(liveProgress * 100)}% complete</span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-xs text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>{" "}
            to Track progress
          </div>
        )}

      </div>

      <main className="max-w-3xl mx-auto w-full px-4 py-6">
        <Card className={`${activeTheme.cardClass}`}>
          {mode === "paged" && (
            <div className="w-full py-2 text-xs text-center italic text-muted-foreground">
              Page {currentPage + 1} / {pages.length}
            </div>
          )}

          <CardContent className="p-6">
            {mode === "scroll" ? (
              <div
                ref={scrollContentRef}
                className={`prose max-w-none leading-relaxed ${activeTheme.proseClass}`}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight,
                  fontFamily: FONTS[fontFamily].value,
                }}
                dangerouslySetInnerHTML={{ __html: chapter.content }}
              />
            ) : pages.length > 0 ? (
              <div
                ref={contentTopRef}
                className={`prose max-w-none leading-relaxed ${activeTheme.proseClass}`}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight,
                  scrollMarginTop: "280px",
                  fontFamily: FONTS[fontFamily].value,
                }}
                dangerouslySetInnerHTML={{ __html: pages[currentPage] }}
              />
            ) : (
              <p>Loading pages…</p>
            )}

            {mode === "paged" && (
              <div
                ref={hiddenRef}
                className={`prose max-w-3xl ${activeTheme.proseClass}`}
                style={{
                  position: "absolute",
                  top: "-9999px",
                  left: "-9999px",
                  opacity: 0,
                  pointerEvents: "none",
                  fontSize: `${fontSize}px`,
                  lineHeight,
                  fontFamily: FONTS[fontFamily].value,
                  width: "100%",
                }}
              />
            )}
          </CardContent>

          {mode === "paged" && pages.length > 1 && (
            <div className="m-2 mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Previous Page
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} / {pages.length}
              </span>

              <Button
                disabled={currentPage === pages.length - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next Page
              </Button>
            </div>
          )}
        </Card>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={!prevChapterSlug}
            onClick={() => prevChapterSlug && navigate(`/read/${story_slug}/${prevChapterSlug}`)}
          >
            Previous Chapter
          </Button>
          <Button
            disabled={!nextChapterSlug}
            onClick={() => nextChapterSlug && navigate(`/read/${story_slug}/${nextChapterSlug}`)}
          >
            Next Chapter
          </Button>
        </div>

        <Separator className="my-8" />
      </main>

      <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-2">
        {showControls && (
          <Card className="w-[min(92vw,360px)] border shadow-lg">
            <CardContent className="space-y-4 p-4">
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Reading Mode</div>
                <div className="flex items-center rounded-md border p-1">
                  <Button
                    variant={mode === "scroll" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setMode("scroll")}
                  >
                    Scroll
                  </Button>
                  <Button
                    variant={mode === "paged" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setMode("paged")}
                  >
                    Paged
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Text Size</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                  >
                    A-
                  </Button>
                  <span className="w-10 text-center text-xs">{fontSize}px</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFontSize((s) => Math.min(30, s + 1))}
                  >
                    A+
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Theme</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(THEMES) as ReaderThemeKey[]).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={theme === key ? "default" : "outline"}
                      onClick={() => setTheme(key)}
                      className="gap-1"
                    >
                      {key === "night" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                      {THEMES[key].label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Font</div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(FONTS) as ReaderFontKey[]).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={fontFamily === key ? "default" : "outline"}
                      onClick={() => setFontFamily(key)}
                    >
                      {FONTS[key].label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Line Height</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLineHeight((v) => Math.max(1.4, Number((v - 0.1).toFixed(1))))}
                >
                  -
                </Button>
                <span className="w-10 text-center text-xs">{lineHeight.toFixed(1)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLineHeight((v) => Math.min(2.2, Number((v + 0.1).toFixed(1))))}
                >
                  +
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <BookMarked className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setShowControls((value) => !value)}
          aria-label={showControls ? "Collapse reader controls" : "Expand reader controls"}
        >
          {showControls ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
};

export default StoryReader;
