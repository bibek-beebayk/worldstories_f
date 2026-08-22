import { SITE_URL } from "@/lib/buildMeta";
import { toast } from "@/components/ui/sonner";

export type ReferralChannel = "facebook" | "twitter" | "link";
export type ReferralSource = ReferralChannel | "direct";

export function normalizeReferralSource(ref: string | null | undefined): ReferralSource {
  return ref === "facebook" || ref === "twitter" || ref === "link" ? ref : "direct";
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
