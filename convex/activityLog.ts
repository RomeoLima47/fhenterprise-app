import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// ─── CREATE LOG ENTRY ───────────────────────────────────────

export const log = mutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    entityName: v.string(),
    details: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    return await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      entityName: args.entityName,
      details: args.details,
      projectId: args.projectId,
      taskId: args.taskId,
      createdAt: Date.now(),
    });
  },
});

// ─── QUERY BY PROJECT ───────────────────────────────────────

export const listByProject = query({
  args: { projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const entries = await ctx.db
      .query("activityLog")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    return entries.slice(0, args.limit ?? 50);
  },
});

// ─── QUERY BY TASK ──────────────────────────────────────────

export const listByTask = query({
  args: { taskId: v.id("tasks"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const entries = await ctx.db
      .query("activityLog")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();

    return entries.slice(0, args.limit ?? 50);
  },
});

// ─── QUERY BY ENTITY (generic) ──────────────────────────────

export const listByEntity = query({
  args: { entityType: v.string(), entityId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const entries = await ctx.db
      .query("activityLog")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", args.entityType).eq("entityId", args.entityId)
      )
      .order("desc")
      .collect();

    return entries.slice(0, args.limit ?? 50);
  },
});

// ─── QUERY ALL FOR USER (recent activity feed) ──────────────

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const entries = await ctx.db
      .query("activityLog")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return entries.slice(0, args.limit ?? 100);
  },
});