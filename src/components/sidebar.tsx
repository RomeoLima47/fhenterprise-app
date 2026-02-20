"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";

export function Sidebar() {
  const pathname = usePathname();
  const tasks = useQuery(api.tasks.list);
  const pendingInvites = useQuery(api.invitations.listMyPending);
  const [mobileOpen, setMobileOpen] = useState(false);

  const todoCount = tasks?.filter((t) => t.status !== "done").length ?? 0;
  const inviteCount = pendingInvites?.length ?? 0;

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "Tasks", href: "/tasks", icon: "✅", badge: todoCount > 0 ? todoCount : undefined },
    { label: "Board", href: "/board", icon: "📋" },
    { label: "Projects", href: "/projects", icon: "📁" },
    { label: "Templates", href: "/templates", icon: "📐" },
    { label: "Calendar", href: "/calendar", icon: "📅" },
    { label: "Analytics", href: "/analytics", icon: "📈" },
    { label: "Invitations", href: "/invitations", icon: "📬", badge: inviteCount > 0 ? inviteCount : undefined },
    { label: "Settings", href: "/settings", icon: "⚙️" },
  ];

  const openSearch = () => {
    setMobileOpen(false);
    setTimeout(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }));
    }, 100);
  };

  const searchBtn = (
    <button
      onClick={openSearch}
      className="mx-3 mb-1 flex items-center justify-between rounded-md border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <span className="flex items-center gap-2">🔍 Search...</span>
      <kbd className="hidden rounded border bg-background px-1 py-0.5 text-[10px] sm:inline">⌘K</kbd>
    </button>
  );

  const navList = (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(item.href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span className="flex items-center gap-3">
            <span>{item.icon}</span>
            {item.label}
          </span>
          {item.badge !== undefined && (
            <span className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
              pathname.startsWith(item.href) ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground"
            )}>
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="flex items-center justify-between border-t px-3 py-3">
      <UserButton afterSignOutUrl="/sign-in" />
      <ThemeToggle />
    </div>
  );

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-sm font-bold">FH Enterprise</span>
        <NotificationBell />
      </div>

      {mobileOpen && <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={cn(
        "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r bg-card transition-transform duration-200 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <span className="text-xl font-bold">FH Enterprise</span>
          <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">✕</button>
        </div>
        {searchBtn}
        {navList}
        {footer}
      </aside>

      <aside className="hidden h-screen w-64 flex-col border-r bg-card lg:flex">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <span className="text-xl font-bold">FH Enterprise</span>
          <NotificationBell />
        </div>
        {searchBtn}
        {navList}
        {footer}
      </aside>
    </>
  );
}
