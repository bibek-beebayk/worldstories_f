import type { AdminHomeSection } from "@/api/types";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Small badges for a row: who sees the section and when it is live. */
export const audienceBadges = (
  section: Pick<AdminHomeSection, "show_to" | "starts_at" | "ends_at">,
  now = Date.now()
) => {
  const badges: string[] = [];
  if (section.show_to === "signed_in") badges.push("Signed-in only");
  if (section.show_to === "signed_out") badges.push("Signed-out only");
  const starts = section.starts_at ? new Date(section.starts_at).getTime() : null;
  const ends = section.ends_at ? new Date(section.ends_at).getTime() : null;
  if (ends !== null && ends <= now) badges.push("Ended");
  else if (starts !== null && starts > now) badges.push(`Starts ${shortDate(section.starts_at as string)}`);
  else if (ends !== null) badges.push(`Until ${shortDate(section.ends_at as string)}`);
  else if (starts !== null) badges.push(`Since ${shortDate(section.starts_at as string)}`);
  return badges;
};

