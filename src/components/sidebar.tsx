"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar() {
  const pathname = usePathname();
  const tasks = useQuery(api.tasks.list);

  const todoCount = tasks?.filter((t) => t.status !== "done").length ?? 0;

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "📊" },
    { label: "Tasks", href: "/tasks", icon: "✅", badge: todoCount > 0 ? todoCount : undefined },
    { label: "Projects", href: "/projects", icon: "📁" },
    { label: "Calendar", href: "/calendar", icon: "📅" },
    { label: "Settings", href: "/settings", icon: "⚙️" },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <span className="text-xl font-bold">FH Enterprise</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
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
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                  pathname.startsWith(item.href)
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between border-t px-3 py-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <ThemeToggle />
      </div>
    </aside>
  );
}
