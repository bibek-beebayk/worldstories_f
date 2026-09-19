import { SITE_URL } from "@/lib/buildMeta";
import { toast } from "@/components/ui/sonner";

export type ReferralChannel = "facebook" | "twitter" | "link";
export type ReferralSource =
  | ReferralChannel
  | "direct"
  | "google"
  | "bing"
  | "duckduckgo"
  | "yahoo"
  | "yandex"
  | "baidu"
  | "instagram"
  | "pinterest"
  | "reddit"
  | "youtube"
  | "tiktok"
  | "other_site"
  // In-app navigation after the landing page; never derived from a referrer.
  | "internal";

export function normalizeReferralSource(ref: string | null | undefined): ReferralSource {
  return ref === "facebook" || ref === "twitter" || ref === "link" ? ref : "direct";
}

// Each pattern is anchored so "notgoogle.com" or "google.evil.com" can't match.
const REFERRER_PATTERNS: Array<[ReferralSource, RegExp]> = [
  ["google", /(^|\.)google\.(com?\.)?[a-z]{2,}$/],
  ["bing", /(^|\.)bing\.com$/],
  ["duckduckgo", /(^|\.)duckduckgo\.com$/],
  ["yahoo", /(^|\.)yahoo\.(com?\.)?[a-z]{2,}$/],
  ["yandex", /(^|\.)yandex\.(com?\.)?[a-z]{2,}$/],
  ["baidu", /(^|\.)baidu\.com$/],
  // l.facebook.com, m.facebook.com and lm.facebook.com are Facebook's link
  // shims and mobile hosts.
  ["facebook", /(^|\.)(facebook|fb)\.com$/],
  ["twitter", /(^|\.)twitter\.com$|^t\.co$|(^|\.)x\.com$/],
  ["instagram", /(^|\.)instagram\.com$/],
  ["pinterest", /(^|\.)pinterest\.(com?\.)?[a-z]{2,}$/],
  ["reddit", /(^|\.)(reddit\.com|redd\.it)$/],
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
];

/** Hosts that count as this site: production, www, local dev, and this
 * project's Netlify deploys/previews (e.g. deploy-preview-3--worldstories-f). */
export function isOwnHost(host: string, ownHosts: readonly string[]): boolean {
  const normalized = host.toLowerCase();
  if (ownHosts.some((own) => own.toLowerCase() === normalized)) return true;
  return normalized.endsWith(".netlify.app") && normalized.split(".")[0].includes("worldstories");
}

export function getOwnHosts(): string[] {
  const hosts = ["worldstories.net", "www.worldstories.net", "localhost", "127.0.0.1"];
  try {
    hosts.push(new URL(SITE_URL).hostname);
    if (typeof window !== "undefined") hosts.push(window.location.hostname);
  } catch {
    // SITE_URL is a build-time constant; a malformed one just leaves the defaults.
  }
  return hosts;
}

/**
 * Classifies a document.referrer. Returns only the lowercase hostname, never
 * the path or query (which can carry search terms or tokens). An empty,
 * malformed or own-site referrer is "direct" with no host.
 */
export function classifyReferrer(
  referrer: string | null | undefined,
  ownHosts: readonly string[]
): { source: ReferralSource; host: string } {
  if (!referrer) return { source: "direct", host: "" };
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return { source: "direct", host: "" };
  }
  if (!host || isOwnHost(host, ownHosts)) return { source: "direct", host: "" };
  const match = REFERRER_PATTERNS.find(([, pattern]) => pattern.test(host));
  return { source: match ? match[0] : "other_site", host };
}

const UTM_MAX_LENGTH = 40;

function cleanUtm(value: string | null): string {
  return (value ?? "").trim().toLowerCase().slice(0, UTM_MAX_LENGTH);
}

// A campaign's utm_source names are free-form, so only ones that are really
// one of our known channels become the referral_source; anything else is
// bucketed as other_site and stays visible in the raw utm_source metadata.
function referralFromUtmSource(utmSource: string): ReferralSource {
  const aliases: Record<string, ReferralSource> = {
    fb: "facebook",
    x: "twitter",
    ig: "instagram",
    yt: "youtube",
    ddg: "duckduckgo",
  };
  const candidate = (aliases[utmSource] ?? utmSource) as ReferralSource;
  const known: ReferralSource[] = [
    "facebook", "twitter", "google", "bing", "duckduckgo", "yahoo", "yandex", "baidu",
    "instagram", "pinterest", "reddit", "youtube", "tiktok",
  ];
  return known.includes(candidate) ? candidate : "other_site";
}

/**
 * How a visitor arrived, for the landing page load only.
 * Precedence: valid ?ref= > utm_source > document.referrer > direct.
 */
export function resolveLandingReferral(
  search: string,
  referrer: string | null | undefined,
  ownHosts: readonly string[]
): {
  referral_source: ReferralSource;
  referrer_host?: string;
  utm_source?: string;
  utm_medium?: string;
} {
  const params = new URLSearchParams(search);
  const ref = params.get("ref");
  const utmSource = cleanUtm(params.get("utm_source"));
  const utmMedium = cleanUtm(params.get("utm_medium"));
  const fromReferrer = classifyReferrer(referrer, ownHosts);

  let source: ReferralSource;
  if (ref === "facebook" || ref === "twitter" || ref === "link") source = ref;
  else if (utmSource) source = referralFromUtmSource(utmSource);
  else source = fromReferrer.source;

  return {
    referral_source: source,
    ...(fromReferrer.host ? { referrer_host: fromReferrer.host } : {}),
    ...(utmSource ? { utm_source: utmSource } : {}),
    ...(utmMedium ? { utm_medium: utmMedium } : {}),
  };
}

// document.referrer never changes over an SPA session, so only the first visit
// of a page load may use it; every later route change is in-app navigation.
let landingVisitSent = false;

export function buildVisitMetadata(
  pathname: string,
  search: string,
  referrer: string | null | undefined,
  ownHosts: readonly string[]
): Record<string, string | boolean> {
  if (landingVisitSent) return { path: pathname, referral_source: "internal" };
  landingVisitSent = true;
  return {
    path: pathname,
    ...resolveLandingReferral(search, referrer, ownHosts),
    landing: true,
  };
}

export function buildShareUrl(path: string, channel: ReferralChannel): string {
  return `${SITE_URL}${path}?ref=${channel}`;
}

function openShareWindow(url: string) {
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
}

export function shareToFacebook(path: string) {
  openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildShareUrl(path, "facebook"))}`);
}

export function shareToTwitter(path: string, title: string) {
  openShareWindow(
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(buildShareUrl(path, "twitter"))}&text=${encodeURIComponent(title)}`
  );
}

export async function copyShareLink(path: string) {
  try {
    await navigator.clipboard.writeText(buildShareUrl(path, "link"));
    toast.success("Link copied to clipboard.");
  } catch {
    toast.error("Couldn't copy the link. Please copy it manually.");
  }
}
