import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import DefaultLayout from "@/layouts/DefaultLayout";

import Index from "./pages/Index";
import Catalogue from "./pages/Catalogue";
import Originals from "./pages/Originals";
import Trending from "./pages/Trending";
import Discover from "./pages/Discover";
import Publish from "./pages/Publish";
import NotFound from "./pages/NotFound";
import StoryDetail from "./pages/StoryDetail";
import StoryReader from "./pages/StoryReader";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Parent route that applies DefaultLayout to its children */}
          <Route path="/" element={<DefaultLayout />}>
            <Route index element={<Index />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="originals" element={<Originals />} />
            <Route path="trending" element={<Trending />} />
            <Route path="discover" element={<Discover />} />
            <Route path="publish" element={<Publish />} />
            <Route path="/story/:slug" element={<StoryDetail />} />
            <Route path="/read/:story_slug/:chapter_slug" element={<StoryReader />} />


            {/* catch-all for unknown paths (inside layout) */}
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
