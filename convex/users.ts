import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  return user;
}

export const store = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: identity.name ?? "Unknown",
        email: identity.email ?? "",
        imageUrl: identity.pictureUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Unknown",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
      role: "member",
      createdAt: Date.now(),
    });
  },
});

export const me = query({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});