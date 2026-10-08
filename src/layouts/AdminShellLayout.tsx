import { Link, Outlet, useLocation } from "react-router";
import { useEffect, useState, type ComponentType } from "react";
import { LayoutDashboard, Library, ClipboardList, Inbox, Globe, LogOut, BarChart3, Menu, Tag, Tags, BookMarked, Palette, Route, Smile, Users, UserCog, Sparkles, Newspaper, BookOpenText, Star, PanelTop, FileText, Paintbrush, ChevronDown, FolderOpen, SwatchBook, Settings2 } from "lucide-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearTokens } from "@/api/client";
import { authApi } from "@/api/auth";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type MenuIcon = ComponentType<{ className?: string }>;
type MenuLink = { to: string; label: string; icon: MenuIcon; exact: boolean };
/** A collapsible section of related links. */
type MenuGroup = { label: string; icon: MenuIcon; children: MenuLink[] };
type MenuEntry = MenuLink | MenuGroup;

const isGroup = (entry: MenuEntry): entry is MenuGroup => "children" in entry;

const menuItems: MenuEntry[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  {
    // The catalogue: what's published and how it's organised.
    label: "Content",
    icon: FolderOpen,
    children: [
      { to: "/admin/content", label: "Stories", icon: Library, exact: false },
      { to: "/admin/blog", label: "Blog", icon: Newspaper, exact: false },
      { to: "/admin/categories", label: "Categories", icon: Tag, exact: false },
      { to: "/admin/genres", label: "Genres", icon: BookMarked, exact: false },
      { to: "/admin/tags", label: "Tags", icon: Tags, exact: false },
      { to: "/admin/themes", label: "Themes", icon: Palette, exact: false },
      { to: "/admin/moods", label: "Moods", icon: Smile, exact: false },
      { to: "/admin/journeys", label: "Journeys", icon: Route, exact: false },
      { to: "/admin/story-types", label: "Story Types", icon: BookOpenText, exact: false },
      { to: "/admin/authors", label: "Authors", icon: Users, exact: false },
    ],
  },
  {
    // What the public site shows and how it looks, rather than the catalogue.
    label: "Customize",
    icon: Paintbrush,
    children: [
      { to: "/admin/featured", label: "Featured Stories", icon: Star, exact: false },
      { to: "/admin/hero", label: "Homepage Hero", icon: PanelTop, exact: false },
      { to: "/admin/pages", label: "Pages", icon: FileText, exact: false },
      { to: "/admin/site-themes", label: "Site Themes", icon: SwatchBook, exact: false },
      { to: "/admin/site-settings", label: "Site Settings", icon: Settings2, exact: false },
    ],
  },
  { to: "/admin/story-report", label: "Story Report", icon: ClipboardList, exact: false },
  { to: "/admin/users", label: "Users", icon: UserCog, exact: false },
  { to: "/admin/ai-settings", label: "AI Settings", icon: Sparkles, exact: false },
  { to: "/admin/submissions", label: "Submissions", icon: Inbox, exact: false },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
];

const isActive = (pathname: string, to: string, exact: boolean) => {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
};

const groupHasActive = (pathname: string, group: MenuGroup) =>
  group.children.some((child) => isActive(pathname, child.to, child.exact));

const activeGroupLabels = (pathname: string) =>
  menuItems.filter((entry) => isGroup(entry) && groupHasActive(pathname, entry)).map((entry) => entry.label);

export default function AdminShellLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Groups start open when you're on one of their pages, and open themselves
  // when you navigate into one; otherwise they stay as you left them.
  const [openGroups, setOpenGroups] = useState<string[]>(() => activeGroupLabels(location.pathname));

  useEffect(() => {
    const active = activeGroupLabels(location.pathname);
    if (active.length) setOpenGroups((current) => [...new Set([...current, ...active])]);
  }, [location.pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups((current) => (current.includes(label) ? current.filter((l) => l !== label) : [...current, label]));

  const onLogout = () => {
    authApi.logout().catch(() => undefined);
    clearTokens();
    setShowLogoutModal(false);
    setMobileNavOpen(false);
    navigate("/admin/login");
  };

  const navLinks = (onNavigate?: () => void) => {
    // The desktop sidebar can be collapsed to icons; the mobile drawer never is.
    const iconsOnly = collapsed && !onNavigate;

    const renderLink = (item: MenuLink, nested = false) => {
      const active = isActive(location.pathname, item.to, item.exact);
      const Icon = item.icon;
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={`flex items-center rounded-md px-3 py-2 text-sm transition-colors ${
            active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
          } ${iconsOnly ? "justify-center" : "gap-2"} ${nested && !iconsOnly ? "pl-8" : ""}`}
          title={item.label}
        >
          <Icon className="h-4 w-4" />
          {!iconsOnly && <span>{item.label}</span>}
        </Link>
      );
    };

    return (
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {menuItems.map((entry) => {
          if (!isGroup(entry)) return renderLink(entry);

          const open = openGroups.includes(entry.label);
          const hasActive = groupHasActive(location.pathname, entry);
          const Icon = entry.icon;
          return (
            <div key={entry.label} className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  // With only icons showing there's no room for the sub-menu,
                  // so expand the sidebar and open the group instead.
                  if (iconsOnly) {
                    setCollapsed(false);
                    if (!open) toggleGroup(entry.label);
                    return;
                  }
                  toggleGroup(entry.label);
                }}
                aria-expanded={open}
                title={entry.label}
                className={`flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                  hasActive && (iconsOnly || !open) ? "bg-primary/10 font-medium text-primary" : "text-foreground"
                } ${iconsOnly ? "justify-center" : "gap-2"}`}
              >
                <Icon className="h-4 w-4" />
                {!iconsOnly && (
                  <>
                    <span className="flex-1 text-left">{entry.label}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                  </>
                )}
              </button>
              {open && !iconsOnly && entry.children.map((child) => renderLink(child, true))}
            </div>
          );
        })}
      </nav>
    );
  };

  const footerLinks = (onNavigate?: () => void) => (
    <div className="mt-auto border-t pt-3">
      <div className="space-y-1">
        <Link
          to="/"
          onClick={onNavigate}
          className={`flex items-center rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted ${
            collapsed && !onNavigate ? "justify-center" : "gap-2"
          }`}
          title="Website"
        >
          <Globe className="h-4 w-4" />
          {(!collapsed || onNavigate) && <span>Website</span>}
        </Link>
        <Button
          type="button"
          variant="ghost"
          className={`w-full rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted ${
            collapsed && !onNavigate ? "justify-center" : "justify-start gap-2"
          }`}
          onClick={() => {
            onNavigate?.();
            setShowLogoutModal(true);
          }}
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          {(!collapsed || onNavigate) && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className={`flex h-full w-full flex-col gap-3 overflow-hidden p-3 lg:grid lg:items-stretch lg:gap-4 lg:p-4 lg:transition-[grid-template-columns] ${
        collapsed ? "lg:grid-cols-[64px_1fr]" : "lg:grid-cols-[200px_1fr]"
      }`}
    >
      {/* Mobile top bar — the persistent sidebar below is hidden on small
          screens (stacking it above the content instead wastes most of the
          viewport on a vertical list of nav items), replaced by a hamburger
          that opens the same nav in a slide-out drawer. */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 lg:hidden">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open admin menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold">Admin</p>
        </div>
        <Link to="/" className="text-xs text-muted-foreground hover:underline">
          Website
        </Link>
      </div>

      <aside className="hidden h-full min-h-0 flex-col rounded-lg border bg-card p-3 lg:flex">
        <div className={`mb-2 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ADMIN
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {navLinks()}
        {footerLinks()}
      </aside>

      <section className="min-h-0 min-w-0 flex-1 overflow-hidden lg:flex-none">
        <Outlet />
      </section>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex w-72 flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle>Admin Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            {navLinks(() => setMobileNavOpen(false))}
            {footerLinks(() => setMobileNavOpen(false))}
          </div>
        </SheetContent>
      </Sheet>

      {showLogoutModal && (
        <div
          className="fixed inset-0 z-[70] flex min-h-dvh items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}
        >
          <Card
            className="mx-auto w-full max-w-md border shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-logout-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="admin-logout-confirm-title" className="text-lg">
                Confirm logout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to log out from admin panel?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
