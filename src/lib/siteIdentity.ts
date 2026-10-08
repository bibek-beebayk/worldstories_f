import { useRouteLoaderData } from "react-router";

/**
 * Who the site says it's run by, on About, Contact and the footer. Which one
 * shows is the admin's "Show publisher info" switch (Customize → Site
 * Settings), delivered by the root loader as `siteSettings`.
 */
export interface SiteIdentity {
  showPublisher: boolean;
  /** Who to contact: the publisher, or simply "WorldStories". */
  contactName: string;
  email: string;
  /** Only when the publisher is shown. */
  location: string | null;
  /** The footer's line after the copyright, if any. */
  footerCredit: string | null;
}

export const PUBLISHER_IDENTITY: SiteIdentity = {
  showPublisher: true,
  contactName: "Bibek Gautam",
  email: "beebayk0001@gmail.com",
  location: "Kathmandu, Nepal",
  footerCredit: "Owned and operated by Bibek Gautam",
};

export const BASIC_IDENTITY: SiteIdentity = {
  showPublisher: false,
  contactName: "WorldStories",
  email: "worldstoriesnet@gmail.com",
  location: null,
  footerCredit: null,
};

export interface SiteSettings {
  show_publisher_info: boolean;
}

export const identityFor = (settings: SiteSettings | null | undefined) =>
  settings?.show_publisher_info ? PUBLISHER_IDENTITY : BASIC_IDENTITY;

/** For components. Defaults to the basic details if settings didn't load. */
export const useSiteIdentity = () => {
  const data = useRouteLoaderData("root") as { siteSettings?: SiteSettings } | undefined;
  return identityFor(data?.siteSettings);
};

/** For meta() functions, which get route matches rather than hooks. */
export const identityFromMatches = (matches: readonly ({ id: string; data?: unknown } | undefined)[]) => {
  const root = matches.find((match) => match?.id === "root");
  return identityFor((root?.data as { siteSettings?: SiteSettings } | undefined)?.siteSettings);
};
