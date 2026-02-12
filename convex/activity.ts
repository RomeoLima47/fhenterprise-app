import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const recentActivity = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const recentNotes = await ctx.db
      .query("notes")
      .order("desc")
      .take(20);

    const userNotes = [];
    for (const note of recentNotes) {
      const project = await ctx.db.get(note.projectId);
      if (project && project.ownerId === user._id) {
        const author = await ctx.db.get(note.authorId);
        userNotes.push({
          _id: note._id,
          type: "note" as const,
          content: note.content,
          projectName: project.name,
          projectId: project._id,
          authorName: author?.name ?? "Unknown",
          createdAt: note.createdAt,
        });
      }
    }

    return userNotes.slice(0, 10);
  },
});

export const upcomingDeadlines = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    const withDueDates = tasks
      .filter((t) => t.dueDate && t.status !== "done")
      .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0))
      .slice(0, 5);

    const enriched = await Promise.all(
      withDueDates.map(async (task) => {
        let projectName = null;
        if (task.projectId) {
          const project = await ctx.db.get(task.projectId);
          projectName = project?.name ?? null;
        }
        return { ...task, projectName };
      })
    );

    return enriched;
  },
});