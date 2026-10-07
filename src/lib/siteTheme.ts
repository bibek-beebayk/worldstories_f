import type { PublicSiteTheme } from "@/api/types";
import { fontStack, lookVariables, themeFontsUrl } from "@/components/pages/pageTheme";

const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

const normalise = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

/** "/library" matches exactly; "/story/*" matches everything starting "/story/". */
export const pathMatches = (pattern: string, pathname: string) => {
  const path = normalise(pathname);
  if (pattern.endsWith("*")) return path.startsWith(pattern.slice(0, -1)) || path === normalise(pattern.slice(0, -1));
  return path === normalise(pattern);
};

/**
 * The theme for this page: the first live theme (the API sends them highest
 * priority first) that covers the path. The admin panel is never themed.
 */
export const pickSiteTheme = (themes: PublicSiteTheme[] | undefined, pathname: string) => {
  if (!themes?.length || isAdminPath(pathname)) return null;
  return (
    themes.find(
      (theme) => theme.apply_to === "site" || theme.page_paths.some((pattern) => pathMatches(pattern, pathname))
    ) ?? null
  );
};

const cssUrl = (url: string) => `url("${url.replace(/["\\\n<]/g, "")}")`;

/**
 * The whole site theme as one stylesheet. Variables go on :root rather than a
 * wrapper so dialogs, menus and toasts — which render in portals outside the
 * app's tree — follow the theme too. Heading rules use :where() so any heading
 * with its own colour or font class keeps it.
 *
 * The selectors are deliberately more specific than index.css's (":root:root"
 * over ":root", "html body" over "body"): Tailwind v3's @layer base compiles to
 * ordinary CSS, so with equal specificity whichever stylesheet comes last wins
 * — and in dev Vite injects index.css after this one.
 */
export const siteThemeCss = (theme: PublicSiteTheme) => {
  const variables = Object.entries(lookVariables(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
  const rules = [`:root:root { ${variables} }`, `:where(h1, h2, h3, h4) { color: ${theme.heading_color}; }`];

  if (theme.body_font) rules.push(`html body { font-family: ${fontStack(theme.body_font)}; }`);
  if (theme.heading_font) {
    // Mirrors index.css's own heading rule (h1–h3 outside .prose, so the
    // reader's font choice in story/blog bodies still wins) plus the
    // `font-display` headline class, one notch more specific than both.
    rules.push(
      `html :is(h1, h2, h3, h4):not(.prose *), html .font-display { font-family: ${fontStack(theme.heading_font)}; }`
    );
  }

  if (theme.background_image) {
    rules.push(
      `html body { background-image: ${cssUrl(theme.background_image)}; background-size: cover; background-position: center; background-attachment: fixed; }`
    );
    if (theme.background_overlay_opacity > 0) {
      rules.push(
        `html body::before { content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none; background: ${
          theme.background_overlay_color
        }; opacity: ${theme.background_overlay_opacity / 100}; }`
      );
    }
  }

  // Banners keep white text normally; under a theme their white text follows
  // the theme's "text on accent" colour along with the banner itself. Only
  // solid .text-white: the faint text-white/10–25 watermarks stay faint white.
  rules.push(
    `html .themed-banner .text-white { color: ${theme.primary_text_color}; }`,
    // …and headings in a banner take the banner's text colour, not the theme's heading colour.
    `html .themed-banner :is(h1, h2, h3, h4) { color: inherit; }`
  );

  // The backend refuses "<"; escaping it again means this can never close its <style> tag.
  if (theme.custom_css.trim()) rules.push(theme.custom_css.replace(/</g, "\\3c "));
  return rules.join("\n");
};

export const siteThemeFontsUrl = themeFontsUrl;
