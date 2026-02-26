import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { getAccessToken } from "@/api/client";

import DefaultLayout from "@/layouts/DefaultLayout";
import AdminLayout from "@/layouts/AdminLayout";
import AdminShellLayout from "@/layouts/AdminShellLayout";

import Index from "./pages/Index";
import Catalogue from "./pages/Catalogue";
import Trending from "./pages/Trending";
import Discover from "./pages/Discover";
import Publish from "./pages/Publish";
import NotFound from "./pages/NotFound";
import StoryDetail from "./pages/StoryDetail";
import StoryReader from "./pages/StoryReader";
import AudiobookPlayer from "./pages/AudiobookPlayer";
import Login from "./pages/Login";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import Contest from "./pages/Contest";
import PdfReader from "./pages/PdfReader";
import AdminContent from "./pages/AdminContent";
import AdminLogin from "./pages/AdminLogin";
import AdminHome from "./pages/AdminHome";
import AdminSubmissions from "./pages/AdminSubmissions";

const queryClient = new QueryClient();

const RequireAdminAuth = () => {
  const isAuthenticated = Boolean(getAccessToken());
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Parent route that applies DefaultLayout to its children */}
          <Route path="/" element={<DefaultLayout />}>
            <Route index element={<Index />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Navigate to="/login" replace />} />
            <Route path="catalogue" element={<Catalogue />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
