import type { ReactNode } from "react";
import type { PageThemeValues } from "@/api/types";
import {
  CONTENT_WIDTH_CLASS,
  SECTION_SPACING_CLASS,
  scopedCustomCss,
  themeFontsUrl,
  themeStyle,
} from "@/components/pages/pageTheme";

/**
 * The frame every admin-built page renders in. With a theme it sets the page's
 * colours, fonts, shape, width, spacing and background, and applies the
 * theme's custom CSS scoped to this wrapper; without one it uses the site's
 * look and default layout.
 *
 * `loadFonts` adds the font stylesheet in-place — for the admin preview. The
 * public page loads it from meta() instead, so it's in the <head> on first paint.
 */
const ThemedPage = ({
  theme,
  scope,
  loadFonts = false,
  children,
}: {
  theme: PageThemeValues | null;
  /** A class unique to this theme, which custom CSS is nested under. */
  scope: string;
  loadFonts?: boolean;
  children: ReactNode;
}) => {
  const fontsUrl = theme && loadFonts ? themeFontsUrl(theme) : null;
  const css = theme ? scopedCustomCss(scope, theme.custom_css) : "";
  const hasOverlay = Boolean(theme?.background_image) && (theme?.background_overlay_opacity ?? 0) > 0;

  return (
    <div
      className={`ws-page-theme ${scope} relative isolate bg-background text-foreground`}
      style={
        theme
          ? {
              ...themeStyle(theme),
              ...(theme.background_image
                ? { backgroundImage: `url("${theme.background_image.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}),
            }
          : undefined
      }
    >
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      {hasOverlay && theme && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ backgroundColor: theme.background_overlay_color, opacity: theme.background_overlay_opacity / 100 }}
        />
      )}
      <div
        className={`ws-page-content ${CONTENT_WIDTH_CLASS[theme?.content_width ?? "normal"]} ${
          SECTION_SPACING_CLASS[theme?.section_spacing ?? "normal"]
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default ThemedPage;
