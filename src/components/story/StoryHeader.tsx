import type { ReactNode } from "react";
import { BookMarked, CalendarDays, Clock, Eye, FileText, Headphones, Heart, Sparkles, Star } from "lucide-react";
import { Link } from "react-router";
import type { StoryDetail } from "@/api/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CoverImage from "@/components/CoverImage";
import StoryShareMenu from "@/components/story/StoryShareMenu";
import type { StoryProgressMode } from "@/hooks/useStoryProgress";
import { getLanguageLabel } from "@/lib/languages";
import { formatDurationMinutes } from "@/lib/utils";

const modeLabels: Record<StoryProgressMode, string> = {
  read: "Read",
  listen: "Listen",
  "read-along": "Read Along",
  watch: "Watch",
};

interface StoryHeaderProps {
  story: StoryDetail;
  mode?: StoryProgressMode;
  isFavorite: boolean;
  favoritesCount: number;
  favoriteLoading: boolean;
  favoriteError?: string | null;
  onToggleFavorite: () => void;
  actions: ReactNode;
  progress: ReactNode;
  compactActions?: boolean;
}

const StoryHeader = ({
  story,
  mode,
  isFavorite,
  favoritesCount,
  favoriteLoading,
  favoriteError,
  onToggleFavorite,
  actions,
  progress,
  compactActions = false,
}: StoryHeaderProps) => {
  const hub = !mode;
  const iconButton = compactActions ? "h-9 w-9 shrink-0 px-0 sm:h-11 sm:w-11" : "h-11 w-11 px-0";

  return (
    <div className={hub
      ? "grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 mb-8"
      : "relative -mx-4 mb-8 overflow-hidden border-y border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-card p-4 shadow-sm sm:mx-0 sm:rounded-sm sm:border-x sm:p-6"}
    >
      {!hub && <div className="pointer-events-none absolute -right-16 -top-16 hidden h-48 w-48 rounded-full bg-primary/10 blur-3xl sm:block" />}
      <div className={hub ? "contents" : "relative grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]"}>
        <div className={hub
          ? "relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg"
          : "relative aspect-[3/4] w-full overflow-hidden rounded-sm shadow-lg md:aspect-auto md:h-full md:min-h-[360px]"}
        >
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

        <div className={hub ? "space-y-4" : "flex h-full flex-col justify-center space-y-4"}>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge>{story.story_type}</Badge>
              {mode && <Badge variant="secondary">{modeLabels[mode]}</Badge>}
              <Badge variant="outline">{story.is_completed ? "Complete" : "Ongoing"}</Badge>
              {story.is_original && (
                <Link to="/originals" className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700">
                  <Sparkles className="h-3 w-3" /> WorldStories Original
                </Link>
              )}
            </div>
            {hub && story.translations.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Available in:</span>
                <span className="rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{getLanguageLabel(story.language)}</span>
                {story.translations.map((sibling) => (
                  <Link key={sibling.id} to={`/story/${sibling.slug}`} className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                    {getLanguageLabel(sibling.language)}
                  </Link>
                ))}
              </div>
            )}
            <h1 className="text-4xl font-bold mb-2">{story.title}</h1>
            {story.author && (
              <div className="flex items-center gap-2 mb-4">
                <Avatar className="h-8 w-8"><AvatarImage src={story.author.image || ""} /><AvatarFallback>SC</AvatarFallback></Avatar>
                <span className="text-sm text-muted-foreground">by <Link to={`/authors/${story.author.slug}`} className="font-medium text-foreground transition-colors hover:text-primary hover:underline">{story.author.name}</Link></span>
              </div>
            )}
            {hub && story.submitted_by && (
              <p className="text-sm text-muted-foreground">Submitted by <span className="text-foreground font-medium">{story.submitted_by.display_name || story.submitted_by.username || story.submitted_by.email}</span></p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-foreground sm:gap-x-6 sm:text-sm">
            <div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 sm:h-4 sm:w-4" /><span className="font-semibold">{story.rating}</span></div>
            <div className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" /><span>{story.views}</span></div>
            {(hub || mode === "read") && (story.chapter_count > 0 ? (
              <div className="flex items-center gap-1"><BookMarked className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" /><span>{story.chapter_count} chapters</span></div>
            ) : story.epub_file || story.pdf_file ? (
              <div className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" /><span>{story.epub_file ? "EPUB" : "PDF"}</span></div>
            ) : null)}
            {(hub || mode === "read") && story.reading_time_minutes != null && <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" /><span>{formatDurationMinutes(story.reading_time_minutes)} read</span></div>}
            {(hub || mode === "listen" || mode === "read-along") && story.listening_time_minutes != null && <div className="flex items-center gap-1"><Headphones className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" /><span>{formatDurationMinutes(story.listening_time_minutes)} listen</span></div>}
            {hub && story.published_date_label && <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" /><span>{story.published_date_label}</span></div>}
            {hub && <span>{story.reviews_count || 0} reviews</span>}
            <div className="flex items-center gap-1"><Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} /><span>{favoritesCount}</span></div>
          </div>

          <div className="flex flex-wrap gap-2">
            {story.genres.map((genre) => <Badge key={genre.id} variant="secondary">{genre.name}</Badge>)}
            {hub && story.categories.map((category) => <Link key={category.id} to={`/library?category=${category.id}`}><Badge variant="outline">{category.name}</Badge></Link>)}
          </div>

          {hub && (story.tags.length > 0 || story.themes.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Explore</span>
              {story.tags.map((tag) => tag.stories_count > 1 ? <Link key={`tag-${tag.id}`} to={`/tag/${tag.slug}`}><Badge variant="secondary">{tag.name}</Badge></Link> : <Badge key={`tag-${tag.id}`} variant="secondary" className="cursor-default opacity-70">{tag.name}</Badge>)}
              {story.themes.map((theme) => theme.stories_count > 1 ? <Link key={`theme-${theme.id}`} to={`/theme/${theme.slug}`}><Badge variant="secondary">{theme.name}</Badge></Link> : <Badge key={`theme-${theme.id}`} variant="secondary" className="cursor-default opacity-70">{theme.name}</Badge>)}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {actions}
            <Button size="lg" variant="outline" className={iconButton} onClick={onToggleFavorite} disabled={favoriteLoading} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}>
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <StoryShareMenu path={`/story/${story.slug}`} title={story.title} buttonClassName={iconButton} />
          </div>
          {progress}
          {favoriteError && <p className="text-sm text-red-500">{favoriteError}</p>}
        </div>
      </div>
    </div>
  );
};

export default StoryHeader;
