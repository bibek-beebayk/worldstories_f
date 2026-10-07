import { useLocation, useMatches, useRouteLoaderData } from "react-router";
import type { PublicSiteTheme } from "@/api/types";
import { pickSiteTheme, siteThemeCss, siteThemeFontsUrl } from "@/lib/siteTheme";

/**
 * The active site theme's fonts and stylesheet, rendered in <head>. The live
 * themes come from the root loader; which one applies is decided from the
 * current path on both server and client, so the markup matches on hydration
 * and the theme is there on first paint.
 *
 * A page whose route opts in with `handle.storyTheme` (the story's /read/<slug>
 * page) can carry its own theme in its loader data (`site_theme`); when it
 * does, that one wins over every site theme.
 */
const SiteThemeStyles = () => {
  const data = useRouteLoaderData("root") as { siteThemes?: PublicSiteTheme[] } | undefined;
  const { pathname } = useLocation();
  const matches = useMatches();
  const storyTheme = matches
    .filter((match) => (match.handle as { storyTheme?: boolean } | undefined)?.storyTheme)
    .map((match) => (match.data as { site_theme?: PublicSiteTheme | null } | null | undefined)?.site_theme)
    .find(Boolean);
  const theme = storyTheme ?? pickSiteTheme(data?.siteThemes, pathname);
  if (!theme) return null;

  const fontsUrl = siteThemeFontsUrl(theme);
  return (
    <>
      {fontsUrl && <link rel="stylesheet" href={fontsUrl} />}
      <style data-site-theme={theme.id} dangerouslySetInnerHTML={{ __html: siteThemeCss(theme) }} />
    </>
  );
};

export default SiteThemeStyles;
