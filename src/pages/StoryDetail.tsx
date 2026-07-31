import AdSpace from "@/components/AdSpace";
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
import { storyApi } from "@/api/story";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStory } from "@/hooks/useStory";
import {
  BookMarked,
  CheckCircle2,
  Eye,
  Facebook,
  Headphones,
  Heart,
  Link2,
  Share2,
  Star,
  Twitter,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo, { SITE_URL } from "@/components/Seo";
import { getLanguageLabel } from "@/lib/languages";


const StoryDetail = () => {
  const { slug } = useParams();
  const { data: story, isLoading, isError } = useStory(slug);
  // const [pendingScroll, setPendingScroll] = useState<"chapters" | "audios" | null>(null);

  // const slug = "the-raven"

  // debugger;

  const [activeTab, setActiveTab] = useState("chapters");

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
  const [favoriteError, setFavoriteError] = useState("");
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
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

  useEffect(() => {
    if (!story) return;
    setIsFavorite(Boolean(story.is_favorite));
    setFavoritesCount(story.favorites_count || 0);
  }, [story]);

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

  const toggleFavorite = async () => {
    if (!slug) return;
    setFavoriteError("");

    if (!isAuthenticated) {
      setFavoriteError("Please log in to favorite stories.");
      openLoginModal();
      return;
    }

    setFavoriteLoading(true);
    try {
      const response = isFavorite
        ? await storyApi.removeFavorite(slug)
        : await storyApi.addFavorite(slug);
      setIsFavorite(response.is_favorite);
      setFavoritesCount(response.favorites_count);
      await queryClient.invalidateQueries({ queryKey: ["story", slug] });
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await queryClient.invalidateQueries({ queryKey: ["home-data"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update favorite.";
      setFavoriteError(message);
    } finally {
      setFavoriteLoading(false);
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
  // Whichever format primaryReadHref actually resolved to, when it's not
  // chapters (hasSavedChapter already covers that case separately) — used to
  // decide between "Start Reading" and "Continue Reading" for the EPUB/PDF
  // fallback formats too, now that they track real per-account progress.
  const primaryFileProgress = story.chapters.length > 0 ? null : story.epub_file ? epubProgress : pdfProgress;
  const hasSavedPrimaryFileProgress = (primaryFileProgress?.progress || 0) > 0;
  // completionPercentage only ever reflects chapter-based progress (from the
  // chapter-specific reading-progress endpoint), which stays 0 for a
  // chapterless story regardless of real EPUB/PDF progress — this is what
  // the "Completion: X%" text should actually show in that case instead.
  const primaryCompletionPercentage =
    story.chapters.length > 0 ? completionPercentage : Math.round((primaryFileProgress?.progress || 0) * 100);
  const seoDescription = (story.about || `Read ${story.title} on WorldStories.`)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const storyPath = `/story/${story.slug}`;
  const shareUrl = `${SITE_URL}${storyPath}`;

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const shareToFacebook = () => {
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
  };

  const shareToTwitter = () => {
    openShareWindow(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(story.title)}`
    );
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Couldn't copy the link. Please copy it manually.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${story.title}${
          story.author?.name ? ` by ${story.author.name}` : ""
        } | WorldStories`}
        description={seoDescription}
        path={storyPath}
        image={story.cover_image}
        type="book"
        alternateLanguages={[
          { language: story.language, path: storyPath },
          ...story.translations.map((sibling) => ({
            language: sibling.language,
            path: `/story/${sibling.slug}`,
          })),
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": story.has_audio ? ["CreativeWork", "Audiobook"] : "CreativeWork",
          name: story.title,
          description: seoDescription,
          url: `${SITE_URL}${storyPath}`,
          image: story.cover_image || undefined,
          genre: story.genres.map((genre) => genre.name),
          datePublished: story.original_published_date || undefined,
          author: story.author
            ? {
                "@type": "Person",
                name: story.author.name,
              }
            : undefined,
          aggregateRating:
            story.reviews_count > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: story.rating,
                  reviewCount: story.reviews_count,
                  bestRating: 5,
                  worstRating: 1,
                }
              : undefined,
        }}
      />
      {/* <Header /> */}

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Story Header */}
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 mb-8">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg">
                <img
                  src={story.cover_image}
                  alt={story.title}
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
                  <div className="flex items-center gap-2 mb-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={story.author?.image || ""} />
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      by <span className="text-foreground font-medium">{story.author?.name || "Unknown"}</span>
                    </span>
                  </div>
                  {story.submitted_by && (
                    <p className="text-sm text-muted-foreground">
                      Submitted by{" "}
                      <span className="text-foreground font-medium">
                        {story.submitted_by.display_name || story.submitted_by.username || story.submitted_by.email}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{story.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{story.views}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookMarked className="h-4 w-4 text-muted-foreground" />
                    <span>{story.chapter_count} chapters</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{story.reviews_count || 0} reviews</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                    <span>{favoritesCount}</span>
                  </div>
                  {/* <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{story.lastUpdated}</span>
                  </div> */}
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {story.about}
                </p>

                <div className="flex flex-wrap gap-2">
                  {story.genres.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag.name}</Badge>
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
                      <DropdownMenuItem onClick={shareToFacebook}>
                        <Facebook className="h-4 w-4" />
                        Share on Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareToTwitter}>
                        <Twitter className="h-4 w-4" />
                        Share on X (Twitter)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={copyShareLink}>
                        <Link2 className="h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {/* </Link> */}
                </div>
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

            <AdSpace size="banner" className="mb-8" />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                {story.chapters.length > 0 && <TabsTrigger value="chapters">Chapters</TabsTrigger>}
                {story.audios.length > 0 && <TabsTrigger value="audios">Audios</TabsTrigger>}
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>

              </TabsList>

              <TabsContent value="chapters" className="mt-6" ref={chaptersRef}>
                <Card >
                  <CardContent className="p-0">
                    {story.chapters.length > 0 ? <>{story?.chapters?.map((chapter, index) => {
                      const chapterProgress = chapterProgressMap[chapter.slug] || 0;
                      const isChapterCompleted = chapterProgress >= 1;
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
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            {isAuthenticated && (
                              isChapterCompleted ? (
                                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Completed
                                </span>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" />
                                  <span className="ml-2">{Math.round(chapterProgress * 100)}%</span>
                                </>
                              )
                            )}
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
                    {story.audios.length > 0 ? <>{story?.audios?.map((chapter, index) => (
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
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Headphones className="h-3 w-3" />
                            {/* <span>{chapter.views}</span> */}
                          </div>
                        </div>
                        {index < story.chapters.length - 1 && <Separator />}
                      </Link>
                    ))}</> : <p className="p-4 text-muted-foreground">No audio available.</p>}
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
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">About the Author</h3>
                      {story.author ? (
                        <>
                          <div className="mb-3 flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={story.author.image || ""} />
                              <AvatarFallback>SC</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{story.author.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {story.author.stories_count} stories
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {story.author.bio || "No author bio available."}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No author information available for this story.
                        </p>
                      )}
                    </div>
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
            <AdSpace size="rectangle" />

            {/* <AdSpace size="rectangle" /> */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoryDetail;
