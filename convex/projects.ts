import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get projects user owns
    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    // Get projects user is a member of
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const memberProjectIds = memberships
      .filter((m) => m.role !== "owner")
      .map((m) => m.projectId);

    const memberProjects = await Promise.all(
      memberProjectIds.map(async (pid) => {
        const project = await ctx.db.get(pid);
        return project;
      })
    );

    const ownedWithMeta = ownedProjects.map((p) => ({
      ...p,
      isOwner: true,
      ownerName: user.name,
    }));

    const sharedWithMeta = await Promise.all(
      memberProjects
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map(async (p) => {
          const owner = await ctx.db.get(p.ownerId);
          return {
            ...p,
            isOwner: false,
            ownerName: (owner as any)?.name ?? "Unknown",
          };
        })
    );

    return [...ownedWithMeta, ...sharedWithMeta].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      status: "active",
      ownerId: user._id,
      createdAt: Date.now(),
    });

    // Add owner as project member
    await ctx.db.insert("projectMembers", {
      projectId,
      userId: user._id,
      role: "owner",
      addedAt: Date.now(),
    });

    return projectId;
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Not authorized");

    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Not authorized");

    // Delete project members
    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);

    // Delete project tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const t of tasks) await ctx.db.delete(t._id);

    // Delete project notes
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const n of notes) await ctx.db.delete(n._id);

    // Delete invitations
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const i of invitations) await ctx.db.delete(i._id);

    await ctx.db.delete(args.id);
  },
});