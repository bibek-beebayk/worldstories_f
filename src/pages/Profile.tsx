import FullScreenLoader from "@/components/FullScreenLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authApi } from "@/api/auth";
import { getAccessToken } from "@/api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Headphones, Heart, MessageSquare, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = Boolean(getAccessToken());

  const [activeTab, setActiveTab] = useState("overview");
  const [readingPage, setReadingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [listeningPage, setListeningPage] = useState(1);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });

  const { data: readingData } = useQuery({
    queryKey: ["profile-continue-reading", readingPage],
    queryFn: () => authApi.getContinueReading(readingPage),
    enabled: isAuthenticated && (activeTab === "overview" || activeTab === "reading"),
  });

  const { data: listeningData } = useQuery({
    queryKey: ["profile-continue-listening", listeningPage],
    queryFn: () => authApi.getContinueListening(listeningPage),
    enabled: isAuthenticated && (activeTab === "overview" || activeTab === "listening"),
  });

  const { data: completedData } = useQuery({
    queryKey: ["profile-completed-reading", completedPage],
    queryFn: () => authApi.getCompletedReading(completedPage),
    enabled: isAuthenticated && (activeTab === "overview" || activeTab === "completed"),
  });

  const { data: favoritesData } = useQuery({
    queryKey: ["profile-favorites", favoritesPage],
    queryFn: () => authApi.getFavorites(favoritesPage),
    enabled: isAuthenticated && (activeTab === "overview" || activeTab === "favorites"),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["profile-reviews", reviewsPage],
    queryFn: () => authApi.getMyReviews(reviewsPage),
    enabled: isAuthenticated && (activeTab === "overview" || activeTab === "reviews"),
  });

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username || "");
    setDisplayName(profile.display_name || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatar_url || "");
  }, [profile]);

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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5">
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reading">Continue Reading</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="listening">Continue Listening</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-lg font-semibold">{profile.favorites_count}</p>
                    <p className="text-xs text-muted-foreground">Favorites</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-lg font-semibold">{profile.reviews_count}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <BookMarked className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-lg font-semibold">{profile.reading_in_progress_count}</p>
                    <p className="text-xs text-muted-foreground">Reading In Progress</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Headphones className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-lg font-semibold">{profile.listening_in_progress_count}</p>
                    <p className="text-xs text-muted-foreground">Listening In Progress</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resume Reading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(readingData?.results || []).slice(0, 3).map((item) => (
                    <div key={`${item.story.id}-${item.chapter_slug}`} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 font-medium">{item.story.title}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(item.overall_progress * 100)}%</p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.chapter_title || "Current chapter"}
                      </p>
                      {item.chapter_slug ? (
                        <Link to={`/read/${item.story.slug}/${item.chapter_slug}`}>
                          <Button size="sm" className="mt-2">Continue</Button>
                        </Link>
                      ) : (
                        <Button size="sm" className="mt-2" variant="outline" disabled>
                          Continue
                        </Button>
                      )}
                    </div>
                  ))}
                  {(readingData?.results?.length || 0) === 0 && (
                    <p className="text-sm text-muted-foreground">No reading progress yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resume Listening</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(listeningData?.results || []).slice(0, 3).map((item) => (
                    <div key={`${item.story.id}-${item.audio_slug}`} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 font-medium">{item.story.title}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(item.overall_progress * 100)}%</p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.audio_title || "Current audio"}
                      </p>
                      {item.audio_slug ? (
                        <Link to={`/listen/${item.story.slug}/${item.audio_slug}`}>
                          <Button size="sm" className="mt-2">Continue</Button>
                        </Link>
                      ) : (
                        <Button size="sm" className="mt-2" variant="outline" disabled>
                          Continue
                        </Button>
                      )}
                    </div>
                  ))}
                  {(listeningData?.results?.length || 0) === 0 && (
                    <p className="text-sm text-muted-foreground">No listening progress yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Completed Stories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(completedData?.results || []).slice(0, 3).map((item) => (
                    <div key={`${item.story.id}-${item.updated_at}`} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 font-medium">{item.story.title}</p>
                        <p className="text-xs text-muted-foreground">100%</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Completed {new Date(item.updated_at).toLocaleDateString()}
                      </p>
                      <Link to={`/story/${item.story.slug}/`}>
                        <Button size="sm" className="mt-2" variant="outline">
                          View Story
                        </Button>
                      </Link>
                    </div>
                  ))}
                  {(completedData?.results?.length || 0) === 0 && (
                    <p className="text-sm text-muted-foreground">No completed stories yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reading">
            <Card>
              <CardContent className="space-y-4 p-5">
                {(readingData?.results || []).map((item) => (
                  <div key={`${item.story.id}-${item.chapter_slug}`} className="rounded-md border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.story.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(item.overall_progress * 100)}% complete
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.chapter_title || "Current chapter"}</p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${Math.round(item.overall_progress * 100)}%` }} />
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
          </TabsContent>

          <TabsContent value="listening">
            <Card>
              <CardContent className="space-y-4 p-5">
                {(listeningData?.results || []).map((item) => (
                  <div key={`${item.story.id}-${item.audio_slug}`} className="rounded-md border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.story.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(item.overall_progress * 100)}% complete
                      </p>
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
          </TabsContent>

          <TabsContent value="completed">
            <Card>
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
          </TabsContent>

          <TabsContent value="favorites">
            <Card>
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
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
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
          </TabsContent>

          <TabsContent value="settings">
            <Card>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
