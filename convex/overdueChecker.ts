import { cronJobs } from "convex/server";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const checkOverdueTasks = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get all tasks with due dates
    const allTasks = await ctx.db.query("tasks").collect();

    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "done"
    );

    for (const task of overdueTasks) {
      // Check if we already sent an overdue notification for this task
      const existingNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", task.ownerId))
        .collect();

      const alreadyNotified = existingNotifications.some(
        (n) =>
          n.type === "overdue" &&
          n.message.includes(task.title) &&
          n.createdAt > now - 24 * 60 * 60 * 1000 // within last 24h
      );

      if (!alreadyNotified) {
        let projectName = "";
        if (task.projectId) {
          const project = await ctx.db.get(task.projectId);
          projectName = project ? ` in ${project.name}` : "";
        }

        await ctx.db.insert("notifications", {
          userId: task.ownerId,
          type: "overdue",
          title: "Task overdue",
          message: `"${task.title}"${projectName} is past due.`,
          linkTo: "/tasks",
          read: false,
          createdAt: now,
        });
      }
    }
  },
});

const crons = cronJobs();
crons.interval(
  "check overdue tasks",
  { hours: 1 },
  internal.overdueChecker.checkOverdueTasks
);

export default crons;