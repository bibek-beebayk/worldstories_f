import AdSpace from "@/components/AdSpace";
import { plainText } from "@/lib/plainText";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { shareToFacebook, shareToTwitter, copyShareLink } from "@/lib/share";
import { storyApi } from "@/api/story";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStory } from "@/hooks/useStory";
import {
  BookMarked,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Facebook,
  FileText,
  Headphones,
  Heart,
  Link2,
  Loader2,
  Newspaper,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Twitter,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { data, Link, useParams } from "react-router";
import { buildMeta, SITE_URL } from "@/lib/buildMeta";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { Route } from "./+types/StoryDetail";
import { useDownloadedIds, useOfflineDownload } from "@/hooks/useOfflineDownload";
import { makeDownloadId } from "@/lib/offlineDb";
import { getLanguageLabel } from "@/lib/languages";
import { formatBytes, formatDurationMinutes } from "@/lib/utils";
import { estimateSummaryReadingMinutes } from "@/lib/summaryReadingTime";
import CoverImage from "@/components/CoverImage";
import AuthGatedLink from "@/components/AuthGatedLink";
import StoryCard from "@/components/StoryCard";
import BlogCard from "@/components/BlogCard";

// Fetched here purely to supply meta() with real data server-side — the
// component below still fetches independently via useStory() for now
// (subtask 5 will consolidate these into one fetch).
export async function loader({ params }: Route.LoaderArgs) {
  try {
    return await storyApi.getStory(params.slug!);
  } catch {
    // A story slug that doesn't resolve is a real 404, not a 200 — same
    // "soft 404" reasoning as the catch-all NotFound route.
    return data(null, { status: 404 });
  }
}


export function meta({ data, params }: Route.MetaArgs) {
  if (!data) {
    return buildMeta({
      title: "Story Not Found | WorldStories",
      description: "The requested story could not be found.",
      path: `/story/${params.slug}`,
      noIndex: true,
    });
  }

  const storyPath = `/story/${data.slug}`;
  const plainTextSummary = plainText(data.summary || "");
  const fullDescription = plainText(data.about || plainTextSummary || `Read ${data.title} on WorldStories.`);
  // Meta/OG/Twitter descriptions get cut off in SERPs and share cards past
  // ~155-160 chars anyway, so truncating here is deliberate. Structured
  // data has no such limit — reusing this same truncated string there (as
  // this code used to) cut real sentences off mid-word for no reason.
  const seoDescription = fullDescription.slice(0, 160);
  const structuredDataDatePublished = data.original_published_year
    ? [
        String(data.original_published_year),
        data.original_published_month ? String(data.original_published_month).padStart(2, "0") : null,
        data.original_published_day ? String(data.original_published_day).padStart(2, "0") : null,
      ]
        .filter(Boolean)
        .join("-")
    : data.site_published_date || undefined;

  return buildMeta({
    title: `${data.title}${data.author?.name ? ` by ${data.author.name}` : ""} | WorldStories`,
    description: seoDescription,
    path: storyPath,
    image: data.cover_image,
    type: "book",
    alternateLanguages: [
      { language: data.language, path: storyPath },
      ...data.translations.map((sibling) => ({
        language: sibling.language,
        path: `/story/${sibling.slug}`,
      })),
    ],
    structuredData: {
      "@context": "https://schema.org",
      "@type": data.has_audio ? ["CreativeWork", "Audiobook"] : "CreativeWork",
      name: data.title,
      description: fullDescription,
      abstract: plainTextSummary ? plainTextSummary.slice(0, 500) : undefined,
      url: `${SITE_URL}${storyPath}`,
      image: data.cover_image || undefined,
      genre: data.genres.map((genre) => genre.name),
      datePublished: structuredDataDatePublished,
      author: data.author ? { "@type": "Person", name: data.author.name } : undefined,
      aggregateRating:
        data.reviews_count > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: data.rating,
              reviewCount: data.reviews_count,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
    },
  });
}

type BulkDownloadKind = "chapters" | "audios" | "epub" | "pdf";

const StoryDetail = ({ loaderData }: Route.ComponentProps) => {
  const { slug } = useParams();
  const { data: story, isLoading, isError } = useStory(slug, loaderData || undefined);
  const { data: relatedBlogsData } = useQuery({
    queryKey: ["related-blogs", slug],
    queryFn: () => storyApi.getBlogsForStory(slug!),
    enabled: !!slug,
  });
  const relatedBlogs = relatedBlogsData?.results || [];
  const { downloadedIds, refresh: refreshDownloadedIds } = useDownloadedIds(slug || "");
  const {
    downloadChapter,
    downloadAudio,
    downloadFile,
    removeDownloadItem,
    isPending: isDownloadPending,
    getProgress: getDownloadProgress,
  } = useOfflineDownload();
  // const [pendingScroll, setPendingScroll] = useState<"chapters" | "audios" | null>(null);

  // const slug = "the-raven"

  // debugger;

  const [activeTab, setActiveTab] = useState("chapters");
  const [bulkDownloadStage, setBulkDownloadStage] = useState<"choose" | "confirm" | null>(null);
  const [bulkDownloadKind, setBulkDownloadKind] = useState<BulkDownloadKind | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkDownloadedCount, setBulkDownloadedCount] = useState(0);

  // "chapters" is only a valid default if the story actually has chapters —
  // once the story loads, fall back to the next-best tab that has content.
  // Only adjusts while still on the initial default, so a tab the user has
  // already clicked into themselves is never overridden.
  useEffect(() => {
    if (!story) return;
    if (story.chapters.length > 0) return;
    setActiveTab((current) => {
      if (current !== "chapters") return current;
      return story.audios.length > 0 ? "audios" : "about";
    });
  }, [story]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const { isFavorite, favoritesCount, favoriteLoading, favoriteError, toggleFavorite } = useFavoriteToggle(slug, story);
  const queryClient = useQueryClient();
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();

  const chaptersRef = useRef<HTMLDivElement | null>(null);
  const audiosRef = useRef<HTMLDivElement | null>(null);

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["story-reviews", slug],
    queryFn: () => storyApi.getStoryReviews(slug!),
    enabled: !!slug && activeTab === "reviews",
  });

  const { data: myReview } = useQuery({
    queryKey: ["story-reviews", slug, "me"],
    queryFn: () => storyApi.getMyStoryReview(slug!),
    enabled: !!slug && !!isAuthenticated && activeTab === "reviews",
    retry: false,
  });

  const { data: readingProgress } = useQuery({
    queryKey: ["reading-progress", slug],
    queryFn: () => storyApi.getReadingProgress(slug!),
    enabled: !!slug && !!isAuthenticated,
    retry: false,
  });

  const { data: audioProgress } = useQuery({
    queryKey: ["audio-progress", slug],
    queryFn: () => storyApi.getAudioProgress(slug!),
    enabled: !!slug && !!isAuthenticated,
    retry: false,
  });

  const { data: epubProgress } = useQuery({
    queryKey: ["file-reading-progress", slug, "epub"],
    queryFn: () => storyApi.getFileReadingProgress(slug!, "epub"),
    enabled: !!slug && !!isAuthenticated && !!story?.epub_file,
    retry: false,
  });

  const { data: pdfProgress } = useQuery({
    queryKey: ["file-reading-progress", slug, "pdf"],
    queryFn: () => storyApi.getFileReadingProgress(slug!, "pdf"),
    enabled: !!slug && !!isAuthenticated && !!story?.pdf_file,
    retry: false,
  });

  useEffect(() => {
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewComment(myReview.comment || "");
    }
  }, [myReview]);

  // useEffect(() => {
  //   if (pendingScroll === "chapters" && chaptersRef.current) {
  //     chaptersRef.current.scrollIntoView({ behavior: "smooth" });
  //     setPendingScroll(null);
  //   }
  //   if (pendingScroll === "audios" && audiosRef.current) {
  //     audiosRef.current.scrollIntoView({ behavior: "smooth" });
  //     setPendingScroll(null);
  //   }
  // }, [pendingScroll, activeTab]);

  // const goToChapters = () => {
  //   setActiveTab("chapters");
  //   setPendingScroll("chapters");  // tell effect to scroll later
  // };

  // const goToAudios = () => {
  //   setActiveTab("audios");
  //   setPendingScroll("audios");
  // };



  if (isLoading) {
    return < FullScreenLoader />;
  }

  if (isError || !story) {
    return <div>Error loading story.</div>;
  }

  const submitReview = async () => {
    if (!slug) return;
    setReviewError("");
    setReviewLoading(true);
    try {
      if (myReview) {
        await storyApi.updateMyStoryReview(slug, reviewRating, reviewComment);
      } else {
        await storyApi.createStoryReview(slug, reviewRating, reviewComment);
      }
      await queryClient.invalidateQueries({ queryKey: ["story-reviews", slug] });
      await queryClient.invalidateQueries({ queryKey: ["story-reviews", slug, "me"] });
      await queryClient.invalidateQueries({ queryKey: ["story", slug] });
      setReviewComment("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit review.";
      setReviewError(message);
    } finally {
      setReviewLoading(false);
    }
  };

  const deleteReview = async () => {
    if (!slug) return;
    setReviewError("");
    setReviewLoading(true);
    try {
      await storyApi.deleteMyStoryReview(slug);
      await queryClient.invalidateQueries({ queryKey: ["story-reviews", slug] });
      await queryClient.invalidateQueries({ queryKey: ["story-reviews", slug, "me"] });
      await queryClient.invalidateQueries({ queryKey: ["story", slug] });
      setReviewComment("");
      setReviewRating(5);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete review.";
      setReviewError(message);
    } finally {
      setReviewLoading(false);
    }
  };

  const firstChapterSlug = story.chapters[0]?.slug;
  const savedChapterSlug = readingProgress?.chapter_slug;
  const hasSavedChapter =
    !!savedChapterSlug && story.chapters.some((chapter) => chapter.slug === savedChapterSlug);
  const readChapterSlug = hasSavedChapter ? savedChapterSlug : firstChapterSlug;
  const chapterProgressMap = Object.fromEntries(
    (readingProgress?.chapter_progresses || []).map((item) => [item.chapter_slug, item.progress])
  );
  const completionPercentage = Math.round((readingProgress?.overall_progress || 0) * 100);
  const firstAudioSlug = story.audios[0]?.slug;
  const savedAudioSlug = audioProgress?.audio_slug;
  const hasSavedAudio = !!savedAudioSlug && story.audios.some((audio) => audio.slug === savedAudioSlug);

  const listenAudioSlug = hasSavedAudio ? savedAudioSlug : firstAudioSlug;
  const audioCompletionPercentage = Math.round((audioProgress?.overall_progress || 0) * 100);
  // Best available reading format, in priority order: HTML chapters (the
  // default reading experience) → EPUB → PDF.
  const primaryReadHref =
    story.chapters.length > 0
      ? `/read/${story.slug}/${readChapterSlug}`
      : story.epub_file
      ? `/story/${story.slug}/epub`
      : story.pdf_file
      ? `/story/${story.slug}/pdf`
      : null;
  const quickReadMinutes = estimateSummaryReadingMinutes(story.summary);
  // Whichever format primaryReadHref actually resolved to, when it's not
  // chapters (hasSavedChapter already covers that case separately) — used to
  // decide between "Start Reading" and "Continue Reading" for the EPUB/PDF
  // fallback formats too, now that they track real per-account progress.
  const primaryFileProgress = story.chapters.length > 0 ? null : story.epub_file ? epubProgress : pdfProgress;
  const primaryFileType: "epub" | "pdf" | null =
    story.chapters.length > 0 ? null : story.epub_file ? "epub" : story.pdf_file ? "pdf" : null;
  const bulkChoices: BulkDownloadKind[] = story.chapters.length > 0
    ? ["chapters", ...(story.audios.length > 0 ? (["audios"] as BulkDownloadKind[]) : [])]
    : [
        ...(primaryFileType ? ([primaryFileType] as BulkDownloadKind[]) : []),
        ...(story.audios.length > 0 ? (["audios"] as BulkDownloadKind[]) : []),
      ];
  const getBulkItemCount = (kind: BulkDownloadKind) =>
    kind === "chapters" ? story.chapters.length : kind === "audios" ? story.audios.length : 1;
  const getBulkDownloadedCount = (kind: BulkDownloadKind) =>
    kind === "chapters"
      ? story.chapters.filter((chapter) => downloadedIds.has(makeDownloadId(story.slug, "chapter", chapter.slug))).length
      : kind === "audios"
      ? story.audios.filter((audio) => downloadedIds.has(makeDownloadId(story.slug, "audio", audio.slug))).length
      : downloadedIds.has(makeDownloadId(story.slug, kind))
      ? 1
      : 0;
  const openBulkDownload = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (bulkChoices.length === 1) {
      setBulkDownloadKind(bulkChoices[0]);
      setBulkDownloadStage("confirm");
    } else {
      setBulkDownloadKind(null);
      setBulkDownloadStage("choose");
    }
  };
  const bulkItemCount = bulkDownloadKind ? getBulkItemCount(bulkDownloadKind) : 0;
  const bulkAlreadyDownloadedCount = bulkDownloadKind ? getBulkDownloadedCount(bulkDownloadKind) : 0;
  const bulkRemainingCount = bulkItemCount - bulkAlreadyDownloadedCount;
  const bulkSizeBytes = bulkDownloadKind === "chapters"
    ? story.chapters.reduce((sum, item) => sum + (item.download_size_bytes || 0), 0)
    : bulkDownloadKind === "audios"
    ? story.audios.reduce((sum, item) => sum + (item.download_size_bytes || 0), 0)
    : bulkDownloadKind === "epub"
    ? story.epub_size_bytes || 0
    : bulkDownloadKind === "pdf"
    ? story.pdf_size_bytes || 0
    : 0;
  const storyDownloadMetadata = {
    slug: story.slug,
    title: story.title,
    cover_image: story.cover_image,
    author: story.author?.name,
    genres: story.genres.map((genre) => genre.name),
    story_type: story.story_type,
  };
  const bulkKindLabel = (kind: BulkDownloadKind) =>
    kind === "chapters" ? "Chapters" : kind === "audios" ? "Audios" : kind.toUpperCase();
  const confirmBulkDownload = async () => {
    if (!bulkDownloadKind) return;
    setIsBulkDownloading(true);
    setBulkDownloadedCount(bulkAlreadyDownloadedCount);
    try {
      let completed = true;
      if (bulkDownloadKind === "chapters") {
        for (const chapter of story.chapters) {
          if (downloadedIds.has(makeDownloadId(story.slug, "chapter", chapter.slug))) continue;
          const downloaded = await downloadChapter(storyDownloadMetadata, chapter.slug, chapter.title, chapter.order);
          if (downloaded === false) {
            completed = false;
            break;
          }
          setBulkDownloadedCount((count) => count + 1);
        }
      } else if (bulkDownloadKind === "audios") {
        for (const audio of story.audios) {
          if (downloadedIds.has(makeDownloadId(story.slug, "audio", audio.slug))) continue;
          const downloaded = await downloadAudio(storyDownloadMetadata, audio.slug, audio.title, audio.order);
          if (downloaded === false) {
            completed = false;
            break;
          }
          setBulkDownloadedCount((count) => count + 1);
        }
      } else {
        const id = makeDownloadId(story.slug, bulkDownloadKind);
        if (!downloadedIds.has(id)) {
          const downloaded = await downloadFile(storyDownloadMetadata, bulkDownloadKind, story.title);
          if (downloaded !== false) setBulkDownloadedCount(1);
          else completed = false;
        }
      }
      refreshDownloadedIds();
      if (completed) {
        toast.success("Offline download complete.");
        setBulkDownloadStage(null);
      }
    } catch {
      toast.error("The download could not be completed. Please try again.");
    } finally {
      setIsBulkDownloading(false);
    }
  };
  const hasSavedPrimaryFileProgress = (primaryFileProgress?.progress || 0) > 0;
  // completionPercentage only ever reflects chapter-based progress (from the
  // chapter-specific reading-progress endpoint), which stays 0 for a
  // chapterless story regardless of real EPUB/PDF progress — this is what
  // the "Completion: X%" text should actually show in that case instead.
  const primaryCompletionPercentage =
    story.chapters.length > 0 ? completionPercentage : Math.round((primaryFileProgress?.progress || 0) * 100);
  const storyPath = `/story/${story.slug}`;

  return (
    <div className="min-h-screen bg-background">
      {/* <Header /> */}

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Story Header */}
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 mb-8">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg">
                <CoverImage
                  src={story.cover_image}
                  alt={story.title}
                  author={story.author?.name}
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{story.story_type}</Badge>
                    <Badge variant="outline">{story.is_completed ? "Complete" : "Ongoing"}</Badge>
                  </div>
                  {story.translations.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Available in:</span>
                      <span className="rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {getLanguageLabel(story.language)}
                      </span>
                      {story.translations.map((sibling) => (
                        <Link
                          key={sibling.id}
                          to={`/story/${sibling.slug}`}
                          className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          {getLanguageLabel(sibling.language)}
                        </Link>
                      ))}
                    </div>
                  )}
                  <h1 className="text-4xl font-bold mb-2">{story.title}</h1>
                  {story.author && (
                    <div className="flex items-center gap-2 mb-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={story.author.image || ""} />
                        <AvatarFallback>SC</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        by{" "}
                        <Link to={`/authors/${story.author.id}`} className="font-medium text-foreground transition-colors hover:text-primary hover:underline">
                          {story.author.name}
                        </Link>
                      </span>
                    </div>
                  )}
                  {story.submitted_by && (
                    <p className="text-sm text-muted-foreground">
                      Submitted by{" "}
                      <span className="text-foreground font-medium">
                        {story.submitted_by.display_name || story.submitted_by.username || story.submitted_by.email}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-foreground sm:gap-x-6 sm:text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 sm:h-4 sm:w-4" />
                    <span className="font-semibold">{story.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                    <span>{story.views}</span>
                  </div>
                  {story.chapter_count > 0 ? (
                    <div className="flex items-center gap-1">
                      <BookMarked className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                      <span>{story.chapter_count} chapters</span>
                    </div>
                  ) : story.epub_file || story.pdf_file ? (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                      <span>{story.epub_file ? "EPUB" : "PDF"}</span>
                    </div>
                  ) : null}
                  {story.reading_time_minutes != null && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                      <span>{formatDurationMinutes(story.reading_time_minutes)} read</span>
                    </div>
                  )}
                  {story.listening_time_minutes != null && (
                    <div className="flex items-center gap-1">
                      <Headphones className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                      <span>{formatDurationMinutes(story.listening_time_minutes)} listen</span>
                    </div>
                  )}
                  {story.published_date_label && (
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                      <span>{story.published_date_label}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span>{story.reviews_count || 0} reviews</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart
                      className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                    />
                    <span>{favoritesCount}</span>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {story.about}
                </p>

                <div className="flex flex-wrap gap-2">
                  {story.genres.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag.name}</Badge>
                  ))}
                  {story.categories.map((category) => (
                    <Link key={category.id} to={`/library?category=${category.id}`}>
                      <Badge variant="outline">{category.name}</Badge>
                    </Link>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  {primaryReadHref && (
                    <Link to={primaryReadHref}>
                      <Button size="lg" className="flex-1 min-w-[140px]">
                        <BookMarked className="h-4 w-4 mr-2" />
                        {story.chapters.length > 0
                          ? hasSavedChapter
                            ? "Continue Reading"
                            : "Start Reading"
                          : hasSavedPrimaryFileProgress
                          ? "Continue Reading"
                          : "Start Reading"}
                      </Button>
                    </Link>
                  )}

                  {story.audios.length > 0 && listenAudioSlug && (
                    <Link to={`/listen/${story.slug}/${listenAudioSlug}`} className="">
                      <Button size="lg" variant="secondary" className="flex-1 min-w-[140px]">
                        <Headphones className="h-4 w-4 mr-2" />
                        {hasSavedAudio ? "Continue Listening" : "Listen to Audio"}
                      </Button>
                    </Link>
                  )}

                  {bulkChoices.length > 0 && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 min-w-[140px]"
                      onClick={openBulkDownload}
                      disabled={isBulkDownloading}
                    >
                      {isBulkDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                      Download
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="lg" variant="outline" aria-label="Share this story">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => shareToFacebook(storyPath)}>
                        <Facebook className="h-4 w-4" />
                        Share on Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareToTwitter(storyPath, story.title)}>
                        <Twitter className="h-4 w-4" />
                        Share on X (Twitter)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyShareLink(storyPath)}>
                        <Link2 className="h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* </Link> */}
                </div>
                {quickReadMinutes !== null && (
                  <AuthGatedLink
                    to={`/quick-read/${story.slug}`}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Quick Read · {quickReadMinutes} min
                  </AuthGatedLink>
                )}
                {isAuthenticated && primaryReadHref && (
                  <p className="text-sm text-muted-foreground">
                    Completion: {primaryCompletionPercentage}%
                  </p>
                )}
                {isAuthenticated && story.audios.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Audio completion: {audioCompletionPercentage}%
                  </p>
                )}
                {!isAuthenticated && (
                  <p className="text-sm text-muted-foreground">
                    <button type="button" onClick={openLoginModal} className="text-primary hover:underline">
                      Login
                    </button>{" "}
                    to Track progress
                  </p>
                )}
                {favoriteError && (
                  <p className="text-sm text-red-500">{favoriteError}</p>
                )}

              </div>
            </div>

            <AdSpace size="banner" className="mb-8" contentType="story" />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <TabsList className="w-max">
                  {story.chapters.length > 0 && <TabsTrigger value="chapters">Chapters</TabsTrigger>}
                  {story.audios.length > 0 && <TabsTrigger value="audios">Audios</TabsTrigger>}
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chapters" className="mt-6" ref={chaptersRef}>
                <Card >
                  <CardContent className="p-0">
                    {story.chapters.length > 0 ? <>{story?.chapters?.map((chapter, index) => {
                      const chapterProgress = chapterProgressMap[chapter.slug] || 0;
                      const isChapterCompleted = chapterProgress >= 1;
                      const downloadId = makeDownloadId(story.slug, "chapter", chapter.slug);
                      const isDownloaded = downloadedIds.has(downloadId);
                      const isPending = isDownloadPending(downloadId);
                      return (
                      <Link to={`/read/${slug}/${chapter.slug}`} key={index}>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-muted-foreground w-8">
                              {chapter.order}
                            </span>
                            <div>
                              <h3 className="font-medium">{chapter.title}</h3>
                              {/* <p className="text-xs text-muted-foreground">{chapter.date}</p> */}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {isAuthenticated && (
                              isChapterCompleted ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Completed
                                </span>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" />
                                  <span>{Math.round(chapterProgress * 100)}%</span>
                                </>
                              )
                            )}
                            <button
                              type="button"
                              title={isDownloaded ? "Remove download" : "Download for offline reading"}
                              onClick={async (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (isPending) return;
                                if (isDownloaded) {
                                  await removeDownloadItem(downloadId);
                                } else {
                                  await downloadChapter(
                                    { slug: story.slug, title: story.title, cover_image: story.cover_image, author: story.author?.name, genres: story.genres.map((genre) => genre.name), story_type: story.story_type },
                                    chapter.slug,
                                    chapter.title,
                                    chapter.order
                                  );
                                }
                                refreshDownloadedIds();
                              }}
                              className="rounded-full p-1.5 hover:bg-muted"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isDownloaded ? (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {index < story.chapters.length - 1 && <Separator />}
                      </Link>
                      );
                    })}</> : <p className="p-4 text-muted-foreground">No chapters available.</p>}

                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audios" className="mt-6" ref={audiosRef}>
                <Card >
                  <CardContent className="p-0">
                    {story.audios.length > 0 ? <>{story?.audios?.map((chapter, index) => {
                      const downloadId = makeDownloadId(story.slug, "audio", chapter.slug);
                      const isDownloaded = downloadedIds.has(downloadId);
                      const isPending = isDownloadPending(downloadId);
                      return (
                      <Link to={`/listen/${slug}/${chapter.slug}`} key={index}>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-muted-foreground w-8">
                              {chapter.order}
                            </span>
                            <div>
                              <h3 className="font-medium">{chapter.title}</h3>
                              {/* <p className="text-xs text-muted-foreground">{chapter.date}</p> */}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Headphones className="h-3 w-3" />
                            {isPending && getDownloadProgress(downloadId) != null && (
                              <span className="text-xs tabular-nums">
                                {Math.round((getDownloadProgress(downloadId) || 0) * 100)}%
                              </span>
                            )}
                            <button
                              type="button"
                              title={isDownloaded ? "Remove download" : "Download for offline listening"}
                              onClick={async (event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                if (isPending) return;
                                if (isDownloaded) {
                                  await removeDownloadItem(downloadId);
                                } else {
                                  await downloadAudio(
                                    { slug: story.slug, title: story.title, cover_image: story.cover_image, author: story.author?.name, genres: story.genres.map((genre) => genre.name), story_type: story.story_type },
                                    chapter.slug,
                                    chapter.title,
                                    chapter.order
                                  );
                                }
                                refreshDownloadedIds();
                              }}
                              className="rounded-full p-1.5 hover:bg-muted"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isDownloaded ? (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {index < story.chapters.length - 1 && <Separator />}
                      </Link>
                      );
                    })}</> : <p className="p-4 text-muted-foreground">No audio available.</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Story Description</h3>
                      <p className="text-muted-foreground">{story.about || "No description available."}</p>
                    </div>
                    {story.author && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-2">About the Author</h3>
                          <Link to={`/authors/${story.author.id}`} className="group mb-3 flex w-fit items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={story.author.image || ""} />
                              <AvatarFallback>SC</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium transition-colors group-hover:text-primary group-hover:underline">{story.author.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {story.author.stories_count} stories
                              </p>
                            </div>
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {story.author.bio || "No author bio available."}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {isAuthenticated ? (
                        <div className="space-y-3 rounded-md border p-4">
                          <h3 className="font-semibold">
                            {myReview ? "Update your review" : "Write a review"}
                          </h3>
                          <div className="space-y-2">
                            <label className="text-sm">Rating</label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setReviewRating(value)}
                                  className="rounded p-1 hover:bg-muted"
                                  aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                                >
                                  <Star
                                    className={`h-5 w-5 ${
                                      value <= reviewRating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {reviewRating}/5
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm">Review</label>
                            <Textarea
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="Share your thoughts about this story..."
                            />
                          </div>
                          {reviewError && <p className="text-sm text-red-500">{reviewError}</p>}
                          <div className="flex gap-2">
                            <Button onClick={submitReview} disabled={reviewLoading}>
                              {reviewLoading ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
                            </Button>
                            {myReview && (
                              <Button variant="outline" onClick={deleteReview} disabled={reviewLoading}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          <button type="button" onClick={openLoginModal} className="text-primary hover:underline">Log in</button> to rate and review this story.
                        </p>
                      )}

                      <div>
                        <h3 className="font-semibold mb-4">Community Reviews</h3>
                        {reviewsLoading ? (
                          <p className="text-muted-foreground">Loading reviews...</p>
                        ) : (reviewsData?.results?.length || 0) === 0 ? (
                          <p className="text-muted-foreground">No reviews yet.</p>
                        ) : (
                          <div className="space-y-4">
                            {reviewsData?.results?.map((review) => (
                              <div key={review.id} className="rounded-md border p-4">
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="font-medium">{review.user.username}</p>
                                  <p className="text-sm text-muted-foreground">{review.rating}/5</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{review.comment || "No comment provided."}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AdSpace size="rectangle" contentType="story" />

            {/* <AdSpace size="rectangle" /> */}
          </div>
        </div>

        {relatedBlogs.length > 0 && (
          <section className="mt-12 border-t pt-8" aria-labelledby="related-blogs-heading">
            <div className="mb-5 flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <div>
                <h2 id="related-blogs-heading" className="text-xl font-bold sm:text-2xl">Related Blogs</h2>
                <p className="mt-1 text-sm text-muted-foreground">Blog posts about this story.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {relatedBlogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          </section>
        )}

        {story.similar_stories.length > 0 && (
          <section className="mt-12 border-t pt-8" aria-labelledby="similar-titles-heading">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h2 id="similar-titles-heading" className="text-xl font-bold sm:text-2xl">Similar Titles</h2>
                <p className="mt-1 text-sm text-muted-foreground">More stories selected from shared genres and related story traits.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {story.similar_stories.map((similarStory) => (
                <StoryCard key={similarStory.id} {...similarStory} />
              ))}
            </div>
          </section>
        )}
      </main>

      {bulkDownloadStage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="bulk-download-title">
            <CardContent className="p-5 sm:p-6">
              {bulkDownloadStage === "choose" ? (
                <>
                  <h2 id="bulk-download-title" className="text-xl font-bold">Choose what to download</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Select the format you want available offline.</p>
                  <div className="mt-5 grid gap-3">
                    {bulkChoices.map((kind) => {
                      const itemCount = getBulkItemCount(kind);
                      const downloadedCount = getBulkDownloadedCount(kind);
                      const isFullyDownloaded = downloadedCount === itemCount;
                      return (
                        <button
                          key={kind}
                          type="button"
                          className="flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5"
                          onClick={() => {
                            setBulkDownloadKind(kind);
                            setBulkDownloadStage("confirm");
                          }}
                        >
                          <span>
                            <span className="block font-semibold">Download {bulkKindLabel(kind)}</span>
                            {downloadedCount > 0 && !isFullyDownloaded && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">{downloadedCount} of {itemCount} already downloaded</span>
                            )}
                          </span>
                          {isFullyDownloaded ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" /> Downloaded
                            </span>
                          ) : (
                            <Download className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <h2 id="bulk-download-title" className="text-xl font-bold">Confirm download</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{story.title}</p>
                  <div className="mt-5 space-y-3 rounded-xl border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Content</span>
                      <span className="font-medium">{bulkDownloadKind && bulkKindLabel(bulkDownloadKind)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{bulkDownloadKind === "chapters" ? "Chapters" : bulkDownloadKind === "audios" ? "Audio tracks" : "Files"}</span>
                      <span className="font-medium">{bulkItemCount}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Download size</span>
                      <span className="font-medium">{bulkSizeBytes > 0 ? formatBytes(bulkSizeBytes) : "Size unavailable"}</span>
                    </div>
                  </div>
                  {bulkAlreadyDownloadedCount === bulkItemCount ? (
                    <div className="mt-3 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>All {bulkItemCount} {bulkItemCount === 1 ? "item is" : "items are"} already downloaded and available offline.</span>
                    </div>
                  ) : bulkAlreadyDownloadedCount > 0 ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {bulkAlreadyDownloadedCount} of {bulkItemCount} items are already downloaded. Only the remaining {bulkRemainingCount} will be downloaded.
                    </div>
                  ) : null}
                  {isBulkDownloading && (
                    <p className="mt-3 text-sm font-medium text-primary">Downloaded {bulkDownloadedCount} of {bulkItemCount}</p>
                  )}
                </>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={isBulkDownloading}
                  onClick={() => {
                    if (bulkDownloadStage === "confirm" && bulkChoices.length > 1) {
                      setBulkDownloadStage("choose");
                      setBulkDownloadKind(null);
                    } else {
                      setBulkDownloadStage(null);
                    }
                  }}
                >
                  {bulkDownloadStage === "confirm" && bulkChoices.length > 1
                    ? "Back"
                    : bulkDownloadStage === "confirm" && bulkRemainingCount === 0
                    ? "Close"
                    : "Cancel"}
                </Button>
                {bulkDownloadStage === "confirm" && (
                  <Button onClick={confirmBulkDownload} disabled={isBulkDownloading || bulkRemainingCount === 0}>
                    {isBulkDownloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isBulkDownloading ? "Downloading…" : bulkRemainingCount === 0 ? "Already downloaded" : "Confirm Download"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StoryDetail;
