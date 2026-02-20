import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const listBySubtask = query({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", args.subtaskId))
      .collect();

    const enriched = await Promise.all(
      workOrders.map(async (wo) => {
        let assigneeName: string | undefined;
        if (wo.assigneeId) {
          const assignee = await ctx.db.get(wo.assigneeId);
          assigneeName = (assignee as any)?.name;
        }
        return { ...wo, assigneeName };
      })
    );

    return enriched.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("workOrders")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", args.subtaskId))
      .collect();

    const maxOrder = existing.length > 0
      ? Math.max(...existing.map((w) => w.order))
      : -1;

    const woId = await ctx.db.insert("workOrders", {
      subtaskId: args.subtaskId,
      title: args.title,
      description: args.description,
      status: "todo",
      assigneeId: args.assigneeId,
      startDate: args.startDate,
      endDate: args.endDate,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    // Activity log — walk up to get projectId
    const subtask = await ctx.db.get(args.subtaskId);
    let projectId;
    let taskId;
    if (subtask) {
      taskId = subtask.taskId;
      const task = await ctx.db.get(subtask.taskId);
      projectId = (task as any)?.projectId;
    }
    await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: "created",
      entityType: "workOrder",
      entityId: woId,
      entityName: args.title,
      taskId,
      projectId,
      createdAt: Date.now(),
    });

    return woId;
  },
});

export const update = mutation({
  args: {
    id: v.id("workOrders"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    assigneeId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const wo = await ctx.db.get(args.id);
    if (!wo) throw new Error("Work order not found");

    const { id, ...fields } = args;

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && (wo as any)[key] !== value) {
        changes[key] = { from: (wo as any)[key], to: value };
      }
    }

    await ctx.db.patch(id, fields);

    if (Object.keys(changes).length > 0) {
      const subtask = await ctx.db.get(wo.subtaskId);
      let projectId;
      let taskId;
      if (subtask) {
        taskId = subtask.taskId;
        const task = await ctx.db.get(subtask.taskId);
        projectId = (task as any)?.projectId;
      }
      const action = changes.status ? "status_changed" : "updated";
      await ctx.db.insert("activityLog", {
        userId: user._id,
        userName: user.name,
        action,
        entityType: "workOrder",
        entityId: id,
        entityName: args.title || wo.title,
        details: JSON.stringify(changes),
        taskId,
        projectId,
        createdAt: Date.now(),
      });
    }

    return { previous: wo };
  },
});

export const remove = mutation({
  args: { id: v.id("workOrders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const wo = await ctx.db.get(args.id);
    if (!wo) throw new Error("Work order not found");

    const subtask = await ctx.db.get(wo.subtaskId);
    let projectId;
    let taskId;
    if (subtask) {
      taskId = subtask.taskId;
      const task = await ctx.db.get(subtask.taskId);
      projectId = (task as any)?.projectId;
    }

    await ctx.db.insert("activityLog", {
      userId: user._id,
      userName: user.name,
      action: "deleted",
      entityType: "workOrder",
      entityId: args.id,
      entityName: wo.title,
      taskId,
      projectId,
      createdAt: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});