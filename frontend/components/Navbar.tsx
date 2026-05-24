"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, History, Bell, Bookmark, Settings, LogIn, LogOut,
  User, BarChart2, Sun, Moon, Menu, X, ChevronLeft, ChevronRight,
  Shield
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: Activity },
  { href: "/watchlist", label: "Watchlist", Icon: Bookmark },
  { href: "/history", label: "History", Icon: History },
  { href: "/alerts", label: "Alerts", Icon: Bell },
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/status", label: "Status", Icon: BarChart2 },
];

interface NavbarProps {
  isPublic?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Navbar({ isPublic = false, collapsed = false, onToggleCollapse }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const preferred = saved || "dark";
    setTheme(preferred);
    if (preferred === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // PUBLIC TOP NAVIGATION HEADER
  if (isPublic) {
    return (
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border transition-all duration-200">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo-n.png"
              alt="Trend Intelligence Logo"
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="font-semibold text-text-primary tracking-tight text-sm">
              Trend<span className="text-accent">Intelligence</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {loading ? null : user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-accent text-white hover:bg-accent/90 transition-all duration-200 shadow-md"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all duration-200"
              >
                <LogIn size={13} />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  // SIDEBAR NAVIGATION FOR APP PAGES
  return (
    <>
      {/* Mobile top bar */}
      <div className="flex md:hidden items-center justify-between px-6 h-14 bg-surface border-b border-border fixed top-0 left-0 right-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img
            src="/logo-n.png"
            alt="Trend Intelligence Logo"
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="font-bold text-text-primary text-xs tracking-tight">
            Trend<span className="text-accent">Intel</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-all"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Overlay for mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-45 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-surface border-r border-border flex flex-col justify-between transition-all duration-300 md:pt-0 pt-14
          ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
          ${collapsed ? "md:w-20" : "md:w-64"}
        `}
      >
        <div className="flex flex-col gap-4 flex-1">
          {/* Logo Section */}
          <div className={`h-16 flex items-center border-b border-border/60 relative ${collapsed ? "justify-center px-2" : "justify-between px-6"}`}>
            <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
              <img
                src="/logo-n.png"
                alt="Trend Intelligence Logo"
                className="h-9 w-9 shrink-0 object-contain"
              />
              {!collapsed && (
                <span className="font-bold text-text-primary text-sm tracking-tight whitespace-nowrap animate-fade-in">
                  Trend<span className="text-accent">Intelligence</span>
                </span>
              )}
            </Link>

            {/* Collapse toggle (only desktop) - positioned absolutely on the border */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 z-50 p-1.5 rounded-full border border-border bg-surface hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer shadow-sm hover:scale-105"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-3">
            {NAV_LINKS.filter(({ href }) => href !== "/status" || user?.role === "admin").map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center rounded text-xs font-semibold transition-all duration-200 group relative
                    ${collapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "gap-3 px-3 py-2.5"}
                    ${
                      active
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                    }
                  `}
                  title={collapsed ? label : undefined}
                >
                  <Icon
                    size={16}
                    className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      active ? "text-accent" : "text-text-secondary group-hover:text-text-primary"
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate whitespace-nowrap">{label}</span>
                  )}
                  
                  {/* Collapsed Tooltip fallback */}
                  {collapsed && (
                    <span className="absolute left-16 bg-surface border border-border shadow-lg px-2 py-1 rounded text-[10px] text-text-primary font-semibold opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all origin-left pointer-events-none z-50">
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}
            {user?.role === "admin" && (
              (() => {
                const active = pathname === "/admin" || pathname.startsWith("/admin/");
                return (
                  <Link
                    href="/admin"
                    className={`flex items-center rounded text-xs font-semibold transition-all duration-200 group relative
                      ${collapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "gap-3 px-3 py-2.5"}
                      ${
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                      }
                    `}
                    title={collapsed ? "Admin Panel" : undefined}
                  >
                    <Shield
                      size={16}
                      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        active ? "text-accent" : "text-text-secondary group-hover:text-text-primary"
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate whitespace-nowrap">Admin Panel</span>
                    )}
                    
                    {collapsed && (
                      <span className="absolute left-16 bg-surface border border-border shadow-lg px-2 py-1 rounded text-[10px] text-text-primary font-semibold opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all origin-left pointer-events-none z-50">
                        Admin Panel
                      </span>
                    )}
                  </Link>
                );
              })()
            )}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-border/60 bg-surface-elevated/40 flex flex-col gap-2">
          {/* User Display */}
          {user && (
            <Link
              href="/profile"
              className={`flex items-center rounded hover:bg-surface-elevated transition-colors cursor-pointer group/user
                ${collapsed ? "justify-center p-1.5 mx-auto w-10 h-10" : "gap-3 px-3 py-2"}
              `}
              title={collapsed ? `${user.username} (${user.email})` : undefined}
            >
              <div className="h-7 w-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0 group-hover/user:border-accent">
                <User size={13} className="text-accent" />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-text-primary truncate group-hover/user:text-accent transition-colors">
                    {user.username}
                  </span>
                  <span className="text-[10px] text-text-secondary truncate">
                    {user.email}
                  </span>
                </div>
              )}
            </Link>
          )}

          {/* Theme & Logout Buttons */}
          <div className="flex flex-col gap-1">
            <button
              onClick={toggleTheme}
              className={`flex items-center rounded text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors
                ${collapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "gap-3 px-3 py-2.5"}
              `}
              title={collapsed ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
            >
              {theme === "dark" ? (
                <>
                  <Sun size={15} className="shrink-0" />
                  {!collapsed && <span>Light Mode</span>}
                </>
              ) : (
                <>
                  <Moon size={15} className="shrink-0" />
                  {!collapsed && <span>Dark Mode</span>}
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center rounded text-xs font-semibold text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors group
                ${collapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "gap-3 px-3 py-2.5"}
              `}
              title={collapsed ? "Sign Out" : undefined}
            >
              <LogOut size={15} className="shrink-0 group-hover:text-red-500" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
