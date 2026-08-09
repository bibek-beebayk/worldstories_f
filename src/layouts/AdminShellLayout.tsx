import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, Library, Inbox, Globe, LogOut, BarChart3, Menu, Tag, Users } from "lucide-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearTokens } from "@/api/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const menuItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/content", label: "Stories", icon: Library, exact: false },
  { to: "/admin/categories", label: "Categories", icon: Tag, exact: false },
  { to: "/admin/authors", label: "Authors", icon: Users, exact: false },
  { to: "/admin/submissions", label: "Submissions", icon: Inbox, exact: false },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
];

const isActive = (pathname: string, to: string, exact: boolean) => {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
};

export default function AdminShellLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const onLogout = () => {
    clearTokens();
    setShowLogoutModal(false);
    setMobileNavOpen(false);
    navigate("/admin/login");
  };

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1">
      {menuItems.map((item) => {
        const active = isActive(location.pathname, item.to, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center rounded-md px-3 py-2 text-sm transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            } ${collapsed && !onNavigate ? "justify-center" : "gap-2"}`}
            title={item.label}
          >
            <Icon className="h-4 w-4" />
            {(!collapsed || onNavigate) && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

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
          <SheetHeader>
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
