import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Story } from "@/api/types";

interface HeroSectionProps {
  featuredStory?: Story | null;
}

const HeroSection = ({ featuredStory }: HeroSectionProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-indigo-300/15 blur-3xl" />

      <div className="container px-4 py-10 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-4">
            {/* <div className="flex gap-4 text-sm font-medium text-white/70">
              <button className="text-white border-b-2 border-primary pb-1">COMICS</button>
              <button className="hover:text-white transition-colors">NOVELS</button>
              <button className="hover:text-white transition-colors">MANGA</button>
            </div> */}
            
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/90">
              Featured Story
            </span>

            <h1 className="max-w-3xl text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {featuredStory?.title || "Welcome to WorldStories!"}
            </h1>
            
            <p className="max-w-2xl text-sm text-white/85 md:text-base">
              {featuredStory
                ? "Featured this week. Dive into one of our most-read stories."
                : "WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres."}
            </p>
            
            <Button size="lg" className="px-7 text-sm md:text-base">
              <Link to={featuredStory ? `/story/${featuredStory.slug}/` : "/catalogue"}>
                {featuredStory ? "Read Featured Story" : "Explore"}
              </Link> 
            </Button>
          </div>
          
          <div className="relative hidden md:block">
            <div className="relative mx-auto aspect-[16/10] max-w-md overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
              <img 
                src={featuredStory?.cover_image || "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600&h=800&fit=crop"}
                alt={featuredStory?.title || "Featured Story"}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg bg-black/45 px-3 py-2 backdrop-blur-sm">
                <p className="line-clamp-1 text-sm font-medium text-white">
                  {featuredStory?.title || "Welcome to WorldStories!"}
                </p>
              </div>
            </div>
            
            <button className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70">
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
