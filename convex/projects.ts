import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { createNotification } from "./notifications";

export const list = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get owned projects
    const owned = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();

    // Get shared projects (where user is a member)
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const sharedProjects = await Promise.all(
      memberships
        .filter((m) => m.role !== "owner")
        .map(async (m) => {
          const project = await ctx.db.get(m.projectId);
          return project;
        })
    );

    const shared = sharedProjects.filter(Boolean) as typeof owned;

    // Combine and deduplicate
    const allIds = new Set<string>();
    const all = [];
    for (const p of [...owned, ...shared]) {
      if (!allIds.has(p._id)) {
        allIds.add(p._id);
        const owner = await ctx.db.get(p.ownerId);
        all.push({
          ...p,
          isOwner: p.ownerId === user._id,
          ownerName: owner?.name ?? "Unknown",
        });
      }
    }

    return all;
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
      ...args,
      status: "active",
      ownerId: user._id,
      createdAt: Date.now(),
    });

    // Add owner as a project member
    await ctx.db.insert("projectMembers", {
      projectId,
      userId: user._id,
      role: "owner",
      addedAt: Date.now(),
    });
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

    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Project not found");
    if (existing.ownerId !== user._id) throw new Error("Only owners can update projects");

    if (fields.status === "archived" && existing.status === "active") {
      await createNotification(ctx, {
        userId: user._id,
        type: "project_archived",
        title: "Project archived",
        message: `"${existing.name}" has been archived.`,
        linkTo: "/projects",
      });
    }

    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Project not found");
    if (existing.ownerId !== user._id) throw new Error("Only owners can delete projects");

    // Clean up members
    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    // Clean up invitations
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const inv of invitations) {
      await ctx.db.delete(inv._id);
    }

    await ctx.db.delete(args.id);
  },
});