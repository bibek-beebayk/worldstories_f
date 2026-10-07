import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import type { HeroConfig, HeroLetterSpacing, HeroTextSize, HeroTitleSize } from "@/api/types";
import { Button } from "@/components/ui/button";
import { formatViews } from "@/lib/utils";
import { DEFAULT_HERO_TYPOGRAPHY, heroFontsUrl, heroIcon, heroPreset, resolvePresetSlots } from "@/components/home/heroPresets";
import { fontStack } from "@/components/pages/pageTheme";

const isExternal = (url: string) => /^https?:\/\//.test(url);

// Responsive presets — "medium" is the hero's original size.
const TITLE_SIZE_CLASS: Record<HeroTitleSize, string> = {
  small: "text-3xl sm:text-4xl md:text-5xl",
  medium: "text-4xl sm:text-5xl md:text-6xl",
  large: "text-5xl sm:text-6xl md:text-7xl",
  xlarge: "text-5xl sm:text-7xl md:text-8xl",
};
const LETTER_SPACING: Record<HeroLetterSpacing, string> = {
  tight: "-0.025em",
  normal: "0",
  wide: "0.05em",
  wider: "0.1em",
};
const DESCRIPTION_SIZE_CLASS: Record<HeroTextSize, string> = {
  small: "text-xs sm:text-sm",
  medium: "text-sm sm:text-base",
  large: "text-base sm:text-lg",
};

/**
 * The homepage hero. The layout is fixed here; every piece of content —
 * text, stats, CTA, colours, background and its animation — comes from a
 * backend hero template (see heroPresets.ts for the animation presets).
 *
 * Colours and fonts are inline styles because they arrive at runtime:
 * Tailwind can only generate classes it sees at build time.
 *
 * The homepage loads the hero's fonts from its meta() (so they're in <head>
 * on first paint); `loadFonts` adds them in place instead, for the admin preview.
 */
const HomeHero = ({ hero, loadFonts = false }: { hero: HeroConfig; loadFonts?: boolean }) => {
  const { title, cta, background } = hero;
  const typography = hero.typography ?? DEFAULT_HERO_TYPOGRAPHY;
  const fontsUrl = loadFonts ? heroFontsUrl(hero) : null;
  const preset = heroPreset(background.animation);
  const slots = resolvePresetSlots(preset, background.icons ?? []);
  const ctaContent = (
    <>
      {cta.label}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </>
  );

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: background.color }}>
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      {background.image && (
        <>
          <img
            src={background.image}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          {/* Keeps the white text legible over however busy the image is. */}
          <div className="pointer-events-none absolute inset-0 bg-black/55" />
        </>
      )}

      {preset.blobs && (
        <>
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-drift-slow rounded-full opacity-30 blur-3xl motion-reduce:animate-none"
            style={{ backgroundColor: background.accent, animationDuration: "18s" }}
          />
          <div
            className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 animate-drift-slow rounded-full opacity-20 blur-3xl motion-reduce:animate-none"
            style={{ backgroundColor: background.accent, animationDuration: "22s", animationDelay: "3s" }}
          />
        </>
      )}

      {/* Decorative only — icons don't convey information, so the whole
          layer is hidden from assistive tech and never intercepts input. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {slots.map(({ icon, className, animationClass, style }, index) => {
          const Icon = heroIcon(icon);
          return (
            <Icon
              key={index}
              style={style}
              className={`absolute text-white/20 motion-reduce:animate-none ${animationClass} ${className}`}
            />
          );
        })}
      </div>

      <div
        className="container relative px-3 py-10 sm:px-4 sm:py-14 md:py-16"
        style={typography.body_font ? { fontFamily: fontStack(typography.body_font) } : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="min-w-0 max-w-2xl">
            <h1
              className={`animate-in fade-in-0 slide-in-from-bottom-4 duration-700 ${TITLE_SIZE_CLASS[typography.title_size] ?? TITLE_SIZE_CLASS.medium}`}
              style={{
                // Inline, so it also beats a site theme's heading font.
                ...(typography.title_font ? { fontFamily: fontStack(typography.title_font) } : {}),
                fontWeight: typography.title_weight,
                letterSpacing: LETTER_SPACING[typography.title_letter_spacing] ?? LETTER_SPACING.tight,
                textTransform: typography.title_uppercase ? "uppercase" : undefined,
                fontStyle: typography.title_italic ? "italic" : undefined,
              }}
            >
              <span className="text-white">{title.prefix}</span>
              {title.highlight && (
                <span
                  className="animate-gradient-x bg-[length:200%_auto] bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${title.highlight_from}, ${title.highlight_to}, ${title.highlight_from})`,
                    // Gradient text is only painted inside the box, and italic
                    // letters lean past it — give the last one room.
                    ...(typography.title_italic ? { paddingRight: "0.15em" } : {}),
                  }}
                >
                  {title.highlight}
                </span>
              )}
            </h1>
            {hero.description && (
              <p className={`mt-3 text-white/75 ${DESCRIPTION_SIZE_CLASS[typography.description_size] ?? DESCRIPTION_SIZE_CLASS.medium}`}>
                {hero.description}
              </p>
            )}

            {hero.info_lines.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70 sm:text-sm">
                {hero.info_lines.map((line, index) => {
                  const Icon = heroIcon(line.icon);
                  return (
                    <span key={index} className="inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" /> {line.text}
                    </span>
                  );
                })}
              </div>
            )}

            {hero.stats.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70 sm:text-sm">
                {hero.stats.map((stat, index) => (
                  <span key={index}>
                    <strong className="text-white">
                      {typeof stat.value === "number" ? formatViews(stat.value) : stat.value}
                    </strong>{" "}
                    {stat.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {cta.label && cta.url && (
            <div className="relative flex w-full shrink-0 justify-center sm:w-auto sm:justify-start">
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-50 motion-reduce:animate-none"
                style={{ backgroundColor: cta.bg_from }}
              />
              <Button
                asChild
                size="lg"
                className={`group relative rounded-full px-8 text-base font-semibold shadow-lg shadow-black/30 transition-transform hover:scale-105 hover:shadow-xl ${
                  typography.cta_uppercase ? "uppercase tracking-wide" : ""
                }`}
                style={{
                  backgroundImage: `linear-gradient(to right, ${cta.bg_from}, ${cta.bg_to})`,
                  color: cta.text_color,
                }}
              >
                {isExternal(cta.url) ? (
                  <a href={cta.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    {ctaContent}
                  </a>
                ) : (
                  <Link to={cta.url} className="flex items-center gap-2">
                    {ctaContent}
                  </Link>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
