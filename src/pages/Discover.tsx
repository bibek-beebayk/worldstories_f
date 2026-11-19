import { useEffect } from "react";
import { useLocation } from "react-router";
import FullScreenLoader from "@/components/FullScreenLoader";
import DiscoverHero from "@/components/discover/DiscoverHero";
import {
  BecauseYouRead,
  ExploreTheWorld,
  HiddenGems,
  JustAddedRail,
  PopularGenres,
  StoryJourneys,
  TrendingThisWeek,
} from "@/components/discover/DiscoverSections";
import { useDiscoverData } from "@/hooks/useDiscoverData";
import { storyApi } from "@/api/story";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/Discover";

export function meta() {
  return buildMeta({
    title: "Discover Stories | WorldStories",
    description:
      "Not sure what to read? Get a surprise, pick a mood and the time you have, see what readers are into this week, and explore stories by country.",
    path: "/discover",
  });
}

export async function loader() {
  try {
    return await storyApi.getDiscoverData();
  } catch {
    return undefined;
  }
}

const Discover = ({ loaderData }: Route.ComponentProps) => {
  const { data, isLoading, isError } = useDiscoverData(loaderData);
  const location = useLocation();

  useEffect(() => {
    if (!data || location.hash !== "#trending") return;
    requestAnimationFrame(() => document.getElementById("trending")?.scrollIntoView({ block: "start" }));
  }, [data, location.hash]);

  if (isLoading) return <FullScreenLoader />;
  if (isError || !data) return <div className="container mx-auto px-4 py-8">Failed to load discover content.</div>;

  const hasTrending = data.trending.length > 0;
  const hasGems = data.hidden_gems.length > 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <DiscoverHero />

      <main className="container mx-auto space-y-9 px-3 py-7 sm:space-y-11 sm:px-4 sm:py-9">
        <BecauseYouRead />

        {(hasTrending || hasGems) && (
          <div className={`grid grid-cols-1 gap-8 ${hasTrending && hasGems ? "lg:grid-cols-2 lg:gap-10" : ""}`}>
            <TrendingThisWeek items={data.trending} />
            <HiddenGems items={data.hidden_gems} />
          </div>
        )}

        <ExploreTheWorld countries={data.countries} />
        <StoryJourneys />
        <JustAddedRail items={data.just_added} />
        <PopularGenres genres={data.popular_genres} />
      </main>
    </div>
  );
};

export default Discover;
