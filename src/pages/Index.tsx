import { useEffect, useState } from "react";
import HeroSection from "@/components/HeroSection";
import ContinueReadingSection from "@/components/ContinueReadingSection";
import AdSpace from "@/components/AdSpace";
import StoryCard from "@/components/StoryCard";
import TrendingList from "@/components/TrendingList";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AUTH_CHANGE_EVENT, getAccessToken } from "@/api/client";
import { useHomeData } from "@/hooks/useHomeData";
import { useContinueReading } from "@/hooks/useContinueReading";
import { ArrowRight, BookOpenText, Compass, Flame, Sparkles, Users } from "lucide-react";
import { ComponentType } from "react";
import { formatViews } from "@/lib/utils";
import Seo from "@/components/Seo";

const SectionTitle = ({
  icon: Icon,
  title,
  subtitle,
  seeAllHref,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  seeAllHref?: string;
}) => (
  <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5 sm:gap-4">
    <div>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <Icon className="h-3.5 w-3.5" />
        <span>{title}</span>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
    </div>
    {seeAllHref && (
      <Link
        to={seeAllHref}
        className="mb-1 flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline sm:text-sm"
      >
        See all
        <ArrowRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAccessToken()));
  const { data, isLoading, isError } = useHomeData();
  const {
    data: continueReadingData,
    isLoading: isContinueReadingLoading,
    isError: isContinueReadingError,
  } = useContinueReading(isLoggedIn);

  useEffect(() => {
    const syncAuthState = () => {
      setIsLoggedIn(Boolean(getAccessToken()));
    };

    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    window.addEventListener("storage", syncAuthState);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_50%),linear-gradient(to_bottom,#f8fafc,transparent_320px)]">
      <Seo
        title="WorldStories - Home of Stories"
        description="WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres."
        path="/"
      />
      {/* Renders immediately with its own "Welcome to WorldStories" fallback copy —
          never blocked behind the home-data fetch, so the page's purpose is visible
          the instant it loads instead of hiding behind a full-screen spinner. */}
      <HeroSection featuredStories={data?.featured_stories ?? []} />

      <div className="container px-3 py-8 sm:px-4 sm:py-10 md:py-12">
        <main className="space-y-8 md:space-y-10">
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

          {!isLoading && data && (
            <>
          {isLoggedIn &&
            !isContinueReadingLoading &&
            !isContinueReadingError &&
            (continueReadingData?.results.length || 0) > 0 && (
            <ContinueReadingSection
              items={continueReadingData!.results}
              isLoading={false}
              isError={false}
            />
          )}

          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-xl border border-border bg-card p-4 sm:rounded-2xl sm:p-5">
              <SectionTitle
                icon={Sparkles}
                title="Weekly Spotlight"
                subtitle="Handpicked stories with high engagement this week."
              />

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {data.weekly_spotlight.slice(0, 6).map((story) => (
                  <StoryCard key={story.id} {...story} compact />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 sm:rounded-2xl sm:p-5">
                <SectionTitle
                  icon={Users}
                  title="Community Pulse"
                  subtitle="Live platform growth snapshot."
                />
                <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
                  <div className="rounded-lg bg-muted/60 px-3 py-4">
                    <div className="text-base font-bold sm:text-xl">{formatViews(data.sidebar.stats.creators)}</div>
                    <div className="text-xs text-muted-foreground">Creators</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-3 py-4">
                    <div className="text-base font-bold sm:text-xl">{formatViews(data.sidebar.stats.stories)}</div>
                    <div className="text-xs text-muted-foreground">Stories</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-3 py-4">
                    <div className="text-base font-bold sm:text-xl">{formatViews(data.sidebar.stats.readers)}</div>
                    <div className="text-xs text-muted-foreground">Readers</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:rounded-2xl sm:p-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
                  Reader Journey
                </p>
                <h3 className="text-base font-semibold leading-tight sm:text-lg">Find a new story in under 2 minutes</h3>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                  Jump into curated genres and keep your reading streak going.
                </p>
                <Button asChild className="mt-4 w-full">
                  <Link to="/library">Explore Library</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:rounded-2xl sm:p-5">
            <SectionTitle
              icon={Compass}
              title="Discover Your Next Read"
              subtitle="Switch tabs to browse by intent."
              seeAllHref="/discover"
            />
            <Tabs defaultValue="recommended" className="w-full">
              <TabsList className="mb-5 grid h-auto w-full grid-cols-3 gap-1 rounded-xl p-1">
                <TabsTrigger value="recommended" className="text-xs sm:text-sm">For You</TabsTrigger>
                <TabsTrigger value="popular" className="text-xs sm:text-sm">Popular</TabsTrigger>
                <TabsTrigger value="new" className="text-xs sm:text-sm">New</TabsTrigger>
              </TabsList>

              <TabsContent value="recommended">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
                  {data.tabs.recommended.slice(0, 12).map((story) => (
                    <StoryCard key={story.id} {...story} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="popular">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
                  {data.tabs.popular.slice(0, 12).map((story) => (
                    <StoryCard key={story.id} {...story} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="new">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
                  {data.tabs.new.slice(0, 12).map((story) => (
                    <StoryCard key={story.id} {...story} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </section>

          <AdSpace size="banner" />

          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl border border-border bg-card p-4 sm:rounded-2xl sm:p-5">
              <SectionTitle
                icon={Flame}
                title="New & Trending"
                subtitle="Stories readers are actively sharing."
                seeAllHref="/trending"
              />
              <TrendingList stories={data.new_trending.slice(0, 8)} />
            </div>

            <div className="rounded-xl border border-border bg-card p-4 sm:rounded-2xl sm:p-5">
              <SectionTitle
                icon={BookOpenText}
                title="From The Editorial Desk"
                subtitle="Fresh picks from the team."
              />
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {data.sidebar.recommended.slice(0, 6).map((story) => (
                  <StoryCard key={story.id} {...story} />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 sm:rounded-2xl sm:p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Continue Discovering</p>
                <h2 className="text-lg font-semibold sm:text-xl">More stories for your reading queue</h2>
              </div>
            </div>
            <Carousel opts={{ align: "start" }} className="px-1">
              <CarouselContent>
                {data.more_to_explore.map((story) => (
                  <CarouselItem key={story.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <StoryCard {...story} compact />
                  </CarouselItem>
                ))}
                <CarouselItem className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <Link
                    to="/library"
                    className="flex aspect-[4/5] flex-col justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 transition-colors hover:border-primary/50 hover:bg-primary/10"
                  >
                    <div>
                      <div className="mb-3 inline-flex rounded-full border border-primary/20 bg-background/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-primary">
                        Show All
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Explore the full library
                      </h3>
                      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                        Browse every available story and find your next favorite read.
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 text-xs font-medium text-primary">
                      <span>Open library</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
