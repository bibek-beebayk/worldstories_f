import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { getAccessToken } from "@/api/client";
import { authApi } from "@/api/auth";
import FullScreenLoader from "@/components/FullScreenLoader";
import { lazy, Suspense } from "react";

import DefaultLayout from "@/layouts/DefaultLayout";
import AdminLayout from "@/layouts/AdminLayout";
import AdminShellLayout from "@/layouts/AdminShellLayout";

const Index = lazy(() => import("./pages/Index"));
const Library = lazy(() => import("./pages/Library"));
const Trending = lazy(() => import("./pages/Trending"));
const Discover = lazy(() => import("./pages/Discover"));
const Publish = lazy(() => import("./pages/Publish"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StoryDetail = lazy(() => import("./pages/StoryDetail"));
const StoryReader = lazy(() => import("./pages/StoryReader"));
const AudiobookPlayer = lazy(() => import("./pages/AudiobookPlayer"));
const Login = lazy(() => import("./pages/Login"));
const Search = lazy(() => import("./pages/Search"));
const Profile = lazy(() => import("./pages/Profile"));
const Contest = lazy(() => import("./pages/Contest"));
const PdfReader = lazy(() => import("./pages/PdfReader"));
const AdminContent = lazy(() => import("./pages/AdminContent"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminHome = lazy(() => import("./pages/AdminHome"));
const AdminSubmissions = lazy(() => import("./pages/AdminSubmissions"));

const queryClient = new QueryClient();

const RequireAdminAuth = () => {
  const accessToken = getAccessToken();
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-auth", accessToken],
    queryFn: authApi.getMe,
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: 60_000,
  });

  if (!accessToken) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isError || !user?.is_superuser) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ adminAccessDenied: true }}
      />
    );
  }

  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
          {/* Parent route that applies DefaultLayout to its children */}
          <Route path="/" element={<DefaultLayout />}>
            <Route index element={<Index />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Navigate to="/login" replace />} />
            <Route path="library" element={<Library />} />
            <Route path="trending" element={<Trending />} />
            <Route path="discover" element={<Discover />} />
            <Route path="contest" element={<Contest />} />
            <Route path="search" element={<Search />} />
            <Route path="publish" element={<Publish />} />
            <Route path="profile" element={<Profile />} />
            <Route path="/story/:slug" element={<StoryDetail />} />
            <Route path="/story/:slug/pdf" element={<PdfReader />} />
            <Route path="/read/:story_slug/:chapter_slug" element={<StoryReader />} />
            <Route path="/listen/:story_slug/:chapter_slug" element={<AudiobookPlayer />} />


            {/* catch-all for unknown paths (inside layout) */}
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route path="login" element={<AdminLogin />} />
            <Route element={<RequireAdminAuth />}>
              <Route element={<AdminShellLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="submissions" element={<AdminSubmissions />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Example: if you want a route WITHOUT the default layout,
              add it OUTSIDE the parent route. */}
          {/* <Route path="/login" element={<Login />} /> */}
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
