import FullScreenLoader from "@/components/FullScreenLoader";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { useImmersiveReader } from "@/context/ImmersiveReaderContext";
import { storyApi } from "@/api/story";
import { queueChapterProgress, saveChapterProgressLocally } from "@/lib/progressSync";
import {
  blockIndexAtOffset,
  decodeBlockAnchor,
  encodeBlockAnchor,
  measureBlockOffsets,
  offsetForBlockIndex,
} from "@/lib/readerPosition";
import { markStoryFinishedIfComplete, noteServerConfirmedCompletion } from "@/lib/storyCompletion";
import { usePendingProgress } from "@/hooks/usePendingProgress";
import StoryCompletionScreen from "@/components/StoryCompletionScreen";
import { ReadingProgressBar } from "@/components/reader/ReadingProgressBar";
import { useStoryReadingEvents } from "@/hooks/useStoryReadingEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useChapter } from "@/hooks/useChapter";
import { useStory } from "@/hooks/useStory";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Expand,
  List,
  Minimize,
  Moon,
  SlidersHorizontal,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { data, Link, useLocation, useNavigate, useParams } from "react-router";
import { buildMeta } from "@/lib/buildMeta";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { estimateSummaryReadingMinutes } from "@/lib/summaryReadingTime";
import { useContentSessionAnalytics } from "@/hooks/useContentSessionAnalytics";
import type { Route } from "./+types/StoryReader";

// Fetched here purely to supply meta() with real data server-side — the
// component below still fetches independently via useChapter()/useStory().
export async function loader({ params }: Route.LoaderArgs) {
  const { story_slug, chapter_slug } = params;
  try {
    const [story, chapter] = await Promise.all([
      storyApi.getStory(story_slug!),
      storyApi.getChapter(story_slug!, chapter_slug!, "text"),
    ]);
    return { story, chapter };
  } catch {
    return data(null, { status: 404 });
  }
}

export function meta({ data: loaderData, params }: Route.MetaArgs) {
  if (!loaderData) {
    return buildMeta({
      title: "Chapter Not Found | WorldStories",
      description: "The requested chapter could not be found.",
      path: `/read/${params.story_slug}/${params.chapter_slug}`,
      noIndex: true,
    });
  }

  const { story, chapter } = loaderData;
  return buildMeta({
    title: `${chapter.title}${story?.title ? ` — ${story.title}` : ""} | WorldStories`,
    description: `Read ${chapter.title}${story?.title ? ` from ${story.title}` : ""} on WorldStories.`,
    path: `/read/${params.story_slug}/${params.chapter_slug}`,
    // Only WorldStories Originals chapters are indexable — a public-domain
    // title's chapter pages are thin/duplicate content available elsewhere.
    // Story-level pages stay indexed regardless (see StoryDetail's meta()).
    noIndex: !story?.is_original,
  });
}

type ReaderThemeKey = string;
type ReaderFontKey = string;
type TouchPointLike = { clientX: number; clientY: number };
export type ReaderThemeConfig = {
  label: string;
  cardClass: string;
  proseClass: string;
  cardStyle?: CSSProperties;
  proseStyle?: CSSProperties;
  isDark?: boolean;
};
export type CustomReaderTheme = {
  key: string;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  linkColor: string;
  isDark: boolean;
};

export const THEMES: Record<string, ReaderThemeConfig> = {
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
    isDark: true,
  },
};

const READER_GLASS_PANEL_CLASS =
  "border-border bg-gradient-to-br from-primary/10 to-background/100 backdrop-blur supports-[backdrop-filter]:from-primary/10 supports-[backdrop-filter]:to-background/45";

export const FONTS: Record<ReaderFontKey, { label: string; value: string }> = {
  literata: {
    label: "Literata",
    value: "\"Literata\", \"Palatino Linotype\", \"Book Antiqua\", Palatino, serif",
  },
  georgia: {
    label: "Georgia",
    value: "Georgia, \"Gelasio\", serif",
  },
  times: {
    label: "Times",
    value: "\"Times New Roman\", Times, \"Tinos\", serif",
  },
  garamond: {
    label: "Garamond",
    value: "\"EB Garamond\", Garamond, \"Times New Roman\", serif",
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
    value: "\"Helvetica Neue\", Helvetica, \"Arimo\", Arial, sans-serif",
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

const StoryReader = ({ loaderData }: Route.ComponentProps) => {
  const { story_slug, chapter_slug } = useParams();
  useContentSessionAnalytics("reading_session", story_slug ? { storySlug: story_slug } : undefined, true, {
    format: "chapter",
    item_slug: chapter_slug || "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  // Coming from the Downloads page should return there, not to the story
  // page — the entry point passes this via navigation state (see
  // ProfileDownloadedStory.tsx).
  const backHref = (location.state as { backTo?: string } | null)?.backTo || `/story/${story_slug}`;

  const { data: chapter, isLoading, isError } = useChapter(
    story_slug,
    chapter_slug,
    "text",
    loaderData?.chapter
  );
  const { data: story } = useStory(story_slug, loaderData?.story || undefined);
  const hasQuickRead = estimateSummaryReadingMinutes(story?.summary) !== null;
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [fontFamily, setFontFamily] = useState<ReaderFontKey>(() => {
    if (typeof window === "undefined") return "literata";
    return (localStorage.getItem("reader_font") as ReaderFontKey) || "literata";
  });
  const [theme, setTheme] = useState<ReaderThemeKey>(() => {
    if (typeof window === "undefined") return "parchment";
    return (localStorage.getItem("reader_theme") as ReaderThemeKey) || "parchment";
  });
  const [customThemes, setCustomThemes] = useState<CustomReaderTheme[]>(() => {
    if (typeof window === "undefined") return [];
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
  const [isContentsOpen, setIsContentsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReaderChromeVisible, setIsReaderChromeVisible] = useState(true);
  const { setIsImmersiveReaderActive } = useImmersiveReader();

  // HTML chapters use the same dedicated reader surface as EPUB/PDF even
  // before native fullscreen is requested, so the regular site chrome stays
  // out of the way for the lifetime of this page.
  useEffect(() => {
    setIsImmersiveReaderActive(true);
    return () => setIsImmersiveReaderActive(false);
  }, [setIsImmersiveReaderActive]);

  // Entering fullscreen reveals the reader chrome; a tap on the reading area
  // can still hide it again just like in the EPUB/PDF readers.
  useEffect(() => {
    if (isFullscreen) setIsReaderChromeVisible(true);
  }, [isFullscreen]);

  const toggleReaderChrome = () => {
    setIsReaderChromeVisible((value) => !value);
  };
  const [liveProgress, setLiveProgress] = useState(0);
  const [pinchScale, setPinchScale] = useState(1);
  const [justFinishedStory, setJustFinishedStory] = useState(false);

  // liveProgress alone is only how far through the *current* chapter the
  // reader is. Overall book progress treats each chapter as an equal-sized
  // slice of the whole story (chapters already completed, plus how far into
  // the current one) — an approximation since chapters vary in length, but
  // the same one most reading apps use since real per-chapter length isn't
  // known up front.
  const overallProgress = useMemo(() => {
    const totalChapters = story?.chapter_count ?? 0;
    if (!totalChapters || !chapter) return liveProgress;
    const completedChapters = Math.max(0, chapter.order - 1);
    return Math.min(1, Math.max(0, (completedChapters + liveProgress) / totalChapters));
  }, [story?.chapter_count, chapter, liveProgress]);

  // `ready` waits for the chapter to exist: until then overallProgress is 0
  // for every story, and a resumed session would be logged as a fresh start.
  useStoryReadingEvents({
    storySlug: story_slug,
    format: "chapter",
    progress: overallProgress,
    ready: Boolean(story_slug && chapter),
  });

  const scrollContentRef = useRef<HTMLDivElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const settingsModalRef = useRef<HTMLDivElement>(null);
  const currentChapterButtonRef = useRef<HTMLButtonElement>(null);
  const hasRestoredRef = useRef(false);
  const liveProgressRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const latestProgressRef = useRef<number | null>(null);
  const latestAnchorRef = useRef<string | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartFontSizeRef = useRef<number | null>(null);

  const { data: readingProgress } = useQuery({
    queryKey: ["reading-progress", story_slug],
    queryFn: () => storyApi.getReadingProgress(story_slug!),
    enabled: !!story_slug && isAuthenticated,
    retry: false,
  });
  const localProgress = usePendingProgress(story_slug || "");
  const savedChapterProgress = chapter_slug
    ? localProgress.chapterProgress[chapter_slug] ??
      (readingProgress?.chapter_slug === chapter_slug ? readingProgress.progress : 0)
    : 0;
  // The content anchor for the same chapter, local first (a guest, or a save
  // that hasn't reached the server yet, is the most recent truth) then the
  // server's. Empty/absent means this position predates anchored resume and
  // only the percentage is available.
  const savedChapterAnchor = chapter_slug
    ? localProgress.chapterPosition[chapter_slug] ??
      (readingProgress?.chapter_slug === chapter_slug ? readingProgress.last_element_id : null)
    : null;

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
  const isLastChapter = currentChapterIndex >= 0 && !nextChapterSlug;

  const orderedChapters = useMemo(
    () => [...(story?.chapters || [])].sort((a, b) => a.order - b.order),
    [story?.chapters]
  );

  useEffect(() => {
    if (!isContentsOpen) return;
    const timer = window.setTimeout(() => {
      currentChapterButtonRef.current?.scrollIntoView({ block: "center" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [chapter_slug, isContentsOpen]);

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
    liveProgressRef.current = 0;
  }, [chapter_slug]);

  useEffect(() => {
    hasRestoredRef.current = false;
  }, [chapter_slug]);

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
      setIsFullscreen(document.fullscreenElement === readerContainerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const target = readerContainerRef.current;
    if (!target) return;

    // iOS Safari (specifically iPhone — iPad is different) doesn't support
    // arbitrary elements. Updating the state first gives it the same
    // full-viewport fallback used by the other readers, while supported
    // browsers also enter true native fullscreen.
    const next = !isFullscreen;
    setIsFullscreen(next);

    try {
      if (next && document.fullscreenEnabled) {
        await target.requestFullscreen();
      } else if (!next && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // The reader already owns the full viewport, which is the best
      // available fallback on platforms without arbitrary-element fullscreen.
    }
  };

  const queueSaveProgress = useCallback((progress: number, anchor?: string | null) => {
    if (!story_slug || !chapter_slug) return;
    const normalized = Math.min(1, Math.max(0, progress));
    liveProgressRef.current = normalized;
    setLiveProgress(normalized);
    latestProgressRef.current = normalized;
    latestAnchorRef.current = anchor ?? null;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      const savedAnchor = latestAnchorRef.current ?? "";
      saveChapterProgressLocally(story_slug, chapter_slug, normalized, savedAnchor);
      latestProgressRef.current = null;
      if (isAuthenticated) {
        storyApi
          .saveReadingProgress(story_slug, chapter_slug, normalized, savedAnchor)
          .then((response) => {
            // The server decides completion on the write itself, across every
            // chapter rather than just this one, so it is right on a second
            // device and after the browser store is cleared — neither of which
            // the local check below can see.
            if (response?.story_completed) {
              noteServerConfirmedCompletion(story_slug);
              setJustFinishedStory(true);
            }
          })
          .catch(() => queueChapterProgress(story_slug, chapter_slug, normalized, savedAnchor));
      } else if (
        isLastChapter &&
        normalized >= 0.995 &&
        markStoryFinishedIfComplete(story_slug, true)
      ) {
        // Signed out, so there is no server record to ask.
        setJustFinishedStory(true);
      }
    }, 400);
  }, [chapter_slug, isAuthenticated, isLastChapter, story_slug]);

  // Restores to the saved paragraph when there is one, and to the saved
  // percentage otherwise. The anchor is preferred because it survives a
  // change of font size, line height, theme, viewport or device — all of
  // which move the same percentage to a different sentence. See
  // lib/readerPosition.ts.
  const scrollToSavedPosition = (progress: number, anchor: string | null) => {
    const content = scrollContentRef.current;
    if (!content) return;

    const container = readerContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const contentTop = contentRect.top - containerRect.top + container.scrollTop;

    const anchorOffset = offsetForBlockIndex(
      measureBlockOffsets(content),
      decodeBlockAnchor(anchor)
    );
    if (anchorOffset !== null) {
      container.scrollTo({ top: contentTop + anchorOffset, behavior: "auto" });
      return;
    }

    const normalized = Math.min(1, Math.max(0, progress));
    const maxScrollable = Math.max(1, content.scrollHeight - container.clientHeight);
    container.scrollTo({ top: contentTop + normalized * maxScrollable, behavior: "auto" });
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (latestProgressRef.current !== null && story_slug && chapter_slug) {
        saveChapterProgressLocally(
          story_slug,
          chapter_slug,
          latestProgressRef.current,
          latestAnchorRef.current ?? ""
        );
        if (isLastChapter && latestProgressRef.current >= 0.995) {
          markStoryFinishedIfComplete(story_slug, true);
        }
        latestProgressRef.current = null;
      }
    };
  }, [story_slug, chapter_slug, isLastChapter]);

  useEffect(() => {
    if (!chapter?.content || hasRestoredRef.current) return;

    const timer = window.setTimeout(() => {
      const progress = Math.max(savedChapterProgress, liveProgressRef.current);
      // The anchor is only trustworthy for the position it was saved with. If
      // live progress has already moved past the saved percentage (the reader
      // scrolled before this ran), the anchor describes an older spot.
      const anchor = progress > savedChapterProgress ? null : savedChapterAnchor;
      scrollToSavedPosition(progress, anchor ?? null);
      // Goes through queueSaveProgress (not just the local refs) so this
      // initial position is actually persisted even if the chapter is short
      // enough that the user never scrolls at all — otherwise "continue
      // reading" on another device would never advance past the previous
      // chapter for a chapter like that.
      queueSaveProgress(progress, anchor ?? null);
      // Marks initial positioning as done regardless of whether saved
      // progress was 0 — handleScroll below is gated on this so it can't
      // read the *previous* chapter's leftover scrollTop (nothing resets
      // scroll position when chapter content swaps) and misreport it as
      // real progress on the new chapter before this restore has run.
      hasRestoredRef.current = true;
    }, 120);

    return () => window.clearTimeout(timer);
  }, [savedChapterProgress, savedChapterAnchor, chapter_slug, chapter?.content, queueSaveProgress]);

  useEffect(() => {
    const handleScroll = () => {
      // Until the restore-to-saved-position effect has run, container.scrollTop
      // can still be the previous chapter's leftover offset (nothing resets
      // it when chapter content swaps) — computing "progress" from that would
      // misreport the old chapter's scroll fraction as this chapter's, and
      // that bogus value would then win the Math.max in the restore effect,
      // landing the new chapter wherever the old one left off instead of the
      // top. Real scroll events only need to wait a beat; they'll fire again
      // once the user actually scrolls, which is always after this.
      if (!hasRestoredRef.current) return;

      const content = scrollContentRef.current;
      if (!content) return;

      const container = readerContainerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const contentTop = contentRect.top - containerRect.top + container.scrollTop;
      const viewportHeight = container.clientHeight;
      const scrollY = container.scrollTop;

      const maxScrollable = Math.max(1, content.scrollHeight - viewportHeight);
      const scrolled = Math.min(Math.max(scrollY - contentTop, 0), maxScrollable);
      const progress = maxScrollable === 0 ? 0 : scrolled / maxScrollable;
      const blockIndex = blockIndexAtOffset(measureBlockOffsets(content), scrollY - contentTop);
      queueSaveProgress(progress, blockIndex === null ? null : encodeBlockAnchor(blockIndex));
    };

    const container = readerContainerRef.current;
    container?.addEventListener("scroll", handleScroll, { passive: true });
    const initialTimer = window.setTimeout(handleScroll, 100);

    return () => {
      window.clearTimeout(initialTimer);
      container?.removeEventListener("scroll", handleScroll);
    };
    // isLoading/chapter?.content are listed even though the body doesn't read
    // them directly — readerContainerRef's actual DOM node only exists once
    // the loading/error early-returns above are past, and hooks run
    // unconditionally on every render (including the loading one, before
    // that node exists). Without these in the deps, whenever the chapter
    // was still loading on this effect's first run, container was null,
    // addEventListener was skipped, and — since chapter_slug/queueSaveProgress
    // hadn't changed — the effect never re-ran once the container actually
    // mounted, silently leaving that whole chapter session with no scroll
    // listener at all. That race (network/cache timing decides whether
    // isLoading is already false on first paint) is what made tracking work
    // "sometimes" and not others.
  }, [chapter_slug, queueSaveProgress, isLoading, chapter?.content]);

  if (isLoading) return <FullScreenLoader />;

  if (isError || !chapter) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Failed to load chapter.</p>
      </div>
    );
  }

  const activeTheme = themeOptions[theme] || THEMES.parchment;
  const isDarkReaderTheme = theme === "night" || Boolean(activeTheme.isDark);
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
  const typographyStyle: CSSProperties = {
    fontSize: `${Math.round(fontSize * pinchScale)}px`,
    lineHeight,
    fontFamily: FONTS[fontFamily].value,
    ...activeTheme.proseStyle,
    ...proseNightVars,
  };
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
    if (event.touches.length !== 2) return;
    pinchStartDistanceRef.current = getTouchDistance(event.touches[0], event.touches[1]);
    pinchStartFontSizeRef.current = fontSize;
    setPinchScale(1);
  };

  const handleReaderTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
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
    if (!pinchStartFontSizeRef.current) {
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
      className="flex h-[100dvh] min-h-screen flex-col overflow-y-auto bg-background"
    >
      {/* Stays put in distraction-free mode: two pixels is not chrome, and
          losing your place is more distracting than a hairline. The precise
          numbers live in the bottom bar and the floating pill. */}
      <ReadingProgressBar fraction={overallProgress} label="Story" />
      <main className="mx-auto w-full max-w-none px-0 py-0">
          <div
            className={`${activeTheme.cardClass} min-h-screen rounded-none border-0 p-0`}
            style={activeTheme.cardStyle}
            onClick={toggleReaderChrome}
          >
            <div
              className="mx-auto w-full px-4 pb-20 pt-20 md:px-8 lg:max-w-4xl lg:px-10"
              onTouchStart={handleReaderTouchStart}
              onTouchMove={handleReaderTouchMove}
              onTouchEnd={finishPinchZoom}
              onTouchCancel={finishPinchZoom}
            >
              <div
                ref={scrollContentRef}
                className={`prose max-w-none leading-relaxed ${activeTheme.proseClass} ${nightTextClass} m-0 p-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}
                style={typographyStyle}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(chapter.content) }}
              />
              {justFinishedStory && story && (
                <div className="mt-10">
                  <StoryCompletionScreen storySlug={story.slug} storyTitle={story.title} />
                </div>
              )}
            </div>
          </div>
      </main>

      {(
        <>
          <div
            className={`fixed inset-x-0 top-0 z-50 px-2 pt-2 transition-transform duration-300 ease-in-out ${
              isReaderChromeVisible ? "translate-y-0" : "-translate-y-full pointer-events-none"
            }`}
          >
            <div
              className={`mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-xl border px-2 py-2 text-foreground shadow-lg sm:px-3 sm:py-3 ${READER_GLASS_PANEL_CLASS} ${
                isDarkReaderTheme ? "dark" : ""
              }`}
            >
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold sm:text-lg">
                  {story?.title || chapter.title}
                </h1>
                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                  {chapter.title}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 sm:h-9 sm:px-3"
                  onClick={() => setIsContentsOpen(true)}
                  aria-label="Contents"
                >
                  <List className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Contents</span>
                </Button>
                {hasQuickRead && story_slug && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 sm:h-9 sm:px-3"
                    aria-label="Switch to Quick Read"
                    onClick={() => {
                      if (!isAuthenticated) {
                        openLoginModal();
                        return;
                      }
                      navigate(`/quick-read/${story_slug}`);
                    }}
                  >
                    <Zap className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Quick Read</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 sm:h-9 sm:px-3"
                  onClick={() => setShowControls(true)}
                  aria-label="Reader settings"
                >
                  <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 sm:h-9 sm:px-3"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4 sm:mr-2" />
                  ) : (
                    <Expand className="h-4 w-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  </span>
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

          <div
            className={`pointer-events-none fixed bottom-2 right-2 z-40 transition-transform duration-300 ease-in-out ${
              isReaderChromeVisible ? "translate-y-10" : "translate-y-0"
            }`}
          >
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground shadow-sm ${READER_GLASS_PANEL_CLASS} ${
                isDarkReaderTheme ? "dark" : ""
              }`}
            >
              {Math.round(overallProgress * 100)}%
            </span>
          </div>

          <div
            className={`fixed inset-x-0 bottom-0 z-50 px-3 pb-2 transition-transform duration-300 ease-in-out ${
              isReaderChromeVisible ? "translate-y-0" : "translate-y-full pointer-events-none"
            }`}
          >
            <div
              className={`mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-xl border px-3 py-2 text-foreground shadow-lg ${READER_GLASS_PANEL_CLASS} ${
                isDarkReaderTheme ? "dark" : ""
              }`}
            >
              <div className="flex justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  disabled={!prevChapterSlug}
                  onClick={() =>
                    prevChapterSlug &&
                    navigate(`/read/${story_slug}/${prevChapterSlug}`, { state: location.state })
                  }
                  aria-label="Previous chapter"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-w-0 px-2 text-center">
                <p className="truncate text-xs font-medium text-foreground">
                  Chapter {chapter.order}
                  {story?.chapter_count ? ` / ${story.chapter_count}` : ""}: {chapter.title}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[10px] text-muted-foreground sm:text-xs">
                  Chapter {Math.round(liveProgress * 100)}% · Overall {Math.round(overallProgress * 100)}%
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  disabled={!nextChapterSlug}
                  onClick={() =>
                    nextChapterSlug &&
                    navigate(`/read/${story_slug}/${nextChapterSlug}`, { state: location.state })
                  }
                  aria-label="Next chapter"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
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

            </CardContent>
          </Card>
        </div>
      )}

      <Sheet open={isContentsOpen} onOpenChange={setIsContentsOpen}>
        <SheetContent
          side="left"
          className="flex w-80 flex-col"
          container={isFullscreen ? readerContainerRef.current ?? undefined : undefined}
        >
          <SheetHeader>
            <SheetTitle>Contents</SheetTitle>
          </SheetHeader>
          <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
            {orderedChapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chapters available.</p>
            ) : (
              orderedChapters.map((item) => {
                const isCurrent = item.slug === chapter_slug;
                return (
                  <button
                    key={item.id || item.slug}
                    ref={isCurrent ? currentChapterButtonRef : undefined}
                    type="button"
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => {
                      setIsContentsOpen(false);
                      if (!isCurrent) {
                        navigate(`/read/${story_slug}/${item.slug}`, { state: location.state });
                      }
                    }}
                    className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`block text-[11px] font-medium uppercase tracking-wide ${
                        isCurrent ? "text-primary-foreground/75" : "text-muted-foreground"
                      }`}
                    >
                      Chapter {item.order}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium">{item.title}</span>
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default StoryReader;
