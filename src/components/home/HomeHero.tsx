import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import type { HeroConfig } from "@/api/types";
import { Button } from "@/components/ui/button";
import { formatViews } from "@/lib/utils";
import { heroIcon, heroPreset, resolvePresetSlots } from "@/components/home/heroPresets";

const isExternal = (url: string) => /^https?:\/\//.test(url);

/**
 * The homepage hero. The layout is fixed here; every piece of content —
 * text, stats, CTA, colours, background and its animation — comes from a
 * backend hero template (see heroPresets.ts for the animation presets).
 *
 * Colours are inline styles because they arrive at runtime: Tailwind can only
 * generate classes it sees at build time.
 */
const HomeHero = ({ hero }: { hero: HeroConfig }) => {
  const { title, cta, background } = hero;
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

      <div className="container relative px-3 py-10 sm:px-4 sm:py-14 md:py-16">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="min-w-0 max-w-2xl">
            <h1 className="animate-in fade-in-0 slide-in-from-bottom-4 text-4xl font-bold tracking-tight duration-700 sm:text-5xl md:text-6xl">
              <span className="text-white">{title.prefix}</span>
              {title.highlight && (
                <span
                  className="animate-gradient-x bg-[length:200%_auto] bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${title.highlight_from}, ${title.highlight_to}, ${title.highlight_from})`,
                  }}
                >
                  {title.highlight}
                </span>
              )}
            </h1>
            {hero.description && (
              <p className="mt-3 text-sm text-white/75 sm:text-base">{hero.description}</p>
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
                className="group relative rounded-full px-8 text-base font-semibold shadow-lg shadow-black/30 transition-transform hover:scale-105 hover:shadow-xl"
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
