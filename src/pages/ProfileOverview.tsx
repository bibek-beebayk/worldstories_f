import { Card, CardContent } from "@/components/ui/card";
import { authApi } from "@/api/auth";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Headphones, Heart, MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { useOutletContext } from "react-router";
import ProfileInsights from "@/components/ProfileInsights";
import ReadingJourneyPanel from "@/components/ReadingJourneyPanel";
import WeeklyRecapCard from "@/components/WeeklyRecapCard";
import type { ProfileOutletContext } from "@/layouts/ProfileShellLayout";

const ProfileOverview = () => {
  const isAuthenticated = useIsLoggedIn();
  const { profile, readingStreak } = useOutletContext<ProfileOutletContext>();

  const {
    data: profileInsights,
    isLoading: profileInsightsLoading,
    isError: profileInsightsError,
  } = useQuery({
    queryKey: ["profile-insights"],
    queryFn: authApi.getProfileInsights,
    enabled: isAuthenticated,
  });

  const stats = useMemo(
    () => [
      { key: "favorites", icon: Heart, value: profile.favorites_count || 0, label: "Favorites", color: "text-red-500" },
      { key: "reviews", icon: MessageSquare, value: profile.reviews_count || 0, label: "Reviews", color: "text-blue-500" },
      { key: "reading", icon: BookMarked, value: profile.reading_in_progress_count || 0, label: "Reading In Progress", color: "text-emerald-500" },
      { key: "listening", icon: Headphones, value: profile.listening_in_progress_count || 0, label: "Listening In Progress", color: "text-purple-500" },
    ],
    [profile]
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-5 w-5 ${item.color}`} />
                <div>
                  <p className="text-lg font-semibold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Above the all-time journey panel: the recent week is the more
          actionable of the two, and the one worth coming back for. */}
      <WeeklyRecapCard enabled={isAuthenticated} />

      <ReadingJourneyPanel insights={profileInsights} streak={readingStreak} isLoading={profileInsightsLoading} />

      <ProfileInsights data={profileInsights} isLoading={profileInsightsLoading} isError={profileInsightsError} />
    </>
  );
};

export default ProfileOverview;
