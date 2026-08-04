export const PAGE_ANIMATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "flip", label: "Page flip" },
] as const;

export type PageAnimationEffect = (typeof PAGE_ANIMATION_OPTIONS)[number]["value"];
export type PageTurnDirection = "next" | "prev";

export function getSavedPageAnimation(storageKey: string): PageAnimationEffect {
  const saved = localStorage.getItem(storageKey);
  return PAGE_ANIMATION_OPTIONS.some((option) => option.value === saved)
    ? (saved as PageAnimationEffect)
    : "slide";
}

export function runReaderPageAnimation(
  element: HTMLElement,
  effect: PageAnimationEffect,
  direction: PageTurnDirection
) {
  element.getAnimations().forEach((animation) => animation.cancel());
  if (effect === "none" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const keyframes: Keyframe[] =
    effect === "fade"
      ? [{ opacity: 0.15 }, { opacity: 1 }]
      : effect === "zoom"
      ? [{ opacity: 0.25, transform: "scale(0.965)" }, { opacity: 1, transform: "scale(1)" }]
      : effect === "flip"
      ? (() => {
          // The incoming page unfolds from the opposite edge depending on
          // direction. The small counter-rotation near the end mimics the
          // momentum and settling of a flexible paper page instead of a
          // rigid panel rotating at one constant rate.
          const sign = direction === "next" ? 1 : -1;
          const origin = direction === "next" ? "right center" : "left center";
          return [
            {
              offset: 0,
              opacity: 0.08,
              transform: `perspective(1400px) translateX(${sign * 3}%) rotateY(${sign * 82}deg) scaleX(0.94)`,
              transformOrigin: origin,
            },
            {
              offset: 0.48,
              opacity: 0.72,
              transform: `perspective(1400px) translateX(${sign * 0.8}%) rotateY(${sign * 28}deg) scaleX(0.985)`,
              transformOrigin: origin,
            },
            {
              offset: 0.82,
              opacity: 1,
              transform: `perspective(1400px) translateX(0) rotateY(${-sign * 2.5}deg) scaleX(1)`,
              transformOrigin: origin,
            },
            {
              offset: 1,
              opacity: 1,
              transform: "perspective(1400px) translateX(0) rotateY(0deg) scaleX(1)",
              transformOrigin: origin,
            },
          ];
        })()
      : [
          { opacity: 0.3, transform: `translateX(${direction === "next" ? "24px" : "-24px"})` },
          { opacity: 1, transform: "translateX(0)" },
        ];

  element.animate(keyframes, {
    duration: effect === "flip" ? 520 : effect === "slide" ? 220 : 180,
    easing: effect === "flip" ? "cubic-bezier(0.2, 0.72, 0.25, 1)" : "ease-out",
  });
}
