import type { PassportCountry, Story } from "@/api/types";

export type PassportSort = "most" | "az" | "progress";
export type PassportFilter = "all" | "explored" | "unexplored";

const stampDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

export function formatStampDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : stampDateFormatter.format(date);
}

export function pickNextStamps(countries: PassportCountry[], limit = 3): PassportCountry[] {
  return countries
    .filter((country) => !country.explored && country.next_story !== null)
    .sort((left, right) => {
      const leftMinutes = left.next_story?.reading_time_minutes ?? null;
      const rightMinutes = right.next_story?.reading_time_minutes ?? null;
      if (leftMinutes === null && rightMinutes !== null) return 1;
      if (leftMinutes !== null && rightMinutes === null) return -1;
      if (leftMinutes !== null && rightMinutes !== null && leftMinutes !== rightMinutes) {
        return leftMinutes - rightMinutes;
      }
      return left.stories_available - right.stories_available || left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(0, limit));
}

export function sortCountries(countries: PassportCountry[], sort: PassportSort): PassportCountry[] {
  const result = [...countries];
  if (sort === "most") return result;
  if (sort === "az") return result.sort((left, right) => left.name.localeCompare(right.name));

  return result.sort((left, right) => {
    const leftProgress = left.stories_available > 0 ? left.stories_completed / left.stories_available : 0;
    const rightProgress = right.stories_available > 0 ? right.stories_completed / right.stories_available : 0;
    return rightProgress - leftProgress || Number(right.explored) - Number(left.explored);
  });
}

export function filterCountries(countries: PassportCountry[], filter: PassportFilter): PassportCountry[] {
  if (filter === "all") return [...countries];
  return countries.filter((country) => country.explored === (filter === "explored"));
}

export function sortByShortest(stories: Story[]): Story[] {
  return stories
    .map((story, index) => ({ story, index }))
    .sort((left, right) => {
      const leftMinutes = left.story.reading_time_minutes ?? null;
      const rightMinutes = right.story.reading_time_minutes ?? null;
      if (leftMinutes === null && rightMinutes !== null) return 1;
      if (leftMinutes !== null && rightMinutes === null) return -1;
      if (leftMinutes !== null && rightMinutes !== null && leftMinutes !== rightMinutes) {
        return leftMinutes - rightMinutes;
      }
      return left.index - right.index;
    })
    .map(({ story }) => story);
}

export function pluralStories(count: number): string {
  return `${count} ${count === 1 ? "story" : "stories"}`;
}
