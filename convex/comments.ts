import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";
import { createNotification } from "./notifications";

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();

    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        return {
          ...comment,
          authorName: author?.name ?? "Unknown",
          authorImage: author?.imageUrl,
        };
      })
    );

    // Build threaded structure
    const topLevel = enriched.filter((c) => !c.parentId);
    const replies = enriched.filter((c) => c.parentId);

    return topLevel.map((comment) => ({
      ...comment,
      replies: replies.filter((r) => r.parentId === comment._id),
    }));
  },
});

export const commentCount = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    return comments.length;
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("comments", {
      taskId: args.taskId,
      authorId: user._id,
      content: args.content,
      parentId: args.parentId,
      createdAt: Date.now(),
    });

    // Notify the task owner if someone else comments
    const task = await ctx.db.get(args.taskId);
    if (task && task.ownerId !== user._id) {
      await createNotification(ctx, {
        userId: task.ownerId,
        type: "comment",
        title: "New comment",
        message: `${user.name} commented on "${task.title}": ${args.content.slice(0, 60)}${args.content.length > 60 ? "..." : ""}`,
        linkTo: "/tasks",
      });
    }

    // If this is a reply, also notify the parent comment author
    if (args.parentId) {
      const parentComment = await ctx.db.get(args.parentId);
      if (parentComment && parentComment.authorId !== user._id && parentComment.authorId !== task?.ownerId) {
        await createNotification(ctx, {
          userId: parentComment.authorId,
          type: "comment",
          title: "Reply to your comment",
          message: `${user.name} replied: ${args.content.slice(0, 60)}${args.content.length > 60 ? "..." : ""}`,
          linkTo: "/tasks",
        });
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user._id) throw new Error("Not authorized");

    // Delete all replies too
    const allComments = await ctx.db
      .query("comments")
      .withIndex("by_task", (q) => q.eq("taskId", comment.taskId))
      .collect();

    const replies = allComments.filter((c) => c.parentId === args.id);
    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(args.id);
  },
});