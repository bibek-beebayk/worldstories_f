import type { AdminAnalyticsRangeDays } from "@/api/types";

// Shared by the Analytics page and the Overview so both offer the same ranges.
export const RANGE_OPTIONS: { value: AdminAnalyticsRangeDays; label: string }[] = [
  { value: 1, label: "Last 24 hours" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
  { value: "all", label: "All time" },
];

export const parseRangeDays = (raw: string | null): AdminAnalyticsRangeDays | null => {
  if (raw === null) return null;
  const match = RANGE_OPTIONS.find((option) => String(option.value) === raw);
  return match ? match.value : null;
};
