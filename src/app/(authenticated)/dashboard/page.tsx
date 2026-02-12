"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton, ActivitySkeleton } from "@/components/skeletons";

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntil(timestamp: number) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(timestamp);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);
  const activity = useQuery(api.activity.recentActivity);
  const deadlines = useQuery(api.activity.upcomingDeadlines);

  if (tasks === undefined || projects === undefined) {
    return <DashboardSkeleton />;
  }

  const taskCounts = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const projectCounts = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
        Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground sm:text-base">
        Here&apos;s an overview of your operations.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 md:grid-cols-4">
        {[
          { label: "Total Tasks", value: taskCounts.total, color: "text-foreground" },
          { label: "To Do", value: taskCounts.todo, color: "text-blue-500" },
          { label: "In Progress", value: taskCounts.in_progress, color: "text-yellow-500" },
          { label: "Done", value: taskCounts.done, color: "text-green-500" },
        ].map((stat) => (
          <Card key={stat.label} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-1 sm:pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold sm:text-3xl ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold sm:text-3xl">{projectCounts.total}</p>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500 sm:text-3xl">{projectCounts.active}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-base font-semibold sm:text-lg">Upcoming Deadlines</h2>
          <Card>
            <CardContent className="pt-4">
              {deadlines === undefined ? (
                <ActivitySkeleton />
              ) : deadlines.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="mb-1 text-2xl">📅</p>
                  <p className="text-sm text-muted-foreground">No upcoming deadlines. Nice!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deadlines.map((task) => {
                    const days = daysUntil(task.dueDate!);
                    let dateColor = "text-muted-foreground";
                    let dateLabel = `${formatDate(task.dueDate!)}`;
                    if (days < 0) {
                      dateColor = "text-red-500 font-medium";
                      dateLabel += ` (${Math.abs(days)}d overdue)`;
                    } else if (days === 0) {
                      dateColor = "text-red-500 font-medium";
                      dateLabel += " (today)";
                    } else if (days <= 3) {
                      dateColor = "text-yellow-500 font-medium";
                      dateLabel += ` (${days}d left)`;
                    } else {
                      dateLabel += ` (${days}d left)`;
                    }

                    return (
                      <div
                        key={task._id}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{task.title}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs ${dateColor}`}>📅 {dateLabel}</span>
                            {task.projectName && (
                              <span className="hidden text-xs text-muted-foreground sm:inline">
                                📁 {task.projectName}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className={`ml-2 ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold sm:text-lg">Recent Activity</h2>
          <Card>
            <CardContent className="pt-4">
              {activity === undefined ? (
                <ActivitySkeleton />
              ) : activity.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="mb-1 text-2xl">💬</p>
                  <p className="text-sm text-muted-foreground">
                    No recent activity. Add notes to projects to see them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.map((item) => (
                    <div
                      key={item._id}
                      className="cursor-pointer rounded-md border-b pb-3 last:border-0 hover:bg-muted/50"
                      onClick={() => router.push(`/projects/${item.projectId}`)}
                    >
                      <p className="truncate text-sm">{item.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.authorName} in{" "}
                        <span className="font-medium">{item.projectName}</span> ·{" "}
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
