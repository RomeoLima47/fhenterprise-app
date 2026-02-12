import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { createNotification } from "./notifications";

export const listForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      invitations.map(async (inv) => {
        const inviter = await ctx.db.get(inv.invitedBy);
        return { ...inv, inviterName: inviter?.name ?? "Unknown" };
      })
    );

    return enriched;
  },
});

export const listMyPending = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const pending = await ctx.db
      .query("invitations")
      .withIndex("by_email_status", (q) =>
        q.eq("email", user.email).eq("status", "pending")
      )
      .collect();

    const enriched = await Promise.all(
      pending.map(async (inv) => {
        const project = await ctx.db.get(inv.projectId);
        const inviter = await ctx.db.get(inv.invitedBy);
        return {
          ...inv,
          projectName: project?.name ?? "Unknown",
          inviterName: inviter?.name ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

export const send = mutation({
  args: {
    email: v.string(),
    projectId: v.id("projects"),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    if (project.ownerId !== user._id) throw new Error("Only project owners can invite");

    if (args.email === user.email) throw new Error("Cannot invite yourself");

    // Check for existing pending invitation
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email_status", (q) =>
        q.eq("email", args.email).eq("status", "pending")
      )
      .collect();

    const alreadyInvited = existing.some((inv) => inv.projectId === args.projectId);
    if (alreadyInvited) throw new Error("Already invited to this project");

    // Check if already a member
    const members = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const member of members) {
      const memberUser = await ctx.db.get(member.userId);
      if (memberUser?.email === args.email) {
        throw new Error("Already a member of this project");
      }
    }

    await ctx.db.insert("invitations", {
      email: args.email,
      projectId: args.projectId,
      role: args.role,
      invitedBy: user._id,
      status: "pending",
      createdAt: Date.now(),
    });

    // Notify the invitee if they have an account
    const invitedUsers = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    if (invitedUsers.length > 0) {
      await createNotification(ctx, {
        userId: invitedUsers[0]._id,
        type: "invitation",
        title: "Project invitation",
        message: `${user.name} invited you to "${project.name}" as ${args.role}.`,
        linkTo: "/invitations",
      });
    }
  },
});

export const accept = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.email !== user.email) throw new Error("Not your invitation");
    if (invitation.status !== "pending") throw new Error("Invitation already handled");

    await ctx.db.patch(args.id, { status: "accepted" });

    // Add as project member
    await ctx.db.insert("projectMembers", {
      projectId: invitation.projectId,
      userId: user._id,
      role: invitation.role,
      addedAt: Date.now(),
    });

    // Notify the inviter
    const project = await ctx.db.get(invitation.projectId);
    await createNotification(ctx, {
      userId: invitation.invitedBy,
      type: "system",
      title: "Invitation accepted",
      message: `${user.name} joined "${project?.name ?? "project"}" as ${invitation.role}.`,
      linkTo: `/projects/${invitation.projectId}`,
    });
  },
});

export const decline = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.email !== user.email) throw new Error("Not your invitation");
    if (invitation.status !== "pending") throw new Error("Invitation already handled");

    await ctx.db.patch(args.id, { status: "declined" });
  },
});

export const revoke = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.id);
    if (!invitation) throw new Error("Invitation not found");

    const project = await ctx.db.get(invitation.projectId);
    if (!project || project.ownerId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});