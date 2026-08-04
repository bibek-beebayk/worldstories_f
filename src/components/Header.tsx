import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { clearTokens } from "@/api/client";
import { useSearchStories } from "@/hooks/useSearchStories";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { useIsHeaderScrolled } from "@/hooks/useIsHeaderScrolled";
import { useAuthModal } from "@/context/AuthModalContext";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Search, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatViews } from "@/lib/utils";
import CoverImage from "@/components/CoverImage";

const Header = () => {
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopQuery, setDesktopQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isScrolled = useIsHeaderScrolled();
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(desktopQuery.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [desktopQuery]);

  const { data: suggestionData } = useSearchStories(debouncedQuery, 1, "popular");
  const suggestions = useMemo(
    () => (suggestionData?.results || []).slice(0, 6),
    [suggestionData]
  );

  const handleLogout = () => {
    clearTokens();
    setShowLogoutModal(false);
    navigate("/");
  };

  const requestLogout = () => {
    setShowLogoutModal(true);
    setMobileMenuOpen(false);
  };

  const handleOpenLoginModal = () => {
    openLoginModal();
    setMobileMenuOpen(false);
  };

  const goToSearchPage = (q: string) => {
    const normalized = q.trim();
    if (!normalized) return;
    navigate(`/search?q=${encodeURIComponent(normalized)}&page=1&sort=popular`);
    setShowSuggestions(false);
  };

  const handleDesktopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToSearchPage(desktopQuery);
  };

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToSearchPage(mobileQuery);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Background/border/rounding/margin live on this inner wrapper, not the
          <header> itself — the header stays a plain, unconstrained w-full
          block so this wrapper's own margin can inset it from the edges
          without the two fighting (an explicit width:100% *plus* margin on
          the same element overflows the viewport instead of insetting). */}
      <div
        className={`mx-auto border-border backdrop-blur transition-all duration-300 ease-in-out ${
          isScrolled
            ? "mx-2 mt-2 rounded-2xl border bg-gradient-to-br from-primary/10 to-background/100 shadow-md sm:mx-4 supports-[backdrop-filter]:from-primary/10 supports-[backdrop-filter]:to-background/45"
            : "mx-0 mt-0 rounded-none border-b bg-background/95 shadow-none supports-[backdrop-filter]:bg-background/60"
        }`}
      >
        <div
          className={`container flex items-center justify-between px-4 transition-[height] duration-300 ease-in-out ${
            isScrolled ? "h-12" : "h-16"
          }`}
        >
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center rounded-md transition-[height,width] duration-300 ease-in-out ${
                isScrolled ? "h-10 w-10" : "h-20 w-20"
              }`}
            >
              {/* <span className="text-lg font-bold text-primary-foreground">W</span> */}
              <img src="/worldstories-logo.png" alt="" />
            </div>
            {/* <span className="text-xl font-bold">WorldStories</span> */}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/library" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Library
            </Link>
            <Link to="/authors" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Authors
            </Link>
            <Link to="/trending" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Trending
            </Link>
            <Link to="/discover" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Discover
            </Link>
            <Link to="/downloads" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Downloads
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
              <form onSubmit={handleDesktopSubmit}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search stories..."
                  className="w-64 pl-9 bg-secondary border-0"
                  value={desktopQuery}
                  onChange={(e) => setDesktopQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    blurTimerRef.current = window.setTimeout(() => {
                      setShowSuggestions(false);
                    }, 150);
                  }}
                />
              </form>
              {showSuggestions && debouncedQuery.length >= 2 && (
                <div className="absolute left-0 top-11 z-50 w-80 rounded-md border bg-background p-2 shadow-lg">
                  {suggestions.length > 0 ? (
                    <>
                      {suggestions.map((story) => (
                        <button
                          key={story.id}
                          type="button"
                          onMouseDown={() => {
                            if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                          }}
                          onClick={() => {
                            navigate(`/story/${story.slug}`);
                            setShowSuggestions(false);
                          }}
                          className="flex w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-muted"
                        >
                          <CoverImage
                            src={story.cover_image}
                            alt={story.title}
                            className="h-12 w-10 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{story.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {story.rating} · {formatViews(story.views)} views
                            </p>
                          </div>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="mt-1 w-full rounded px-2 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
                        onMouseDown={() => {
                          if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                        }}
                        onClick={() => goToSearchPage(desktopQuery)}
                      >
                        View all results
                      </button>
                    </>
                  ) : (
                    <p className="px-2 py-2 text-sm text-muted-foreground">No matching stories.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {isLoggedIn ? (
            <>
              <Link to="/profile">
                <Button variant="outline" className="hidden sm:inline-flex">
                  Profile
                </Button>
              </Link>
              <Button variant="outline" className="hidden sm:inline-flex" onClick={requestLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="hidden sm:inline-flex" onClick={handleOpenLoginModal}>
                Log In
              </Button>
              {/* <Link to="/register">
                <Button className="hidden sm:inline-flex">Register</Button>
              </Link> */}
            </>
          )}

          {/* Mobile Menu Trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-72 p-4"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <SheetHeader className="flex flex-row items-center justify-between">
                <SheetTitle className="text-xl font-bold"><Link to="/" className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md">
                    <img src="/worldstories-logo.png" alt="" />
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
              <form className="relative mb-4" onSubmit={handleMobileSubmit}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search stories..."
                  className="w-full pl-9 bg-secondary border-0"
                  value={mobileQuery}
                  onChange={(e) => setMobileQuery(e.target.value)}
                />
              </form>

              <nav className="flex flex-col gap-4 mt-4">
                <SheetClose asChild>
                  <Link
                    to="/library"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Library
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    to="/authors"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Authors
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
                    to="/downloads"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Downloads
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

                {isLoggedIn ? (
                  <>
                    <SheetClose asChild>
                      <Link to="/profile">
                        <Button variant="outline" className="w-full">
                          Profile
                        </Button>
                      </Link>
                    </SheetClose>
                    <Button variant="outline" className="w-full" onClick={requestLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" onClick={handleOpenLoginModal}>
                      Log In
                    </Button>

                    {/* <SheetClose asChild>
                      <Link to="/register">
                        <Button className="w-full">
                          Register
                        </Button>
                      </Link>
                    </SheetClose> */}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      </div>

      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}
        >
          <Card
            className="mx-auto w-full max-w-md border shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="logout-confirm-title" className="text-lg">
                Confirm logout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </header>
  );
};

export default Header;
