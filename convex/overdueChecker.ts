import { internalMutation } from "./_generated/server";

export const checkOverdueTasks = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Get all tasks with due dates
    const allTasks = await ctx.db.query("tasks").collect();

    const overdueTasks = allTasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < now &&
        t.dueDate > oneDayAgo &&
        t.status !== "done"
    );

    for (const task of overdueTasks) {
      // Check if we already sent an overdue notification for this task recently
      const existingNotifs = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", task.ownerId))
        .order("desc")
        .take(100);

      const alreadyNotified = existingNotifs.some(
        (n) =>
          n.type === "task_overdue" &&
          n.message.includes(task.title) &&
          n.createdAt > oneDayAgo
      );

      if (!alreadyNotified) {
        let projectName = "";
        if (task.projectId) {
          const project = await ctx.db.get(task.projectId);
          projectName = project ? ` in ${project.name}` : "";
        }

        await ctx.db.insert("notifications", {
          userId: task.ownerId,
          type: "task_overdue",
          title: "Task overdue",
          message: `"${task.title}"${projectName} is past its due date.`,
          read: false,
          linkTo: "/tasks",
          createdAt: Date.now(),
        });
      }
    }
  },
});