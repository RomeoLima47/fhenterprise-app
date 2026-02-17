"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

const typeIcons: Record<string, string> = {
  task_completed: "✅",
  due_soon: "⏰",
  overdue: "🔴",
  invitation: "📬",
  comment: "🗨️",
  system: "📢",
};

export function NotificationBell() {
  const router = useRouter();
  const notifications = useQuery(api.notifications.list);
  const markRead = useMutation(api.notifications.markAsRead);
  const markAllRead = useMutation(api.notifications.markAllAsRead);

  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const panelWidth = 320;
    const padding = 8;

    // Position below the bell
    let top = rect.bottom + 8;
    // Align right edge with bell, but keep within viewport
    let left = rect.right - panelWidth;

    // If it goes off the left side, push it right
    if (left < padding) left = padding;
    // If it goes off the right side, push it left
    if (left + panelWidth > window.innerWidth - padding) {
      left = window.innerWidth - panelWidth - padding;
    }
    // If it goes below viewport, cap height will handle scroll
    if (top < padding) top = padding;

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [open, updatePosition]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        bellRef.current && !bellRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const maxHeight = mounted ? Math.max(200, window.innerHeight - pos.top - 16) : 400;

  const panel = open && mounted ? createPortal(
    <>
      <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: 320,
          maxHeight,
          zIndex: 999,
        }}
        className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">
            Notifications {unread > 0 && <span className="text-muted-foreground">({unread})</span>}
          </p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={async () => { await markAllRead({}); }}
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications === undefined ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-1 text-2xl">🔔</p>
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            notifications.slice(0, 20).map((notification) => (
              <button
                key={notification._id}
                onClick={async () => {
                  if (!notification.read) { await markRead({ id: notification._id }); }
                  if (notification.linkTo) { router.push(notification.linkTo); }
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50",
                  !notification.read && "bg-primary/5"
                )}
              >
                <span className="mt-0.5 text-base flex-shrink-0">
                  {typeIcons[notification.type] || "📢"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm leading-snug", !notification.read && "font-medium")}>
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {panel}
    </>
  );
}