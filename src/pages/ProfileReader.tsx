import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfilePagination from "@/components/profile/ProfilePagination";
import ProfileStoryRow from "@/components/profile/ProfileStoryRow";
import { authApi } from "@/api/auth";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import AchievementsSection from "@/components/AchievementsSection";
import { buildMeta } from "@/lib/buildMeta";

export function meta() {
  return buildMeta({
    title: "Reader | Your Profile | WorldStories",
    path: "/profile/reader",
    noIndex: true,
  });
}

type ReaderView = "reading" | "completed" | "history" | "achievements" | "listening" | "favorites" | "reviews";
const readerViews: ReaderView[] = ["reading", "completed", "history", "achievements", "listening", "favorites", "reviews"];
const readerNavItems: Array<{ key: ReaderView; label: string }> = [
  { key: "reading", label: "Continue Reading" },
  { key: "completed", label: "Completed" },
  { key: "history", label: "Reading History" },
  { key: "achievements", label: "Achievements" },
  { key: "listening", label: "Continue Listening" },
  { key: "favorites", label: "Favorites" },
  { key: "reviews", label: "Reviews" },
];

const ProfileReader = () => {
  const navigate = useNavigate();
  const isAuthenticated = useIsLoggedIn();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeView, setActiveView] = useState<ReaderView>("reading");

  const [readingPage, setReadingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [listeningPage, setListeningPage] = useState(1);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);

  // ?view= is how ContinueReadingSection/ReadingJourneyCard/achievementUnlock
  // deep-link here (e.g. /profile/reader?view=achievements) — kept as a
  // query param rather than its own nested route since these 7 views are a
  // second-level tab set within one page, not top-level sections.
  useEffect(() => {
    const view = searchParams.get("view");
    if (view && readerViews.includes(view as ReaderView)) {
      setActiveView(view as ReaderView);
    }
  }, [searchParams]);

  const selectView = (view: ReaderView) => {
    setActiveView(view);
    const next = new URLSearchParams(searchParams);
    next.set("view", view);
    setSearchParams(next, { replace: true });
  };

  const { data: readingData } = useQuery({
    queryKey: ["profile-continue-reading", readingPage],
    queryFn: () => authApi.getContinueReading(readingPage),
    enabled: isAuthenticated && activeView === "reading",
  });

  const { data: listeningData } = useQuery({
    queryKey: ["profile-continue-listening", listeningPage],
    queryFn: () => authApi.getContinueListening(listeningPage),
    enabled: isAuthenticated && activeView === "listening",
  });

  const { data: completedData } = useQuery({
    queryKey: ["profile-completed-reading", completedPage],
    queryFn: () => authApi.getCompletedReading(completedPage),
    enabled: isAuthenticated && activeView === "completed",
  });

  const { data: historyData } = useQuery({
    queryKey: ["profile-reading-history", historyPage],
    queryFn: () => authApi.getReadingHistory(historyPage),
    enabled: isAuthenticated && activeView === "history",
  });

  const { data: achievementsData, isLoading: achievementsLoading } = useQuery({
    queryKey: ["profile-achievements"],
    queryFn: authApi.getAchievements,
    enabled: isAuthenticated && activeView === "achievements",
  });

  const { data: favoritesData } = useQuery({
    queryKey: ["profile-favorites", favoritesPage],
    queryFn: () => authApi.getFavorites(favoritesPage),
    enabled: isAuthenticated && activeView === "favorites",
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["profile-reviews", reviewsPage],
    queryFn: () => authApi.getMyReviews(reviewsPage),
    enabled: isAuthenticated && activeView === "reviews",
  });

  return (
    <>
      {/* A single compact dropdown on mobile instead of a whole row of
          buttons/a scrollable pill list eating vertical space; the button
          row comes back from sm: up, where there's room for it. */}
      <div className="sm:hidden">
        <Select value={activeView} onValueChange={(value) => selectView(value as ReaderView)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {readerNavItems.map((item) => (
              <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="hidden min-w-0 overflow-hidden sm:block">
        <CardContent className="min-w-0 overflow-hidden p-3 sm:p-4">
          <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex w-max gap-2">
              {readerNavItems.map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={activeView === item.key ? "default" : "outline"}
                  onClick={() => selectView(item.key)}
                  className={`shrink-0 ${activeView === item.key ? "shadow-sm" : ""}`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {activeView === "reading" && (
        <Card className="min-w-0 overflow-hidden shadow-sm">
          <CardContent className="min-w-0 overflow-hidden p-5">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {(readingData?.results || []).map((item) => (
                <ProfileStoryRow
                  key={`${item.story.id}-${item.chapter_slug}`}
                  coverImage={item.story.cover_image}
                  title={item.story.title}
                  author={item.story.author}
                  linkTo={`/read/${item.story.slug}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 min-w-0 font-medium">{item.story.title}</p>
                    <p className="shrink-0 text-sm text-muted-foreground">{Math.round(item.overall_progress * 100)}% complete</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.chapter_title || "Current chapter"}</p>
                  {item.excerpt && <p className="mt-1 line-clamp-2 text-sm italic text-muted-foreground">{item.excerpt}</p>}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${Math.round(item.overall_progress * 100)}%` }} />
                  </div>
                  {item.chapter_slug ? (
                    <Link to={`/read/${item.story.slug}/${item.chapter_slug}`}>
                      <Button size="sm" className="mt-3">Continue Reading</Button>
                    </Link>
                  ) : (
                    <Button size="sm" className="mt-3" variant="outline" disabled>Continue Reading</Button>
                  )}
                </ProfileStoryRow>
              ))}
            </div>
            {(readingData?.results?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">No reading progress available.</p>
            )}
            <ProfilePagination
              page={readingData?.pagination?.page || 1}
              pages={readingData?.pagination?.pages || 1}
              onPageChange={setReadingPage}
            />
          </CardContent>
        </Card>
      )}

      {activeView === "completed" && (
        <Card className="min-w-0 overflow-hidden shadow-sm">
          <CardContent className="min-w-0 overflow-hidden p-5">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {(completedData?.results || []).map((item) => (
                <ProfileStoryRow
                  key={`${item.story.id}-${item.updated_at}`}
                  coverImage={item.story.cover_image}
                  title={item.story.title}
                  author={item.story.author}
                  linkTo={`/read/${item.story.slug}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 min-w-0 font-medium">{item.story.title}</p>
                    <p className="shrink-0 text-sm text-emerald-600">100% complete</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Completed {new Date(item.updated_at).toLocaleDateString()}
                  </p>
                  <Link to={`/read/${item.story.slug}`}>
                    <Button size="sm" className="mt-3" variant="outline">View Story</Button>
                  </Link>
                </ProfileStoryRow>
              ))}
            </div>
            {(completedData?.results?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">No completed stories available.</p>
            )}
            <ProfilePagination
              page={completedData?.pagination?.page || 1}
              pages={completedData?.pagination?.pages || 1}
              onPageChange={setCompletedPage}
            />
          </CardContent>
        </Card>
      )}

      {activeView === "history" && (
        <Card className="min-w-0 overflow-hidden shadow-sm">
          <CardContent className="min-w-0 overflow-hidden p-5">
            <p className="mb-4 text-sm text-muted-foreground">
              Everything you have opened, most recently first — finished or not.
            </p>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {(historyData?.results || []).map((item) => (
                <ProfileStoryRow
                  key={item.story.id}
                  coverImage={item.story.cover_image}
                  title={item.story.title}
                  author={item.story.author}
                  linkTo={`/read/${item.story.slug}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 min-w-0 font-medium">{item.story.title}</p>
                    {item.completed ? (
                      <p className="shrink-0 text-sm text-emerald-600">Completed</p>
                    ) : (
                      <p className="shrink-0 text-sm text-muted-foreground">
                        {Math.round(Math.max(0, Math.min(1, item.progress)) * 100)}%
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last read {new Date(item.last_read_at).toLocaleDateString()}
                  </p>
                  <Link to={`/read/${item.story.slug}`}>
                    <Button size="sm" className="mt-3" variant="outline">View Story</Button>
                  </Link>
                </ProfileStoryRow>
              ))}
            </div>
            {(historyData?.results?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">You haven't opened any stories yet.</p>
            )}
            <ProfilePagination
              page={historyData?.pagination?.page || 1}
              pages={historyData?.pagination?.pages || 1}
              onPageChange={setHistoryPage}
            />
          </CardContent>
        </Card>
      )}

      {activeView === "achievements" && <AchievementsSection data={achievementsData} isLoading={achievementsLoading} />}

      {activeView === "listening" && (
        <Card className="min-w-0 overflow-hidden shadow-sm">
          <CardContent className="min-w-0 overflow-hidden p-5">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {(listeningData?.results || []).map((item) => (
                <ProfileStoryRow
                  key={`${item.story.id}-${item.audio_slug}`}
                  coverImage={item.story.cover_image}
                  title={item.story.title}
                  author={item.story.author}
                  linkTo={`/listen/${item.story.slug}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 min-w-0 font-medium">{item.story.title}</p>
                    <p className="shrink-0 text-sm text-muted-foreground">{Math.round(item.overall_progress * 100)}% complete</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.audio_title || "Current audio"}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${Math.round(item.overall_progress * 100)}%` }} />
                  </div>
                  {item.audio_slug ? (
                    <Link to={`/listen/${item.story.slug}/${item.audio_slug}`}>
                      <Button size="sm" className="mt-3">Continue Listening</Button>
                    </Link>
                  ) : (
                    <Button size="sm" className="mt-3" variant="outline" disabled>Continue Listening</Button>
                  )}
                </ProfileStoryRow>
              ))}
            </div>
            {(listeningData?.results?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">No listening progress available.</p>
            )}
            <ProfilePagination
              page={listeningData?.pagination?.page || 1}
              pages={listeningData?.pagination?.pages || 1}
              onPageChange={setListeningPage}
            />
          </CardContent>
        </Card>
      )}

      {activeView === "favorites" && (
        <Card className="min-w-0 overflow-hidden shadow-sm">
          <CardContent className="min-w-0 overflow-hidden p-5">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {(favoritesData?.results || []).map((item) => (
                <ProfileStoryRow
                  key={item.id}
                  coverImage={item.story.cover_image}
                  title={item.story.title}
                  author={item.story.author}
                  linkTo={`/read/${item.story.slug}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 min-w-0 font-medium">{item.story.title}</p>
                      <p className="text-xs text-muted-foreground">Added {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/read/${item.story.slug}`)}>View</Button>
                  </div>
                </ProfileStoryRow>
              ))}
            </div>
            {(favoritesData?.results?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">No favorites yet.</p>
            )}
            <ProfilePagination
              page={favoritesData?.pagination?.page || 1}
              pages={favoritesData?.pagination?.pages || 1}
              onPageChange={setFavoritesPage}
            />
          </CardContent>
        </Card>
      )}

      {activeView === "reviews" && (
        <Card className="min-w-0 overflow-hidden shadow-sm">
          <CardContent className="min-w-0 overflow-hidden p-5">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {(reviewsData?.results || []).map((item) => (
                <ProfileStoryRow
                  key={item.id}
                  coverImage={item.story.cover_image}
                  title={item.story.title}
                  author={item.story.author}
                  linkTo={`/read/${item.story.slug}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 min-w-0 font-medium">{item.story.title}</p>
                    <p className="shrink-0 text-sm text-muted-foreground">{item.rating}/5</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.comment || "No review comment."}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated {new Date(item.updated_at).toLocaleDateString()}
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate(`/read/${item.story.slug}`)}>
                    Open Story
                  </Button>
                </ProfileStoryRow>
              ))}
            </div>
            {(reviewsData?.results?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
            <ProfilePagination
              page={reviewsData?.pagination?.page || 1}
              pages={reviewsData?.pagination?.pages || 1}
              onPageChange={setReviewsPage}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ProfileReader;
