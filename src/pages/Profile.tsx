import FullScreenLoader from "@/components/FullScreenLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { storyApi } from "@/api/story";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked,
  FileText,
  Headphones,
  Heart,
  LayoutGrid,
  MessageSquare,
  Settings,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type ProfileSection = "overview" | "reader" | "creator" | "settings";
type ReaderView =
  | "reading"
  | "completed"
  | "listening"
  | "favorites"
  | "reviews";

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const [activeSection, setActiveSection] = useState<ProfileSection>("overview");
  const [activeReaderView, setActiveReaderView] = useState<ReaderView>("reading");

  const [readingPage, setReadingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [listeningPage, setListeningPage] = useState(1);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [submissionsPage, setSubmissionsPage] = useState(1);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const isOverviewSection = activeSection === "overview";
  const isReaderSection = activeSection === "reader";
  const shouldLoadReading = isOverviewSection || (isReaderSection && activeReaderView === "reading");
  const shouldLoadCompleted = isOverviewSection || (isReaderSection && activeReaderView === "completed");
  const shouldLoadListening = isOverviewSection || (isReaderSection && activeReaderView === "listening");
  const shouldLoadFavorites = isOverviewSection || (isReaderSection && activeReaderView === "favorites");
  const shouldLoadReviews = isOverviewSection || (isReaderSection && activeReaderView === "reviews");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });

  const { data: readingData } = useQuery({
    queryKey: ["profile-continue-reading", readingPage],
    queryFn: () => authApi.getContinueReading(readingPage),
    enabled: isAuthenticated && shouldLoadReading,
  });

  const { data: listeningData } = useQuery({
    queryKey: ["profile-continue-listening", listeningPage],
    queryFn: () => authApi.getContinueListening(listeningPage),
    enabled: isAuthenticated && shouldLoadListening,
  });

  const { data: completedData } = useQuery({
    queryKey: ["profile-completed-reading", completedPage],
    queryFn: () => authApi.getCompletedReading(completedPage),
    enabled: isAuthenticated && shouldLoadCompleted,
  });

  const { data: favoritesData } = useQuery({
    queryKey: ["profile-favorites", favoritesPage],
    queryFn: () => authApi.getFavorites(favoritesPage),
    enabled: isAuthenticated && shouldLoadFavorites,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["profile-reviews", reviewsPage],
    queryFn: () => authApi.getMyReviews(reviewsPage),
    enabled: isAuthenticated && shouldLoadReviews,
  });

  const { data: submissionsData } = useQuery({
    queryKey: ["profile-submissions", submissionsPage],
    queryFn: () => storyApi.getMySubmissions(submissionsPage),
    enabled: isAuthenticated && (activeSection === "creator" || activeSection === "overview"),
  });

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username || "");
    setDisplayName(profile.display_name || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatar_url || "");
  }, [profile]);

  const stats = useMemo(
    () => [
      {
        key: "favorites",
        icon: Heart,
        value: profile?.favorites_count || 0,
        label: "Favorites",
        color: "text-red-500",
      },
      {
        key: "reviews",
        icon: MessageSquare,
        value: profile?.reviews_count || 0,
        label: "Reviews",
        color: "text-blue-500",
      },
      {
        key: "reading",
        icon: BookMarked,
        value: profile?.reading_in_progress_count || 0,
        label: "Reading In Progress",
        color: "text-emerald-500",
      },
      {
        key: "listening",
        icon: Headphones,
        value: profile?.listening_in_progress_count || 0,
        label: "Listening In Progress",
        color: "text-purple-500",
      },
    ],
    [profile]
  );

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>{" "}
              to view and manage your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !profile) return <FullScreenLoader />;

  const onSaveProfile = async () => {
    setSaveError("");
    setSaveLoading(true);
    try {
      await authApi.updateMe({
        username: username.trim(),
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ["profile-me"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile.";
      setSaveError(message);
    } finally {
      setSaveLoading(false);
    }
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) => {
    if (!totalPages || totalPages <= 1) return null;
    return (
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Next
        </Button>
      </div>
    );
  };

  const renderSubmissionStatus = (status: string) => {
    if (status === "approved") {
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
    }
    if (status === "rejected") {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending Review</Badge>;
  };

  const readerNavItems: Array<{ key: ReaderView; label: string }> = [
    { key: "reading", label: "Continue Reading" },
    { key: "completed", label: "Completed" },
    { key: "listening", label: "Continue Listening" },
    { key: "favorites", label: "Favorites" },
    { key: "reviews", label: "Reviews" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-background to-background">
      <main className="container mx-auto px-4 py-8 lg:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback>
              {(profile.display_name || profile.username || profile.email || "U")
                .slice(0, 1)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <p className="text-xs text-muted-foreground">
              Joined {new Date(profile.date_joined).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline">@{profile.username}</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card
              className={`cursor-pointer transition hover:border-primary/60 hover:shadow-md ${
                activeSection === "overview" ? "border-primary shadow-sm" : "shadow-sm"
              }`}
              role="button"
              tabIndex={0}
              onClick={() => setActiveSection("overview")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveSection("overview");
                }
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutGrid className="h-4 w-4" /> Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  General account summary across reader, creator and settings.
                </p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition hover:border-primary/60 hover:shadow-md ${
                activeSection === "reader" ? "border-primary shadow-sm" : "shadow-sm"
              }`}
              role="button"
              tabIndex={0}
              onClick={() => setActiveSection("reader")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveSection("reader");
                }
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookMarked className="h-4 w-4" /> Reader
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  Reading, listening, favorites and review history.
                </p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition hover:border-primary/60 hover:shadow-md ${
                activeSection === "creator" ? "border-primary shadow-sm" : "shadow-sm"
              }`}
              role="button"
              tabIndex={0}
              onClick={() => setActiveSection("creator")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveSection("creator");
                }
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> Creator
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  Submit stories and track moderation status.
                </p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition hover:border-primary/60 hover:shadow-md ${
                activeSection === "settings" ? "border-primary shadow-sm" : "shadow-sm"
              }`}
              role="button"
              tabIndex={0}
              onClick={() => setActiveSection("settings")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveSection("settings");
                }
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4" /> Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  Manage profile info and account presentation.
                </p>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-4">
            {activeSection === "overview" && (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Reader Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Continue Reading</span>
                        <span className="font-medium">{profile.reading_in_progress_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Continue Listening</span>
                        <span className="font-medium">{profile.listening_in_progress_count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Completed</span>
                        <span className="font-medium">{completedData?.pagination?.count || 0}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveSection("reader")}>
                        Open Reader
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Creator Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Submissions</span>
                        <span className="font-medium">{submissionsData?.pagination?.count || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Recent statuses</p>
                      <div className="flex flex-wrap gap-2">
                        {(submissionsData?.results || []).slice(0, 3).map((item) => (
                          <span key={item.id}>{renderSubmissionStatus(item.status)}</span>
                        ))}
                        {(submissionsData?.results?.length || 0) === 0 && (
                          <span className="text-xs text-muted-foreground">No submissions yet</span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveSection("creator")}>
                        Open Creator
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Settings Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Username</span>
                        <span className="font-medium">@{profile.username}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">Display Name</span>
                        <span className="line-clamp-1 font-medium">{profile.display_name || "-"}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">Bio</span>
                        <span className="line-clamp-1 font-medium">{profile.bio || "-"}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setActiveSection("settings")}>
                        Open Settings
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeSection === "reader" && (
              <>
                <Card>
                <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-wrap gap-2 rounded-xl border bg-muted/30 p-2">
                      {readerNavItems.map((item) => (
                        <Button
                          key={item.key}
                          size="sm"
                          variant={activeReaderView === item.key ? "default" : "outline"}
                          onClick={() => setActiveReaderView(item.key)}
                          className={activeReaderView === item.key ? "shadow-sm" : ""}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {activeReaderView === "reading" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(readingData?.results || []).map((item) => (
                        <div key={`${item.story.id}-${item.chapter_slug}`} className="rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{item.story.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(item.overall_progress * 100)}% complete
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.chapter_title || "Current chapter"}
                          </p>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.round(item.overall_progress * 100)}%` }}
                            />
                          </div>
                          {item.chapter_slug ? (
                            <Link to={`/read/${item.story.slug}/${item.chapter_slug}`}>
                              <Button size="sm" className="mt-3">Continue Reading</Button>
                            </Link>
                          ) : (
                            <Button size="sm" className="mt-3" variant="outline" disabled>
                              Continue Reading
                            </Button>
                          )}
                        </div>
                      ))}
                      {(readingData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No reading progress available.</p>
                      )}
                      {renderPagination(
                        readingData?.pagination?.page || 1,
                        readingData?.pagination?.pages || 1,
                        setReadingPage
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeReaderView === "completed" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(completedData?.results || []).map((item) => (
                        <div key={`${item.story.id}-${item.updated_at}`} className="rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{item.story.title}</p>
                            <p className="text-sm text-emerald-600">100% complete</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Completed {new Date(item.updated_at).toLocaleDateString()}
                          </p>
                          <Link to={`/story/${item.story.slug}/`}>
                            <Button size="sm" className="mt-3" variant="outline">
                              View Story
                            </Button>
                          </Link>
                        </div>
                      ))}
                      {(completedData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No completed stories available.</p>
                      )}
                      {renderPagination(
                        completedData?.pagination?.page || 1,
                        completedData?.pagination?.pages || 1,
                        setCompletedPage
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeReaderView === "listening" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(listeningData?.results || []).map((item) => (
                        <div key={`${item.story.id}-${item.audio_slug}`} className="rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{item.story.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(item.overall_progress * 100)}% complete
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.audio_title || "Current audio"}
                          </p>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.round(item.overall_progress * 100)}%` }}
                            />
                          </div>
                          {item.audio_slug ? (
                            <Link to={`/listen/${item.story.slug}/${item.audio_slug}`}>
                              <Button size="sm" className="mt-3">Continue Listening</Button>
                            </Link>
                          ) : (
                            <Button size="sm" className="mt-3" variant="outline" disabled>
                              Continue Listening
                            </Button>
                          )}
                        </div>
                      ))}
                      {(listeningData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No listening progress available.</p>
                      )}
                      {renderPagination(
                        listeningData?.pagination?.page || 1,
                        listeningData?.pagination?.pages || 1,
                        setListeningPage
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeReaderView === "favorites" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(favoritesData?.results || []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-md border p-4">
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{item.story.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/story/${item.story.slug}/`)}>
                            View
                          </Button>
                        </div>
                      ))}
                      {(favoritesData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No favorites yet.</p>
                      )}
                      {renderPagination(
                        favoritesData?.pagination?.page || 1,
                        favoritesData?.pagination?.pages || 1,
                        setFavoritesPage
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeReaderView === "reviews" && (
                  <Card className="shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      {(reviewsData?.results || []).map((item) => (
                        <div key={item.id} className="rounded-md border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="line-clamp-1 font-medium">{item.story.title}</p>
                            <p className="text-sm text-muted-foreground">{item.rating}/5</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.comment || "No review comment."}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => navigate(`/story/${item.story.slug}/`)}
                          >
                            Open Story
                          </Button>
                        </div>
                      ))}
                      {(reviewsData?.results?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No reviews yet.</p>
                      )}
                      {renderPagination(
                        reviewsData?.pagination?.page || 1,
                        reviewsData?.pagination?.pages || 1,
                        setReviewsPage
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {activeSection === "creator" && (
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle>Creator Submissions</CardTitle>
                  <Button onClick={() => navigate("/publish")}>Submit New Story</Button>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  {(submissionsData?.results || []).map((item) => (
                    <div key={item.id} className="rounded-md border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium">{item.title}</p>
                        {renderSubmissionStatus(item.status)}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Type: {item.story_type}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {new Date(item.created_at).toLocaleDateString()}
                      </p>
                      {item.reviewer_notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Reviewer note: {item.reviewer_notes}
                        </p>
                      )}
                    </div>
                  ))}
                  {(submissionsData?.results?.length || 0) === 0 && (
                    <p className="text-sm text-muted-foreground">No submissions yet.</p>
                  )}
                  {renderPagination(
                    submissionsData?.pagination?.page || 1,
                    submissionsData?.pagination?.pages || 1,
                    setSubmissionsPage
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === "settings" && (
              <Card className="shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <p className="font-medium">Profile Settings</p>
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm">Username</label>
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Display Name</label>
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Avatar URL</label>
                    <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Bio</label>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
                  </div>
                  {saveError && <p className="text-sm text-red-500">{saveError}</p>}
                  <Button onClick={onSaveProfile} disabled={saveLoading}>
                    {saveLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Profile;
