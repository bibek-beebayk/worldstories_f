import { Link } from "react-router";
import { Captions, ChevronDown, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AudiobookOtherVersion } from "@/api/types";
import { formatLong } from "@/lib/formatDuration";
import { audiobookUrl, readAlongUrl } from "@/lib/urls";
import { cn } from "@/lib/utils";

interface StoryListenActionProps {
  storySlug: string;
  audiobooks?: AudiobookOtherVersion[];
  listenAudioSlug?: string;
  listenLabel: string;
  hasReadAlong?: boolean;
  readAlongStartSlug?: string;
  readAlongResumeSlug?: string | null;
  itemClassName?: string;
  buttonClassName?: string;
  iconButtonClassName?: string;
}

export function StoryListenAction({
  storySlug,
  audiobooks = [],
  listenAudioSlug,
  listenLabel,
  hasReadAlong = false,
  readAlongStartSlug,
  readAlongResumeSlug,
  itemClassName,
  buttonClassName,
  iconButtonClassName,
}: StoryListenActionProps) {
  const primarySlug = audiobooks[0]?.slug || storySlug;
  const hasMultiple = audiobooks.length > 1;

  return (
    <div className={cn("flex", itemClassName)}>
      {hasMultiple ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className={cn(buttonClassName, hasReadAlong && "rounded-r-none")}
            >
              <Headphones className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate sm:hidden">Listen</span>
              <span className="hidden truncate sm:inline">{listenLabel}</span>
              <ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {audiobooks.map((ab) => (
              <DropdownMenuItem key={ab.slug} asChild>
                <Link
                  to={audiobookUrl(ab.slug)}
                  className="flex w-full items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {ab.narrator || ab.title}
                    </p>
                    {ab.narrator && ab.title && (
                      <p className="truncate text-xs text-muted-foreground">{ab.title}</p>
                    )}
                  </div>
                  {ab.total_duration_seconds ? (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatLong(ab.total_duration_seconds)}
                    </span>
                  ) : null}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link to={audiobookUrl(primarySlug, listenAudioSlug)} className="flex min-w-0 flex-1">
          <Button
            size="lg"
            variant="secondary"
            className={cn(buttonClassName, hasReadAlong && "rounded-r-none")}
          >
            <Headphones className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate sm:hidden">Listen</span>
            <span className="hidden truncate sm:inline">{listenLabel}</span>
          </Button>
        </Link>
      )}

      {hasReadAlong && readAlongStartSlug && (
        <Link to={readAlongUrl(primarySlug, readAlongStartSlug)}>
          <Button
            size="lg"
            variant="secondary"
            className={cn(iconButtonClassName, "-ml-px rounded-l-none")}
            aria-label={readAlongResumeSlug ? "Continue Read Along" : "Read Along"}
            title="Read Along — follow the transcript while listening"
          >
            <Captions className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}
