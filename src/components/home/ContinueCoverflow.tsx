import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Link } from "react-router";
import { BookOpenText, ChevronLeft, ChevronRight, Headphones, Play } from "lucide-react";
import CoverImage from "@/components/CoverImage";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { ContinueEntry } from "@/lib/continueShelf";
import { formatRemainingMinutes } from "@/lib/readingTime";

const MAX_VISIBLE_DISTANCE = 3;
const SWIPE_THRESHOLD = 40;

const percent = (progress: number) => Math.round(Math.max(0, Math.min(1, progress)) * 100);

/**
 * Signed distance of `index` from `active` on a circular list. The last items
 * come out negative (left of the active card) when the first item is active,
 * and the first items come out positive (right) when the last item is active.
 */
export function getCircularDistance(index: number, active: number, count: number): number {
  if (count <= 0) return 0;
  let d = (((index - active) % count) + count) % count;
  if (d > count / 2) d -= count;
  return d;
}

function useIsSmallViewport(): boolean {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 639px)");
    setIsSmall(query.matches);
    const onChange = () => setIsSmall(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isSmall;
}

function getSlidePresentation(distance: number, isSmall: boolean, reducedMotion: boolean) {
  const absD = Math.abs(distance);
  const sign = Math.sign(distance);
  const cardWidth = isSmall ? 128 : 200;

  if (reducedMotion) {
    return {
      style: {
        transform: `translateX(${distance * (cardWidth + 12)}px)`,
        opacity: absD > MAX_VISIBLE_DISTANCE ? 0 : 1,
        zIndex: Math.max(1, 10 - absD),
        pointerEvents: absD > MAX_VISIBLE_DISTANCE ? "none" : undefined,
      } as CSSProperties,
      overlayClass: "",
    };
  }

  const g1 = isSmall ? 86 : 165;
  const g2 = isSmall ? 50 : 100;
  const clamped = Math.min(absD, MAX_VISIBLE_DISTANCE);
  const x = clamped === 0 ? 0 : sign * (g1 + (clamped - 1) * g2);

  let scale = 1;
  let rotateY = 0;
  let opacity = 1;
  let overlayClass = "";

  if (clamped === 1) {
    scale = 0.8;
    rotateY = -sign * (isSmall ? 32 : 28);
    opacity = 0.95;
    overlayClass = "bg-black/[0.08]";
  } else if (clamped === 2) {
    scale = 0.64;
    rotateY = -sign * 42;
    opacity = 0.6;
    overlayClass = "bg-black/30";
  } else if (clamped >= 3) {
    scale = 0.5;
    rotateY = -sign * 42;
    opacity = absD > MAX_VISIBLE_DISTANCE ? 0 : 0.25;
    overlayClass = "bg-black/50";
  }

  const style: CSSProperties = {
    transform: `perspective(1200px) translateX(${x}px) scale(${scale}) rotateY(${rotateY}deg)`,
    opacity,
    zIndex: Math.max(1, 10 - absD),
    pointerEvents: absD > MAX_VISIBLE_DISTANCE ? "none" : undefined,
    willChange: "transform, opacity",
  };

  return { style, overlayClass };
}

function CoverBadge({ kind }: { kind: ContinueEntry["kind"] }) {
  const Icon = kind === "listening" ? Headphones : BookOpenText;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur-xs">
      <Icon className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
      {kind === "listening" ? "Listening" : "Reading"}
    </span>
  );
}

function ProgressRing({ pct, size }: { pct: number; size: number }) {
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      role="img"
      aria-label={`${pct}% complete`}
      className="relative flex items-center justify-center rounded-full bg-black/60 shadow-md backdrop-blur-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      <span className="relative text-[10px] font-bold tabular-nums leading-none text-white">
        {pct}%
      </span>
    </div>
  );
}

function SingleEntryCard({ entry }: { entry: ContinueEntry }) {
  const pct = percent(entry.progress);
  const remaining = formatRemainingMinutes(entry.remainingMinutes);
  const ctaLabel = entry.kind === "listening" ? "Continue listening" : "Continue reading";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <Link
          to={entry.href}
          aria-label={`Continue ${entry.story.title}`}
          className="relative aspect-[3/4] w-[200px] shrink-0 overflow-hidden rounded-lg border-2 border-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <CoverImage
            src={entry.story.cover_image}
            alt={entry.story.title}
            author={entry.story.author}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute left-2 top-2">
            <CoverBadge kind={entry.kind} />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
          <h3 className="line-clamp-2 font-serif text-xl font-bold leading-snug text-foreground">
            {entry.story.title}
          </h3>
          {entry.detail && (
            <p className="mt-1 text-sm text-muted-foreground">{entry.detail}</p>
          )}
          <div className="mt-3 flex w-full max-w-xs items-center gap-2.5">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums text-primary">{pct}%</span>
          </div>
          {remaining && (
            <p className="mt-1.5 text-xs text-muted-foreground">{remaining}</p>
          )}
          <div className="mt-4">
            <Button asChild>
              <Link to={entry.href}>
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                {ctaLabel}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ContinueCoverflow = ({ entries }: { entries: ContinueEntry[] }) => {
  const reducedMotion = usePrefersReducedMotion();
  const isSmall = useIsSmallViewport();
  const [activeIndex, setActiveIndex] = useState(0);
  const prevActiveRef = useRef(0);
  const pointerStartX = useRef<number | null>(null);
  const didDrag = useRef(false);

  const count = entries.length;
  const safeIndex = count > 0 ? Math.min(activeIndex, count - 1) : 0;

  useEffect(() => {
    prevActiveRef.current = safeIndex;
  }, [safeIndex]);

  if (count === 0) return null;
  if (count === 1) return <SingleEntryCard entry={entries[0]} />;

  const goTo = (index: number) => setActiveIndex(((index % count) + count) % count);
  const goPrev = () => goTo(safeIndex - 1);
  const goNext = () => goTo(safeIndex + 1);

  const activeEntry = entries[safeIndex];
  const activeRemaining = formatRemainingMinutes(activeEntry.remainingMinutes);
  const activePct = percent(activeEntry.progress);
  const ctaLabel =
    activeEntry.kind === "listening" ? "Continue listening" : "Continue reading";

  const cardWidth = isSmall ? 128 : 200;
  const cardHeight = Math.round((cardWidth * 4) / 3);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartX.current = event.clientX;
    didDrag.current = false;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) return;
    const dx = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      didDrag.current = true;
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (didDrag.current) {
      event.preventDefault();
      event.stopPropagation();
      didDrag.current = false;
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Continue reading and listening"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:items-center sm:gap-x-6">
        {/* Stage */}
        <div className="relative min-w-0 sm:col-start-1 sm:row-start-1">
          <button
            type="button"
            aria-label="Previous in Continue"
            onClick={goPrev}
            className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary bg-background text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div
            className="relative w-full overflow-x-clip"
            style={{ height: cardHeight + (isSmall ? 20 : 40), touchAction: "pan-y" }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              pointerStartX.current = null;
            }}
            onClickCapture={handleClickCapture}
          >
            {entries.map((entry, index) => {
              const distance = getCircularDistance(index, safeIndex, count);
              const prevDistance = getCircularDistance(index, prevActiveRef.current, count);
              const absD = Math.abs(distance);
              const isActive = distance === 0;
              const { style, overlayClass } = getSlidePresentation(
                distance,
                isSmall,
                reducedMotion
              );
              const wrapped =
                Math.sign(prevDistance) !== Math.sign(distance) &&
                (Math.abs(prevDistance) > MAX_VISIBLE_DISTANCE || absD > MAX_VISIBLE_DISTANCE);
              const animate = !reducedMotion && !wrapped;
              const pct = percent(entry.progress);
              const loading = isActive || absD === 1 ? "eager" : "lazy";

              const cardClasses = `relative block h-full w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive ? "border-2 border-white shadow-xl" : "border border-border/60 shadow-md"
              }`;

              const cardInner = (
                <>
                  <CoverImage
                    src={entry.story.cover_image}
                    alt={entry.story.title}
                    author={entry.story.author}
                    loading={loading}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  {overlayClass && (
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 ${overlayClass}`}
                    />
                  )}
                  {isActive && (
                    <div className="absolute left-2 top-2">
                      <CoverBadge kind={entry.kind} />
                    </div>
                  )}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-1 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2.5 pb-1.5 pt-5"
                  >
                    <p
                      className={`line-clamp-2 font-serif font-semibold leading-tight text-white ${
                        isActive ? "text-[14px]" : "text-[11px]"
                      }`}
                    >
                      {entry.story.title}
                    </p>
                  </div>
                  {isActive && (
                    <div className="absolute right-2 top-2 sm:hidden">
                      <ProgressRing pct={pct} size={34} />
                    </div>
                  )}
                  <div
                    className={`absolute inset-x-0 bottom-0 h-1 bg-white/30 ${
                      isActive ? "hidden sm:block" : ""
                    }`}
                  >
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </>
              );

              return (
                <div
                  key={`${entry.kind}-${entry.story.id}`}
                  data-testid={`coverflow-slide-${index}`}
                  aria-hidden={absD > MAX_VISIBLE_DISTANCE ? true : undefined}
                  className={`absolute ${
                    animate ? "transition-[transform,opacity] duration-300 ease-out" : ""
                  }`}
                  style={{
                    ...style,
                    left: "50%",
                    top: isSmall ? 10 : 20,
                    width: cardWidth,
                    height: cardHeight,
                    marginLeft: -cardWidth / 2,
                  }}
                >
                  {isActive ? (
                    <Link
                      to={entry.href}
                      aria-label={`Continue ${entry.story.title}`}
                      className={cardClasses}
                      draggable={false}
                    >
                      {cardInner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      tabIndex={absD > MAX_VISIBLE_DISTANCE ? -1 : 0}
                      onClick={() => goTo(index)}
                      aria-label={`Show ${entry.story.title}`}
                      className={`${cardClasses} cursor-pointer text-left`}
                    >
                      {cardInner}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="Next in Continue"
            onClick={goNext}
            className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary bg-background text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Info Panel */}
        <div
          aria-live="polite"
          data-testid="coverflow-info"
          className="flex min-w-0 flex-col items-center px-2 text-center sm:col-start-2 sm:row-start-1 sm:mt-0 sm:items-start sm:px-0 sm:text-left"
        >
          <div className="flex h-10 w-full items-center justify-center sm:h-14 sm:items-start sm:justify-start">
            <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-foreground sm:font-serif sm:text-xl sm:leading-snug">
              {activeEntry.story.title}
            </h3>
          </div>
          <p className="mt-0.5 line-clamp-1 h-4 w-full text-xs text-muted-foreground sm:mt-1 sm:h-5 sm:text-sm">
            {isSmall
              ? [activeEntry.detail, activeRemaining].filter(Boolean).join(" · ")
              : (activeEntry.detail ?? "")}
          </p>
          <div className="mt-3 hidden w-full max-w-xs items-center gap-2.5 sm:flex">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${activePct}%` }} />
            </div>
            <span className="text-xs font-semibold tabular-nums text-primary">{activePct}%</span>
          </div>
          <p className="mt-1 hidden h-4 text-[11px] text-muted-foreground sm:mt-1.5 sm:block sm:text-xs">
            {activeRemaining ?? ""}
          </p>
          <div className="mt-3 w-full max-w-[260px] sm:mt-4 sm:w-auto sm:max-w-none">
            <Button asChild size={isSmall ? "sm" : "default"} className="w-full sm:w-auto">
              <Link to={activeEntry.href}>
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                {ctaLabel}
              </Link>
            </Button>
          </div>
        </div>

        {/* Dots: at most 7 around the active item, plus a counter for long lists (3+ entries) */}
        {count >= 3 && (
          <div className="mt-3 flex flex-col items-center gap-1 sm:col-start-1 sm:row-start-2">
            <div className="flex items-center justify-center gap-2">
              {entries.map((entry, idx) => {
                const isActive = idx === safeIndex;
                const dist = Math.abs(getCircularDistance(idx, safeIndex, count));
                if (dist > MAX_VISIBLE_DISTANCE) return null;
                return (
                  <button
                    key={`dot-${entry.kind}-${entry.story.id}`}
                    type="button"
                    aria-label={`Go to item ${idx + 1}`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => goTo(idx)}
                    className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      isActive
                        ? "w-[26px] bg-primary"
                        : dist === MAX_VISIBLE_DISTANCE && count > 2 * MAX_VISIBLE_DISTANCE + 1
                          ? "w-1.5 bg-muted-foreground/20"
                          : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                );
              })}
            </div>
            {count > 2 * MAX_VISIBLE_DISTANCE + 1 && (
              <p className="text-[11px] font-medium tabular-nums text-muted-foreground" aria-hidden="true">
                {safeIndex + 1} / {count}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContinueCoverflow;
