import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("done")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    dueDate: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
    assigneeId: v.optional(v.id("users")),
    ownerId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_project", ["projectId"])
    .index("by_assignee", ["assigneeId"]),

  notes: defineTable({
    content: v.string(),
    projectId: v.id("projects"),
    authorId: v.id("users"),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("task_overdue"),
      v.literal("task_completed"),
      v.literal("project_archived"),
      v.literal("note_added"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    linkTo: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"]),
});