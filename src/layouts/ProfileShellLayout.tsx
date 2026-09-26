import FullScreenLoader from "@/components/FullScreenLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/api/auth";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useAuthModal } from "@/context/AuthModalContext";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, FileText, Flame, LayoutGrid, Settings } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { buildMeta } from "@/lib/buildMeta";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import type { UserProfile, ReadingStreakResponse } from "@/api/types";

export function meta() {
  return buildMeta({
    title: "Your Profile | WorldStories",
    description: "Manage your WorldStories profile, library, and reading activity.",
    path: "/profile",
    noIndex: true,
  });
}

export type ProfileOutletContext = {
  profile: UserProfile;
  readingStreak: ReadingStreakResponse | undefined;
};

const profileNavItems: Array<{ to: string; end: boolean; label: string; icon: typeof LayoutGrid; helper: string }> = [
  { to: "/profile", end: true, label: "Overview", icon: LayoutGrid, helper: "General account summary." },
  { to: "/profile/reader", end: false, label: "Reader", icon: BookMarked, helper: "Reading, listening, favorites and reviews." },
  { to: "/profile/creator", end: false, label: "Creator", icon: FileText, helper: "Story submissions and moderation status." },
  { to: "/profile/settings", end: false, label: "Settings", icon: Settings, helper: "Manage profile details and preferences." },
];

// Sidebar+pages shell for /profile and its nested routes, mirroring the
// admin panel's AdminShellLayout (persistent nav, content swaps via
// Outlet) instead of the old single-page tab-switcher. Auth-gates here so
// every nested profile page can assume `profile` is available via
// useOutletContext<ProfileOutletContext>() rather than each re-checking.
const ProfileShellLayout = () => {
  const isAuthenticated = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const headerBottom = useHeaderHeight();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: readingStreak } = useQuery({
    queryKey: ["reading-streak"],
    queryFn: authApi.getReadingStreak,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              <button type="button" onClick={openLoginModal} className="text-primary hover:underline">
                Login
              </button>{" "}
              to view and manage your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <FullScreenLoader />;

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6 text-center text-muted-foreground">
            Unable to load your profile. Check your connection and try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  const userInfo = (
    <div className="flex items-center gap-3 border-t pt-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={profile.avatar_url || ""} />
        <AvatarFallback>
          {(profile.display_name || profile.username || profile.email || "U").slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{profile.display_name || profile.username}</p>
        <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">@{profile.username}</Badge>
          {readingStreak && readingStreak.current_streak > 0 && (
            <Badge variant="outline" className="gap-1 border-orange-200 text-[10px] text-orange-600">
              <Flame className="h-3 w-3" />
              {readingStreak.current_streak} day{readingStreak.current_streak === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100">
      {/* Mobile/tablet: a fixed bottom tab bar (icons + short labels) instead
          of a "Modules" button that ate a full row of the page — this takes
          zero space in the content flow since it's overlaid, the way a
          native app's tab bar works. Desktop keeps the persistent sidebar. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card lg:hidden">
        {profileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="w-full px-3 pb-20 pt-4 sm:px-4 sm:pb-24 sm:pt-6 lg:px-6 lg:pb-6 lg:pt-6">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
          {/* Sticky to the viewport (offset by the site header's own live
              height) rather than scrolling away with the page — mirrors the
              admin panel's fixed-height sidebar, adapted for this page still
              sitting inside the normal site header/footer layout instead of
              owning the whole viewport the way the admin shell does. */}
          <aside
            className="sticky hidden flex-col lg:flex"
            style={{
              top: headerBottom > 0 ? headerBottom + 16 : undefined,
              height: headerBottom > 0 ? `calc(100vh - ${headerBottom}px - 32px)` : undefined,
            }}
          >
            <Card className="flex h-full min-h-0 flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modules</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {profileNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `block w-full rounded-md border px-3 py-2 text-left transition ${
                          isActive ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </div>
                          <p className={`mt-1 text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {item.helper}
                          </p>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
                {userInfo}
              </CardContent>
            </Card>
          </aside>

          <section className="min-w-0 space-y-4">
            <Outlet context={{ profile, readingStreak } satisfies ProfileOutletContext} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default ProfileShellLayout;
