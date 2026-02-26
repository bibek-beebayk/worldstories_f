import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, Library, Inbox, Globe, LogOut } from "lucide-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearTokens } from "@/api/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const menuItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/content", label: "Stories", icon: Library, exact: false },
  { to: "/admin/submissions", label: "Submissions", icon: Inbox, exact: false },
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

  const onLogout = () => {
    clearTokens();
    setShowLogoutModal(false);
    navigate("/admin/login");
  };

  return (
    <div
      className={`grid h-full w-full grid-cols-1 items-stretch gap-4 overflow-hidden px-4 py-4 box-border transition-[grid-template-columns] md:grid-cols-[1fr] ${
        collapsed ? "lg:grid-cols-[64px_1fr]" : "lg:grid-cols-[200px_1fr]"
      }`}
    >
      <aside className="flex h-full min-h-0 flex-col rounded-lg border bg-card p-3">
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

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const active = isActive(location.pathname, item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                } ${collapsed ? "justify-center" : "gap-2"}`}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t pt-3">
          <div className="space-y-1">
            <Link
              to="/"
              className={`flex items-center rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted ${collapsed ? "justify-center" : "gap-2"}`}
              title="Website"
            >
              <Globe className="h-4 w-4" />
              {!collapsed && <span>Website</span>}
            </Link>
            <Button
              type="button"
              variant="ghost"
              className={`w-full rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted ${collapsed ? "justify-center" : "justify-start gap-2"}`}
              onClick={() => setShowLogoutModal(true)}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      <section className="min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </section>

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
