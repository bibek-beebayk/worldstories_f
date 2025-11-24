import { Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <span className="text-lg font-bold text-primary-foreground">W</span>
            </div>
            <span className="text-xl font-bold">WorldStories</span>
          </Link>

          {/* Desktop Navigation */}
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

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Desktop Search */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search stories..."
                className="w-64 pl-9 bg-secondary border-0"
              />
            </div>
          </div>

          {/* Publish Button */}
          <Link to="/publish">
            <Button className="hidden sm:inline-flex">Publish</Button>
          </Link>

          {/* Login Button */}
          <Button variant="outline" className="hidden sm:inline-flex">
            Log In
          </Button>

          {/* Mobile Menu Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-72 p-4">
              <SheetHeader className="flex flex-row items-center justify-between">
                <SheetTitle className="text-xl font-bold"><Link to="/" className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                    <span className="text-lg font-bold text-primary-foreground">W</span>
                  </div>
                  <span className="text-xl font-bold">WorldStories</span>
                </Link></SheetTitle>
                <SheetClose asChild>
                  {/* <Button variant="ghost" size="icon">
                    <X className="h-5 w-5" />
                  </Button> */}
                </SheetClose>
              </SheetHeader>

              <Separator className="my-4" />

              {/* Mobile Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search stories..."
                  className="w-full pl-9 bg-secondary border-0"
                />
              </div>

              <nav className="flex flex-col gap-4 mt-4">
                <SheetClose asChild>
                  <Link
                    to="/originals"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Originals
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    to="/trending"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Trending
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    to="/discover"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Discover
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    to="/contest"
                    className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 w-fit hover:bg-amber-500"
                  >
                    <span className="text-xs font-semibold text-amber-900">⭐</span>
                    <span className="text-xs font-semibold text-amber-900">Contest</span>
                  </Link>
                </SheetClose>

                <Separator className="my-2" />

                <SheetClose asChild>
                  <Link to="/publish">
                    <Button className="w-full">Publish</Button>
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Button variant="outline" className="w-full">
                    Log In
                  </Button>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
