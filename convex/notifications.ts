import { query, mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// Helper to create notifications from other files
export async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: string;
    type: "task_completed" | "due_soon" | "overdue" | "invitation" | "comment" | "system";
    title: string;
    message: string;
    linkTo?: string;
  }
) {
  await ctx.db.insert("notifications", {
    userId: args.userId as any,
    type: args.type,
    title: args.title,
    message: args.message,
    linkTo: args.linkTo,
    read: false,
    createdAt: Date.now(),
  });
}

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return notifications;
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const unreadItems = unread.filter((n) => !n.read);

    for (const notification of unreadItems) {
      await ctx.db.patch(notification._id, { read: true });
    }
  },
});