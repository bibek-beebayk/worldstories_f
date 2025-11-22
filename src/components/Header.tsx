import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <span className="text-lg font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-xl font-bold">WorldStories</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/originals" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Originals
            </Link>
            <Link to="/trending" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Trending
            </Link>
            <Link to="/discover" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Discover
            </Link>
            <Link to="/contest" className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 hover:bg-amber-500 transition-colors">
              <span className="text-xs font-semibold text-amber-900">⭐</span>
              <span className="text-xs font-semibold text-amber-900">Contest</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search stories..." 
                className="w-64 pl-9 bg-secondary border-0"
              />
            </div>
          </div>
          
          <Link to="/publish">
            <Button className="hidden sm:inline-flex">Publish</Button>
          </Link>
          <Button variant="outline">Log In</Button>
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
