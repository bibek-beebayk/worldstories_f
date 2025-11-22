import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-blue-900">
      <div className="container px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="flex gap-4 text-sm font-medium text-white/70">
              <button className="text-white border-b-2 border-primary pb-1">COMICS</button>
              <button className="hover:text-white transition-colors">NOVELS</button>
              <button className="hover:text-white transition-colors">MANGA</button>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Welcome to WorldStories!<br />
            </h1>
            
            <p className="text-lg text-white/80 max-w-xl">
              WorldStories is the home for stories from around the world. Discover new tales, connect with authors, and immerse yourself in diverse narratives across genres.
            </p>
            
            <Button size="lg" className="text-base px-8">
              Browse Stories
            </Button>
          </div>
          
          <div className="relative">
            <div className="relative aspect-3/4 max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600&h=800&fit=crop" 
                alt="Featured Story"
                className="w-full h-full object-cover"
              />
            </div>
            
            <button className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
