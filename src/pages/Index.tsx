import FeaturedStoriesSection from "@/components/FeaturedStoriesSection";
import HomeHero from "@/components/home/HomeHero";
import HomeSections from "@/components/home/HomeSections";
import { buildDefaultHero, heroFontsUrl } from "@/components/home/heroPresets";
import { storyApi } from "@/api/story";
import { useHomeData } from "@/hooks/useHomeData";
import { buildMeta } from "@/lib/buildMeta";
import type { Route } from "./+types/Index";

// The homepage is the single highest-traffic, most SEO-critical page on the
// site — this is real first-paint content, not just meta-only like the
// dynamic per-item pages. Swallows failures rather than throwing: unlike the
// per-item pages, there's no "not found" case here, and letting this throw
// would replace the page's own isError UI with the top-level error
// boundary. Falling back to undefined just means useHomeData() fetches
// client-side as it always did.
export async function loader() {
  try {
    return await storyApi.getHomeData();
  } catch {
    return undefined;
  }
}

export function meta({ data }: Route.MetaArgs) {
  const tags = buildMeta({
    title: "WorldStories - Home of Stories",
    description:
      "WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres.",
    path: "/",
  });
  // The hero template's fonts, in <head> so the title renders in them on first paint.
  const fontsUrl = data?.hero ? heroFontsUrl(data.hero) : null;
  return fontsUrl ? [...tags, { tagName: "link", rel: "stylesheet", href: fontsUrl }] : tags;
}

const Index = ({ loaderData }: Route.ComponentProps) => {
  const { data, isLoading, isError } = useHomeData(loaderData);

  // Featured Stories is exempt from the dedup system entirely — it always
  // shows every story the team marked as featured. It still reserves them, so
  // the sections below don't show the exact same story a second time.
  const configuredDaily = data?.daily_story?.configured ? data.daily_story : null;
  const featuredStories = configuredDaily ? [configuredDaily.story] : data?.featured_stories ?? [];
  const hero = data?.hero ?? buildDefaultHero(data?.sidebar.stats);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_50%),linear-gradient(to_bottom,var(--theme-page-wash,#f8fafc),transparent_320px)]">
      <HomeHero hero={hero} />

      <main>
        {!isLoading && data && (
          <FeaturedStoriesSection
            stories={featuredStories}
            isDaily={Boolean(configuredDaily)}
            date={data.daily_story?.date}
            reason={configuredDaily?.featured_reason}
          />
        )}

        <div className="container px-3 py-8 sm:px-4 sm:py-10 md:py-12">
          <div className="space-y-8 md:space-y-10">
            {isLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                <p className="text-sm text-muted-foreground">Loading today's stories…</p>
              </div>
            )}

            {!isLoading && (isError || !data) && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  We couldn't load today's stories. Please refresh the page.
                </p>
              </div>
            )}

            {/* Everything below the featured band is the admin-managed section
                list (Admin → Homepage Sections): which sections exist, their
                order, content and layout all come from the server. */}
            {!isLoading && data && (
              <HomeSections sections={data.sections ?? []} reservedStories={featuredStories} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
