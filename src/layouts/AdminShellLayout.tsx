import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { LayoutDashboard, Library, Inbox } from "lucide-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`grid h-full w-full grid-cols-1 items-stretch gap-4 overflow-hidden px-4 py-4 box-border transition-[grid-template-columns] md:grid-cols-[1fr] ${
        collapsed ? "lg:grid-cols-[64px_1fr]" : "lg:grid-cols-[200px_1fr]"
      }`}
    >
      <aside className="h-full min-h-0 rounded-lg border bg-card p-3">
        <div className={`mb-2 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Modules
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

        <nav className="space-y-1">
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
      </aside>

      <section className="min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </section>
    </div>
  );
}
