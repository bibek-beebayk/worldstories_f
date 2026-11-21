export const formatBlogDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

export const wasBlogMeaningfullyUpdated = (publishedAt: string, updatedAt: string) =>
  new Date(updatedAt).getTime() - new Date(publishedAt).getTime() > 24 * 60 * 60 * 1000;

export const blogReadingLabel = (minutes?: number | null) => (minutes && minutes > 0 ? `${minutes} min read` : null);
