import FullScreenLoader from "@/components/FullScreenLoader";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useChapter } from "@/hooks/useChapter";
import { useStory } from "@/hooks/useStory";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Expand,
  Heart,
  Minimize,
  Moon,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type ReaderThemeKey = string;
type ReaderFontKey = string;
type TouchPointLike = { clientX: number; clientY: number };
type ReaderThemeConfig = {
  label: string;
  cardClass: string;
  proseClass: string;
  cardStyle?: CSSProperties;
  proseStyle?: CSSProperties;
  isDark?: boolean;
};
type CustomReaderTheme = {
  key: string;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  linkColor: string;
  isDark: boolean;
};

const THEMES: Record<string, ReaderThemeConfig> = {
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
    cardClass: "bg-[#1b2230] border-[#303a4d] text-slate-300",
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
  times: {
    label: "Times",
    value: "\"Times New Roman\", Times, serif",
  },
  garamond: {
    label: "Garamond",
    value: "Garamond, \"Times New Roman\", serif",
  },
  palatino: {
    label: "Palatino",
    value: "Palatino, \"Palatino Linotype\", \"Book Antiqua\", serif",
  },
  merriweather: {
    label: "Merriweather",
    value: "\"Merriweather\", Georgia, serif",
  },
  baskerville: {
    label: "Baskerville",
    value: "Baskerville, \"Times New Roman\", serif",
  },
  charter: {
    label: "Charter",
    value: "Charter, Cambria, serif",
  },
  cambria: {
    label: "Cambria",
    value: "Cambria, \"Times New Roman\", serif",
  },
  helvetica: {
    label: "Helvetica",
    value: "\"Helvetica Neue\", Helvetica, Arial, sans-serif",
  },
  caveat: {
    label: "Caveat",
    value: "\"Caveat\", \"Comic Sans MS\", cursive",
  },
  dancing_script: {
    label: "Dancing Script",
    value: "\"Dancing Script\", \"Brush Script MT\", cursive",
  },
  patrick_hand: {
    label: "Patrick Hand",
    value: "\"Patrick Hand\", \"Segoe Print\", cursive",
  },
  indie_flower: {
    label: "Indie Flower",
    value: "\"Indie Flower\", \"Comic Sans MS\", cursive",
  },
  shadows_into_light: {
    label: "Shadows Into Light",
    value: "\"Shadows Into Light\", \"Segoe Print\", cursive",
  },
  trebuchet: {
    label: "Trebuchet",
    value: "\"Trebuchet MS\", Tahoma, sans-serif",
  },
  open_dyslexic: {
    label: "OpenDyslexic",
    value: "\"OpenDyslexic\", \"Comic Sans MS\", sans-serif",
  },
  system: {
    label: "Sans",
    value: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif",
  },
  verdana: {
    label: "Verdana",
    value: "Verdana, Geneva, sans-serif",
  },
  tahoma: {
    label: "Tahoma",
    value: "Tahoma, \"Trebuchet MS\", sans-serif",
  },
  mono: {
    label: "Mono",
    value: "\"IBM Plex Mono\", \"Cascadia Code\", Menlo, monospace",
  },
  jetbrains_mono: {
    label: "JetBrains Mono",
    value: "\"JetBrains Mono\", \"IBM Plex Mono\", Menlo, monospace",
  },
  source_code_pro: {
    label: "Source Code Pro",
    value: "\"Source Code Pro\", \"IBM Plex Mono\", Menlo, monospace",
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
  const [theme, setTheme] = useState<ReaderThemeKey>(
    () => (localStorage.getItem("reader_theme") as ReaderThemeKey) || "parchment"
  );
  const [customThemes, setCustomThemes] = useState<CustomReaderTheme[]>(() => {
    try {
      const raw = localStorage.getItem("reader_custom_themes");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeBgColor, setNewThemeBgColor] = useState("#1f2937");
  const [newThemeBorderColor, setNewThemeBorderColor] = useState("#374151");
  const [newThemeTextColor, setNewThemeTextColor] = useState("#e5e7eb");
  const [newThemeLinkColor, setNewThemeLinkColor] = useState("#93c5fd");
  const [newThemeIsDark, setNewThemeIsDark] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [settingsButtonPos, setSettingsButtonPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 8, y: 80 };
    try {
      const raw = localStorage.getItem("reader_settings_button_pos");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          return parsed;
        }
      }
    } catch {
      // ignore invalid saved value
    }
    return { x: Math.max(8, window.innerWidth - 48), y: 80 };
  });
  const [isDraggingSettingsButton, setIsDraggingSettingsButton] = useState(false);
  const [liveProgress, setLiveProgress] = useState(0);
  const [pinchScale, setPinchScale] = useState(1);

  const scrollContentRef = useRef<HTMLDivElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const settingsModalRef = useRef<HTMLDivElement>(null);
  const hasRestoredRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);
  const suppressToggleRef = useRef(false);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartFontSizeRef = useRef<number | null>(null);
  const previousReaderModeRef = useRef(false);
  const modeSwitchSyncRef = useRef(false);
  const pendingModeSwitchProgressRef = useRef<number | null>(null);

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
    localStorage.setItem("reader_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("reader_custom_themes", JSON.stringify(customThemes));
  }, [customThemes]);

  useEffect(() => {
    localStorage.setItem("reader_font", fontFamily);
  }, [fontFamily]);

  const themeOptions = useMemo<Record<string, ReaderThemeConfig>>(() => {
    const customThemeMap: Record<string, ReaderThemeConfig> = {};

    for (const item of customThemes) {
      customThemeMap[item.key] = {
        label: item.label,
        cardClass: "border",
        proseClass: item.isDark ? "prose-invert" : "prose-slate",
        cardStyle: {
          backgroundColor: item.bgColor,
          borderColor: item.borderColor,
          color: item.textColor,
        },
        proseStyle: {
          color: item.textColor,
          "--tw-prose-body": item.textColor,
          "--tw-prose-headings": item.textColor,
          "--tw-prose-links": item.linkColor,
          "--tw-prose-bold": item.textColor,
          "--tw-prose-counters": item.textColor,
          "--tw-prose-bullets": item.textColor,
        } as CSSProperties,
        isDark: item.isDark,
      };
    }

    return { ...THEMES, ...customThemeMap };
  }, [customThemes]);

  useEffect(() => {
    if (!themeOptions[theme]) {
      setTheme("parchment");
    }
  }, [theme, themeOptions]);

  useEffect(() => {
    setLiveProgress(0);
  }, [chapter_slug]);

  useEffect(() => {
    hasRestoredRef.current = false;
  }, [chapter_slug]);

  const clampSettingsButtonPos = (x: number, y: number) => {
    const margin = 8;
    const buttonSize = 40;
    const maxX = Math.max(margin, window.innerWidth - buttonSize - margin);
    const maxY = Math.max(margin, window.innerHeight - buttonSize - margin);
    return {
      x: Math.min(Math.max(margin, x), maxX),
      y: Math.min(Math.max(margin, y), maxY),
    };
  };

  useEffect(() => {
    const handleResize = () => {
      setSettingsButtonPos((prev) => clampSettingsButtonPos(prev.x, prev.y));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isDraggingSettingsButton) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextX = event.clientX - dragOffsetRef.current.x;
      const nextY = event.clientY - dragOffsetRef.current.y;
      const clamped = clampSettingsButtonPos(nextX, nextY);
      dragDistanceRef.current += Math.abs(event.movementX) + Math.abs(event.movementY);
      if (dragDistanceRef.current > 4) {
        suppressToggleRef.current = true;
      }
      setSettingsButtonPos(clamped);
    };

    const handlePointerUp = () => {
      setIsDraggingSettingsButton(false);
      localStorage.setItem("reader_settings_button_pos", JSON.stringify(settingsButtonPos));
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingSettingsButton, settingsButtonPos]);

  useEffect(() => {
    if (!showControls) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowControls(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showControls]);

  useEffect(() => {
    if (!showControls) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => settingsModalRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showControls]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsReaderMode(document.fullscreenElement === readerContainerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleReaderMode = async () => {
    const target = readerContainerRef.current;
    if (!target) return;

    const currentProgress = (() => {
      const content = scrollContentRef.current;
      if (!content) return null;

      const container = readerContainerRef.current;
      let contentTop = 0;
      let viewportHeight = window.innerHeight;
      let scrollY = window.scrollY;

      if (isReaderMode && container) {
        const containerRect = container.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        contentTop = contentRect.top - containerRect.top + container.scrollTop;
        viewportHeight = container.clientHeight;
        scrollY = container.scrollTop;
      } else {
        const rect = content.getBoundingClientRect();
        contentTop = window.scrollY + rect.top;
      }

      const maxScrollable = Math.max(1, content.scrollHeight - viewportHeight);
      const scrolled = Math.min(Math.max(scrollY - contentTop, 0), maxScrollable);
      return maxScrollable === 0 ? 0 : scrolled / maxScrollable;
    })();

    if (currentProgress !== null) {
      const normalized = Math.min(1, Math.max(0, currentProgress));
      pendingModeSwitchProgressRef.current = normalized;
      setLiveProgress(normalized);
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch {
      // Ignore fullscreen request failures (browser/security context restrictions).
    }
  };

  const toggleReaderModeFromModal = async () => {
    setShowControls(false);
    await toggleReaderMode();
  };

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

  const scrollToProgress = (progress: number, useReaderContainer: boolean) => {
    const content = scrollContentRef.current;
    if (!content) return;

    const normalized = Math.min(1, Math.max(0, progress));
    const container = readerContainerRef.current;

    if (useReaderContainer && container) {
      const containerRect = container.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const contentTop = contentRect.top - containerRect.top + container.scrollTop;
      const maxScrollable = Math.max(1, content.scrollHeight - container.clientHeight);
      const targetY = contentTop + normalized * maxScrollable;
      container.scrollTo({ top: targetY, behavior: "auto" });
      return;
    }

    const rect = content.getBoundingClientRect();
    const contentTop = window.scrollY + rect.top;
    const maxScrollable = Math.max(1, content.scrollHeight - window.innerHeight);
    const targetY = contentTop + normalized * maxScrollable;
    window.scrollTo({ top: targetY, behavior: "auto" });
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
      !readingProgress ||
      readingProgress.chapter_slug !== chapter_slug ||
      !chapter?.content ||
      hasRestoredRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToProgress(readingProgress.progress, isReaderMode);
      setLiveProgress(readingProgress.progress);
      hasRestoredRef.current = true;
    }, 120);

    return () => window.clearTimeout(timer);
  }, [readingProgress, chapter_slug, chapter?.content, isReaderMode]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleScroll = () => {
      if (modeSwitchSyncRef.current) return;
      const content = scrollContentRef.current;
      if (!content) return;

      const container = readerContainerRef.current;
      let contentTop = 0;
      let viewportHeight = window.innerHeight;
      let scrollY = window.scrollY;

      if (isReaderMode && container) {
        const containerRect = container.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        contentTop = contentRect.top - containerRect.top + container.scrollTop;
        viewportHeight = container.clientHeight;
        scrollY = container.scrollTop;
      } else {
        const rect = content.getBoundingClientRect();
        contentTop = window.scrollY + rect.top;
      }

      const maxScrollable = Math.max(1, content.scrollHeight - viewportHeight);
      const scrolled = Math.min(Math.max(scrollY - contentTop, 0), maxScrollable);
      const progress = maxScrollable === 0 ? 0 : scrolled / maxScrollable;
      queueSaveProgress(progress);
    };

    const container = readerContainerRef.current;
    if (isReaderMode && container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    } else {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }
    const initialTimer = window.setTimeout(handleScroll, 100);

    return () => {
      window.clearTimeout(initialTimer);
      if (isReaderMode && container) {
        container.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [chapter_slug, isAuthenticated, isReaderMode]);

  useEffect(() => {
    if (!chapter?.content) return;
    if (previousReaderModeRef.current === isReaderMode) return;
    previousReaderModeRef.current = isReaderMode;

    modeSwitchSyncRef.current = true;
    const sourceProgress = Math.max(
      pendingModeSwitchProgressRef.current ?? 0,
      liveProgress,
      readingProgress?.progress ?? 0
    );
    pendingModeSwitchProgressRef.current = null;
    setLiveProgress(sourceProgress);

    let releaseTimer: number | null = null;
    const syncTimer = window.setTimeout(() => {
      scrollToProgress(sourceProgress, isReaderMode);
      releaseTimer = window.setTimeout(() => {
        modeSwitchSyncRef.current = false;
      }, 180);
    }, 80);

    return () => {
      window.clearTimeout(syncTimer);
      if (releaseTimer) {
        window.clearTimeout(releaseTimer);
      }
      modeSwitchSyncRef.current = false;
    };
  }, [isReaderMode, chapter?.content, liveProgress, readingProgress?.progress]);

  if (isLoading) return <FullScreenLoader />;

  if (isError || !chapter) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Failed to load chapter.</p>
      </div>
    );
  }

  const activeTheme = themeOptions[theme] || THEMES.parchment;
  const nightTextClass = theme === "night" ? "[&_*]:!text-slate-300 [&_a]:!text-sky-300" : "";
  const proseNightVars =
    theme === "night"
      ? ({
          color: "#cbd5e1",
          "--tw-prose-body": "#cbd5e1",
          "--tw-prose-headings": "#e2e8f0",
          "--tw-prose-links": "#93c5fd",
          "--tw-prose-bold": "#e2e8f0",
          "--tw-prose-counters": "#94a3b8",
          "--tw-prose-bullets": "#64748b",
        } as CSSProperties)
      : {};

  const handleCreateTheme = () => {
    const trimmed = newThemeName.trim();
    if (!trimmed) return;

    const customThemeKey = `custom-${Date.now()}`;
    const nextTheme: CustomReaderTheme = {
      key: customThemeKey,
      label: trimmed.slice(0, 24),
      bgColor: newThemeBgColor,
      borderColor: newThemeBorderColor,
      textColor: newThemeTextColor,
      linkColor: newThemeLinkColor,
      isDark: newThemeIsDark,
    };

    setCustomThemes((prev) => [nextTheme, ...prev]);
    setTheme(customThemeKey);
    setNewThemeName("");
  };

  const clampFontSize = (value: number) => Math.min(42, Math.max(14, value));

  const getTouchDistance = (touchA: TouchPointLike, touchB: TouchPointLike) => {
    const dx = touchA.clientX - touchB.clientX;
    const dy = touchA.clientY - touchB.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleReaderTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!isReaderMode || event.touches.length !== 2) return;
    pinchStartDistanceRef.current = getTouchDistance(event.touches[0], event.touches[1]);
    pinchStartFontSizeRef.current = fontSize;
    setPinchScale(1);
  };

  const handleReaderTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!isReaderMode || event.touches.length !== 2) return;
    if (!pinchStartDistanceRef.current || !pinchStartFontSizeRef.current) return;

    if (event.cancelable) {
      event.preventDefault();
    }

    const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
    const nextScale = currentDistance / pinchStartDistanceRef.current;
    const previewFontSize = clampFontSize(pinchStartFontSizeRef.current * nextScale);
    setPinchScale(previewFontSize / pinchStartFontSizeRef.current);
  };

  const finishPinchZoom = () => {
    if (!isReaderMode || !pinchStartFontSizeRef.current) {
      setPinchScale(1);
      pinchStartDistanceRef.current = null;
      pinchStartFontSizeRef.current = null;
      return;
    }

    const nextFontSize = clampFontSize(pinchStartFontSizeRef.current * pinchScale);
    setFontSize(Math.round(nextFontSize));
    setPinchScale(1);
    pinchStartDistanceRef.current = null;
    pinchStartFontSizeRef.current = null;
  };

  return (
    <div
      ref={readerContainerRef}
      className={`min-h-screen bg-background flex flex-col ${
        isReaderMode ? "h-screen overflow-y-auto" : ""
      }`}
    >
      {!isReaderMode && (
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

            <Button
              variant="outline"
              size="sm"
              onClick={toggleReaderMode}
              className="gap-2"
              aria-label="Enter reader mode"
            >
              <Expand className="h-4 w-4" />
              Reader Mode
            </Button>
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
      )}

      <main className={`${isReaderMode ? "max-w-none px-0 py-0" : "max-w-3xl py-6"} mx-auto w-full`}>
        {isReaderMode ? (
          <div
            className={`${activeTheme.cardClass} min-h-screen rounded-none border-0 p-0`}
            style={activeTheme.cardStyle}
          >
            <div
              className="mx-auto w-full px-4 py-3 md:px-8 md:py-5 lg:max-w-4xl lg:px-10 lg:py-6"
              onTouchStart={handleReaderTouchStart}
              onTouchMove={handleReaderTouchMove}
              onTouchEnd={finishPinchZoom}
              onTouchCancel={finishPinchZoom}
            >
              <div
                ref={scrollContentRef}
                className={`prose max-w-none leading-relaxed ${activeTheme.proseClass} ${nightTextClass} m-0 p-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}
                style={{
                  fontSize: `${Math.round(fontSize * pinchScale)}px`,
                  lineHeight,
                  fontFamily: FONTS[fontFamily].value,
                  ...activeTheme.proseStyle,
                  ...proseNightVars,
                }}
                dangerouslySetInnerHTML={{ __html: chapter.content }}
              />
            </div>
          </div>
        ) : (
          <Card className={`${activeTheme.cardClass}`} style={activeTheme.cardStyle}>
            <CardContent className="p-6">
              <div
                ref={scrollContentRef}
                className={`prose max-w-none leading-relaxed ${activeTheme.proseClass} ${nightTextClass}`}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight,
                  fontFamily: FONTS[fontFamily].value,
                  ...activeTheme.proseStyle,
                  ...proseNightVars,
                }}
                dangerouslySetInnerHTML={{ __html: chapter.content }}
              />
            </CardContent>
          </Card>
        )}

        {(prevChapterSlug || nextChapterSlug) && (
          <div className="mt-8 flex items-center justify-center gap-3">
            {prevChapterSlug && (
              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                onClick={() => navigate(`/read/${story_slug}/${prevChapterSlug}`)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous Chapter
              </Button>
            )}
            {nextChapterSlug && (
              <Button
                className="h-11 rounded-full px-5"
                onClick={() => navigate(`/read/${story_slug}/${nextChapterSlug}`)}
              >
                Next Chapter
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <Separator className="my-8" />
      </main>

      {isReaderMode && isAuthenticated && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-40 w-[min(86vw,460px)] -translate-x-1/2">
          <div className="relative h-5 w-full overflow-hidden rounded-full border bg-background/80 shadow-sm backdrop-blur">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(liveProgress * 100)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-primary-foreground">
              {Math.round(liveProgress * 100)}%
            </div>
          </div>
        </div>
      )}

      {showControls && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
          onClick={() => setShowControls(false)}
        >
          <Card
            ref={settingsModalRef}
            className="w-[min(92vw,420px)] max-h-[calc(100vh-3rem)] overflow-hidden border shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reader-settings-title"
            tabIndex={-1}
          >
            <CardContent className="max-h-[calc(100vh-4rem)] space-y-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h2 id="reader-settings-title" className="text-sm font-semibold">
                  Reader Settings
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowControls(false)}
                  aria-label="Close settings panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-md border p-2">
                <Button
                  variant={isReaderMode ? "destructive" : "default"}
                  onClick={toggleReaderModeFromModal}
                  className="h-11 w-full justify-center gap-2 text-sm font-semibold"
                >
                  {isReaderMode ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                  {isReaderMode ? "Exit Reader Mode" : "Enter Reader Mode"}
                </Button>
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
                  {Object.keys(themeOptions).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={theme === key ? "default" : "outline"}
                      onClick={() => setTheme(key)}
                      className="gap-1"
                    >
                      {key === "night" || themeOptions[key].isDark ? (
                        <Moon className="h-3.5 w-3.5" />
                      ) : (
                        <Sun className="h-3.5 w-3.5" />
                      )}
                      {themeOptions[key].label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="text-xs font-medium text-muted-foreground">Create Theme</div>
                <Input
                  placeholder="Theme name"
                  value={newThemeName}
                  onChange={(event) => setNewThemeName(event.target.value)}
                  maxLength={24}
                />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center justify-between rounded border px-2 py-1">
                    <span>Background</span>
                    <input
                      type="color"
                      value={newThemeBgColor}
                      onChange={(event) => setNewThemeBgColor(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded border px-2 py-1">
                    <span>Border</span>
                    <input
                      type="color"
                      value={newThemeBorderColor}
                      onChange={(event) => setNewThemeBorderColor(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded border px-2 py-1">
                    <span>Text</span>
                    <input
                      type="color"
                      value={newThemeTextColor}
                      onChange={(event) => setNewThemeTextColor(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded border px-2 py-1">
                    <span>Links</span>
                    <input
                      type="color"
                      value={newThemeLinkColor}
                      onChange={(event) => setNewThemeLinkColor(event.target.value)}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={newThemeIsDark}
                    onChange={(event) => setNewThemeIsDark(event.target.checked)}
                  />
                  Treat as dark theme
                </label>
                <Button size="sm" onClick={handleCreateTheme} disabled={!newThemeName.trim()}>
                  Save Theme
                </Button>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">Font</div>
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                  {(Object.keys(FONTS) as ReaderFontKey[]).map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={fontFamily === key ? "default" : "outline"}
                      onClick={() => setFontFamily(key)}
                      style={{ fontFamily: FONTS[key].value }}
                      className="h-8"
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

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <BookMarked className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div
        className="fixed z-50 flex flex-col items-end gap-2"
        style={{ left: `${settingsButtonPos.x}px`, top: `${settingsButtonPos.y}px` }}
      >
        <Button
          size="icon"
          className="h-10 w-10 rounded-full shadow-md opacity-30 hover:opacity-100"
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            dragDistanceRef.current = 0;
            suppressToggleRef.current = false;
            dragOffsetRef.current = {
              x: event.clientX - settingsButtonPos.x,
              y: event.clientY - settingsButtonPos.y,
            };
            setIsDraggingSettingsButton(true);
          }}
          onClick={() => {
            if (suppressToggleRef.current) {
              suppressToggleRef.current = false;
              return;
            }
            setShowControls((value) => !value);
          }}
          aria-label={showControls ? "Collapse reader controls" : "Expand reader controls"}
          style={{ touchAction: "none", cursor: isDraggingSettingsButton ? "grabbing" : "grab" }}
        >
          {showControls ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
};

export default StoryReader;
