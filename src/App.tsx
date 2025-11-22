import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Catalogue from "./pages/Catalogue";
import Originals from "./pages/Originals";
import Trending from "./pages/Trending";
import Discover from "./pages/Discover";
// import Contest from "./pages/Contest";
import Publish from "./pages/Publish";
// import StoryDetail from "./pages/StoryDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/originals" element={<Originals />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/discover" element={<Discover />} />
          {/* <Route path="/contest" element={<Contest />} /> */}
          <Route path="/publish" element={<Publish />} />
          {/* <Route path="/story/:id" element={<StoryDetail />} /> */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;