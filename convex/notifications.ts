import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    type: "task_overdue" | "task_completed" | "project_archived" | "note_added" | "invitation" | "comment" | "system";
    title: string;
    message: string;
    linkTo?: string;
  }
) {
  await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    title: args.title,
    message: args.message,
    read: false,
    linkTo: args.linkTo,
    createdAt: Date.now(),
  });
}

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

export const unreadCount = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const notif = await ctx.db.get(args.id);
    if (!notif) throw new Error("Notification not found");
    if (notif.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllAsRead = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();

    for (const notif of unread) {
      await ctx.db.patch(notif._id, { read: true });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const notif = await ctx.db.get(args.id);
    if (!notif) throw new Error("Notification not found");
    if (notif.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});

export const clearAll = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const notif of all) {
      await ctx.db.delete(notif._id);
    }
  },
});