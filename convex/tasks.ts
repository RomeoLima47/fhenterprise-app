import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { createNotification } from "./notifications";

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const ownTasks = await ctx.db
      .query("tasks")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const sharedProjectIds = memberships
      .filter((m) => m.role !== "owner")
      .map((m) => m.projectId);

    const sharedTasks = [];
    for (const pid of sharedProjectIds) {
      const projectTasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", pid))
        .collect();
      sharedTasks.push(...projectTasks);
    }

    const allIds = new Set<string>();
    const all: (typeof ownTasks[number] & { assigneeName?: string })[] = [];
    for (const t of [...ownTasks, ...sharedTasks]) {
      if (!allIds.has(t._id)) {
        allIds.add(t._id);
        let assigneeName: string | undefined;
        if (t.assigneeId) {
          const assignee = await ctx.db.get(t.assigneeId);
          assigneeName = assignee?.name;
        }
        all.push({ ...t, assigneeName });
      }
    }

    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    dueDate: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      ownerId: user._id,
      createdAt: Date.now(),
    });

    // Notify assignee
    if (args.assigneeId && args.assigneeId !== user._id) {
      await createNotification(ctx, {
        userId: args.assigneeId,
        type: "system",
        title: "Task assigned",
        message: `${user.name} assigned you "${args.title}".`,
        linkTo: "/tasks",
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    dueDate: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
    assigneeId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Task not found");

    let hasAccess = existing.ownerId === user._id;
    if (!hasAccess && existing.projectId) {
      const membership = await ctx.db
        .query("projectMembers")
        .withIndex("by_project_user", (q) =>
          q.eq("projectId", existing.projectId!).eq("userId", user._id)
        )
        .first();
      hasAccess = !!membership && membership.role !== "viewer";
    }
    if (!hasAccess) throw new Error("Not authorized");

    // Notify on completion
    if (fields.status === "done" && existing.status !== "done") {
      let projectName = "";
      if (existing.projectId) {
        const project = await ctx.db.get(existing.projectId);
        projectName = project ? ` in ${project.name}` : "";
      }
      await createNotification(ctx, {
        userId: existing.ownerId,
        type: "task_completed",
        title: "Task completed",
        message: `"${existing.title}"${projectName} has been marked as done.`,
        linkTo: "/tasks",
      });
    }

    // Notify on reassignment
    if (fields.assigneeId && fields.assigneeId !== existing.assigneeId && fields.assigneeId !== user._id) {
      await createNotification(ctx, {
        userId: fields.assigneeId,
        type: "system",
        title: "Task assigned",
        message: `${user.name} assigned you "${existing.title}".`,
        linkTo: "/tasks",
      });
    }

    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Task not found");

    let hasAccess = existing.ownerId === user._id;
    if (!hasAccess && existing.projectId) {
      const membership = await ctx.db
        .query("projectMembers")
        .withIndex("by_project_user", (q) =>
          q.eq("projectId", existing.projectId!).eq("userId", user._id)
        )
        .first();
      hasAccess = !!membership && membership.role === "editor";
    }
    if (!hasAccess) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});