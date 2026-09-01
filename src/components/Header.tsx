import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { clearTokens } from "@/api/client";
import { authApi } from "@/api/auth";
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
import { BookOpen, ChevronDown, Earth, FileText, Menu, Search, Sparkles, UsersRound, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router";
import { formatViews } from "@/lib/utils";
import CoverImage from "@/components/CoverImage";
import AuthorPortrait from "@/components/AuthorPortrait";

const Header = () => {
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();
  const { openLoginModal } = useAuthModal();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopQuery, setDesktopQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isScrolled = useIsHeaderScrolled();
  const blurTimerRef = useRef<number | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery((mobileSearchOpen ? mobileQuery : desktopQuery).trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [desktopQuery, mobileQuery, mobileSearchOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const frame = window.requestAnimationFrame(() => mobileSearchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [mobileSearchOpen]);

  const { data: suggestionData } = useSearchStories(debouncedQuery, 1, "popular");
  const storySuggestions = useMemo(
    () => (suggestionData?.titles.results || []).slice(0, 4),
    [suggestionData]
  );
  const authorSuggestions = useMemo(
    () => (suggestionData?.authors.results || []).slice(0, 3),
    [suggestionData]
  );
  const chapterSuggestions = useMemo(
    () => (suggestionData?.chapters.results || []).slice(0, 3),
    [suggestionData]
  );

  const handleLogout = () => {
    // Best-effort — blacklists the refresh token server-side, but the local
    // logout below must happen regardless of whether this call succeeds
    // (e.g. offline). Fired before clearTokens() since it needs the tokens
    // still in localStorage to send.
    authApi.logout().catch(() => undefined);
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
    if (!mobileQuery.trim()) return;
    goToSearchPage(mobileQuery);
    setMobileSearchOpen(false);
  };

  const openMobileSearchResult = (path: string) => {
    navigate(path);
    setMobileSearchOpen(false);
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
          <nav className="hidden md:flex items-center gap-4 xl:gap-6">
            <Link to="/originals" className="flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700">
              <Sparkles className="h-3 w-3" /> Originals
            </Link>
            <Link to="/library" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Library
            </Link>
            <Link to="/blog" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Blog
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-foreground outline-none transition-colors hover:text-primary data-[state=open]:text-primary">
                More <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {[
                  { to: "/discover", label: "Discover" },
                  { to: "/authors", label: "Authors" },
                  { to: "/story-map", label: "Story Map" },
                  { to: "/audiobooks", label: "Audiobooks" },
                  { to: "/watch", label: "Watch" },
                  { to: "/downloads", label: "Downloads" },
                ].map((item) => (
                  <DropdownMenuItem key={item.to} asChild className="cursor-pointer">
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/contest" className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 hover:bg-amber-500 transition-colors">
              <span className="text-xs font-semibold text-amber-900">⭐</span>
              <span className="text-xs font-semibold text-amber-900">Contest</span>
            </Link>
          </nav>
        </div>

        {/* Right Side */}
        <div className="relative flex items-center gap-3">
          {/* Desktop Search */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative">
              <form onSubmit={handleDesktopSubmit}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search titles or authors..."
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
                  {storySuggestions.length > 0 || authorSuggestions.length > 0 || chapterSuggestions.length > 0 ? (
                    <>
                      {authorSuggestions.length > 0 && (
                        <p className="flex items-center gap-1.5 px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <UsersRound className="h-3.5 w-3.5" /> Authors
                        </p>
                      )}
                      {authorSuggestions.map((author) => (
                        <button
                          key={`author-${author.id}`}
                          type="button"
                          onMouseDown={() => {
                            if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                          }}
                          onClick={() => {
                            navigate(`/authors/${author.id}`);
                            setShowSuggestions(false);
                          }}
                          className="flex w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-muted"
                        >
                          <AuthorPortrait src={author.image} name={author.name} className="h-11 w-9 shrink-0 rounded" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{author.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {author.stories_count} {author.stories_count === 1 ? "title" : "titles"}
                            </p>
                          </div>
                        </button>
                      ))}
                      {storySuggestions.length > 0 && (
                        <p className="mt-1 flex items-center gap-1.5 border-t px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <BookOpen className="h-3.5 w-3.5" /> Titles
                        </p>
                      )}
                      {storySuggestions.map((story) => (
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
                            author={story.author}
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
                      {chapterSuggestions.length > 0 && (
                        <p className="mt-1 flex items-center gap-1.5 border-t px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" /> Chapters
                        </p>
                      )}
                      {chapterSuggestions.map((chapter) => (
                        <button
                          key={`chapter-${chapter.story_slug}-${chapter.chapter_slug}`}
                          type="button"
                          onMouseDown={() => {
                            if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                          }}
                          onClick={() => {
                            navigate(`/read/${chapter.story_slug}/${chapter.chapter_slug}`);
                            setShowSuggestions(false);
                          }}
                          className="flex w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-muted"
                        >
                          <CoverImage
                            src={chapter.story_cover_image}
                            alt={chapter.story_title}
                            className="h-12 w-10 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{chapter.chapter_title}</p>
                            <p className="truncate text-xs text-muted-foreground">{chapter.story_title}</p>
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
                    <p className="px-2 py-2 text-sm text-muted-foreground">No matching titles, authors, or chapters.</p>
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

          <Button asChild variant="ghost" size="icon" className="md:hidden">
            <Link to="/story-map" aria-label="Open Story Map" title="Story Map">
              <Earth className="h-5 w-5" />
            </Link>
          </Button>

          {/* Mobile/tablet search expands over the header from this icon. */}
          <div className="md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={mobileSearchOpen ? "invisible" : "visible"}
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileSearchOpen(true);
              }}
              aria-label="Open site search"
              aria-expanded={mobileSearchOpen}
            >
              <Search className="h-5 w-5" />
            </Button>

            <form
              onSubmit={handleMobileSubmit}
              className={`absolute right-0 top-1/2 z-20 flex h-10 -translate-y-1/2 origin-right items-center overflow-hidden rounded-full border bg-background shadow-md transition-[width,opacity] duration-300 ease-out supports-[backdrop-filter]:bg-background/95 ${
                mobileSearchOpen
                  ? "w-[calc(100vw-2rem)] opacity-100"
                  : "pointer-events-none w-10 opacity-0"
              }`}
              role="search"
            >
              <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={mobileSearchInputRef}
                type="search"
                value={mobileQuery}
                onChange={(event) => setMobileQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setMobileSearchOpen(false);
                  }
                }}
                placeholder="Search titles or authors..."
                aria-label="Search titles, authors, and chapters"
                className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                tabIndex={mobileSearchOpen ? 0 : -1}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mr-1 h-8 w-8 shrink-0 rounded-full"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close site search"
                tabIndex={mobileSearchOpen ? 0 : -1}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>

            {mobileSearchOpen && mobileQuery.trim().length >= 2 && debouncedQuery.length >= 2 && (
              <div className="absolute right-0 top-[calc(50%+1.5rem)] z-20 max-h-[min(70vh,28rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border bg-background p-2 shadow-xl">
                {storySuggestions.length > 0 || authorSuggestions.length > 0 || chapterSuggestions.length > 0 ? (
                  <>
                    {authorSuggestions.length > 0 && (
                      <p className="flex items-center gap-1.5 px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <UsersRound className="h-3.5 w-3.5" /> Authors
                      </p>
                    )}
                    {authorSuggestions.map((author) => (
                      <button
                        key={`mobile-author-${author.id}`}
                        type="button"
                        onClick={() => openMobileSearchResult(`/authors/${author.id}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left active:bg-muted"
                      >
                        <AuthorPortrait src={author.image} name={author.name} className="h-11 w-9 shrink-0 rounded" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{author.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {author.stories_count} {author.stories_count === 1 ? "title" : "titles"}
                          </p>
                        </div>
                      </button>
                    ))}

                    {storySuggestions.length > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 border-t px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" /> Titles
                      </p>
                    )}
                    {storySuggestions.map((story) => (
                      <button
                        key={`mobile-story-${story.id}`}
                        type="button"
                        onClick={() => openMobileSearchResult(`/story/${story.slug}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left active:bg-muted"
                      >
                        <CoverImage
                          src={story.cover_image}
                          alt={story.title}
                          author={story.author}
                          className="h-12 w-10 shrink-0 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{story.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {story.rating} · {formatViews(story.views)} views
                          </p>
                        </div>
                      </button>
                    ))}

                    {chapterSuggestions.length > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 border-t px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" /> Chapters
                      </p>
                    )}
                    {chapterSuggestions.map((chapter) => (
                      <button
                        key={`mobile-chapter-${chapter.story_slug}-${chapter.chapter_slug}`}
                        type="button"
                        onClick={() => openMobileSearchResult(`/read/${chapter.story_slug}/${chapter.chapter_slug}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left active:bg-muted"
                      >
                        <CoverImage
                          src={chapter.story_cover_image}
                          alt={chapter.story_title}
                          className="h-12 w-10 shrink-0 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{chapter.chapter_title}</p>
                          <p className="truncate text-xs text-muted-foreground">{chapter.story_title}</p>
                        </div>
                      </button>
                    ))}

                    <button
                      type="button"
                      className="mt-1 w-full rounded-lg border-t px-2 py-2 text-left text-sm font-medium text-primary active:bg-muted"
                      onClick={() => {
                        goToSearchPage(mobileQuery);
                        setMobileSearchOpen(false);
                      }}
                    >
                      View all results
                    </button>
                  </>
                ) : (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No matching titles, authors, or chapters.
                  </p>
                )}
              </div>
            )}
          </div>

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

              <nav className="flex flex-col gap-4 mt-4">
                <SheetClose asChild>
                  <Link to="/originals" className="flex w-fit items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                    <Sparkles className="h-4 w-4" /> Originals
                  </Link>
                </SheetClose>

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
                    to="/discover"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Discover
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    to="/audiobooks"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Audiobooks
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    to="/watch"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Watch
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    to="/blog"
                    className="text-lg font-medium hover:text-primary"
                  >
                    Blog
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
