import { memo, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { NormalizedCue } from "@/lib/readAlongCues";

interface TranscriptCuesProps {
  cues: NormalizedCue[];
  activeIndex: number;
  proseClassName: string;
  typographyStyle: CSSProperties;
  /** Theme-resolved highlight class (background + box-shadow only). */
  activeCueClassName: string;
  onSeekToCue: (startSeconds: number, cueIndex: number) => void;
  registerCueRef: (index: number, el: HTMLElement | null) => void;
}

interface CueProps {
  cue: NormalizedCue;
  isActive: boolean;
  activeClassName: string;
  onSeek: (startSeconds: number, cueIndex: number) => void;
  registerRef: (index: number, el: HTMLElement | null) => void;
}

const Cue = memo(function Cue({ cue, isActive, activeClassName, onSeek, registerRef }: CueProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLParagraphElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSeek(cue.startSeconds, cue.index);
    }
  };

  return (
    <p
      ref={(el) => registerRef(cue.index, el)}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "true" : undefined}
      data-cue-index={cue.index}
      onClick={(event) => {
        // Seeking a cue is an explicit control action; do not also trigger the
        // transcript surface's tap-to-toggle-chrome handler.
        event.stopPropagation();
        onSeek(cue.startSeconds, cue.index);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "-mx-2 flex min-h-11 touch-manipulation cursor-pointer items-center rounded-md px-2 py-1.5 outline-none transition-colors [scroll-margin-block:25vh]",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background forced-colors:outline motion-reduce:transition-none",
        isActive && activeClassName
      )}
    >
      {cue.text}
    </p>
  );
});

/**
 * Renders a synchronized transcript as tappable, seekable lines inside the
 * same prose container the unsynchronized transcript uses (so themes / font /
 * line-height apply identically). The active line is highlighted; only the two
 * cues whose active state changed re-render on an index change.
 */
export function TranscriptCues({
  cues,
  activeIndex,
  proseClassName,
  typographyStyle,
  activeCueClassName,
  onSeekToCue,
  registerCueRef,
}: TranscriptCuesProps) {
  return (
    <div className={proseClassName} style={typographyStyle}>
      {cues.map((cue) => (
        <Cue
          key={cue.id}
          cue={cue}
          isActive={cue.index === activeIndex}
          activeClassName={activeCueClassName}
          onSeek={onSeekToCue}
          registerRef={registerCueRef}
        />
      ))}
    </div>
  );
}
