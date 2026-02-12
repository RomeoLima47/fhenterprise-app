"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const typeIcons = {
  task_completed: "✅",
  task_overdue: "⏰",
  project_archived: "📦",
  note_added: "💬",
  system: "🔔",
};

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const notifications = useQuery(api.notifications.list);
  const unreadCount = useQuery(api.notifications.unreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const removeNotif = useMutation(api.notifications.remove);
  const clearAll = useMutation(api.notifications.clearAll);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleClick = async (notif: { _id: string; read: boolean; linkTo?: string }) => {
    if (!notif.read) {
      await markAsRead({ id: notif._id as any });
    }
    if (notif.linkTo) {
      router.push(notif.linkTo);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        🔔
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount! > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex gap-1">
              {(unreadCount ?? 0) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => markAllAsRead()}
                >
                  Mark all read
                </Button>
              )}
              {(notifications?.length ?? 0) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => clearAll()}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="mb-1 text-xl">🔔</p>
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50",
                    !notif.read && "bg-primary/5"
                  )}
                >
                  <span className="mt-0.5 text-base">
                    {typeIcons[notif.type] || "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm truncate", !notif.read && "font-medium")}>
                        {notif.title}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotif({ id: notif._id });
                        }}
                        className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
