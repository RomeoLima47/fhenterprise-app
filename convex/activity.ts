import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const recentActivity = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get user's projects
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const projectIds = memberships.map((m) => m.projectId);

    // Get recent notes from all user's projects
    const allNotes: {
      _id: string;
      content: string;
      projectId: string;
      authorId: string;
      createdAt: number;
      authorName: string;
      projectName: string;
    }[] = [];

    for (const pid of projectIds) {
      const notes = await ctx.db
        .query("notes")
        .withIndex("by_project", (q) => q.eq("projectId", pid))
        .order("desc")
        .take(5);

      for (const note of notes) {
        const author = await ctx.db.get(note.authorId);
        const project = await ctx.db.get(pid);
        allNotes.push({
          _id: note._id,
          content: note.content,
          projectId: pid,
          authorId: note.authorId,
          createdAt: note.createdAt,
          authorName: author?.name ?? "Unknown",
          projectName: project?.name ?? "Unknown",
        });
      }
    }

    return allNotes
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  },
});

export const upcomingDeadlines = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get own tasks
    const ownTasks = await ctx.db
      .query("tasks")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    // Get shared project tasks
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const sharedProjectIds = memberships
      .filter((m) => m.role !== "owner")
      .map((m) => m.projectId);

    const sharedTasks: (typeof ownTasks)[number][] = [];
    for (const pid of sharedProjectIds) {
      const projectTasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", pid))
        .collect();
      sharedTasks.push(...projectTasks);
    }

    const allIds = new Set<string>();
    const all: (typeof ownTasks)[number][] = [];
    for (const t of [...ownTasks, ...sharedTasks]) {
      if (!allIds.has(t._id)) {
        allIds.add(t._id);
        all.push(t);
      }
    }

    // Filter to tasks with due dates that aren't done, sort by due date
    const withDeadlines = all
      .filter((t) => t.dueDate && t.status !== "done")
      .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0))
      .slice(0, 8);

    // Enrich with project names
    const enriched = await Promise.all(
      withDeadlines.map(async (task) => {
        let projectName: string | undefined;
        if (task.projectId) {
          const project = await ctx.db.get(task.projectId);
          projectName = project?.name;
        }
        return { ...task, projectName };
      })
    );

    return enriched;
  },
});