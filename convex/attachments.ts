import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAttachment = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("attachments", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      taskId: args.taskId,
      projectId: args.projectId,
      uploadedBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      attachments.map(async (att) => {
        const url = await ctx.storage.getUrl(att.storageId);
        const uploader = await ctx.db.get(att.uploadedBy);
        return {
          ...att,
          url,
          uploaderName: uploader?.name ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      attachments.map(async (att) => {
        const url = await ctx.storage.getUrl(att.storageId);
        const uploader = await ctx.db.get(att.uploadedBy);
        return {
          ...att,
          url,
          uploaderName: uploader?.name ?? "Unknown",
        };
      })
    );

    return enriched;
  },
});

export const remove = mutation({
  args: { id: v.id("attachments") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const attachment = await ctx.db.get(args.id);
    if (!attachment) throw new Error("Attachment not found");
    if (attachment.uploadedBy !== user._id) throw new Error("Not authorized");

    await ctx.storage.delete(attachment.storageId);
    await ctx.db.delete(args.id);
  },
});