"use client";

import React from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/skeletons";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatCountdown(endDate: number) {
  const diff = endDate - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: "text-red-500 font-medium" };
  if (days === 0) return { text: "today", color: "text-orange-500 font-medium" };
  if (days === 1) return { text: "tomorrow", color: "text-orange-500" };
  if (days <= 3) return { text: `${days}d left`, color: "text-yellow-500" };
  return { text: `${days}d left`, color: "text-muted-foreground" };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);
  const deadlines = useQuery(api.activity.upcomingDeadlines);
  const recentActivity = useQuery(api.activity.recentActivity);

  if (tasks === undefined || projects === undefined) return <DashboardSkeleton />;

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.status !== "done").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter((t) => t.status !== "done" && t.endDate && t.endDate < Date.now()).length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  const subtitle = overdueTasks > 0
    ? `${overdueTasks} overdue — let's get those done`
    : activeTasks > 0
    ? `${activeTasks} active tasks across ${activeProjects} projects`
    : "All caught up!";

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {getGreeting()}, {user?.firstName ?? "there"} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => router.push("/tasks")}>📋 Tasks</Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/board")}>📊 Board</Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/analytics")}>📈 Analytics</Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/calendar")}>📅 Calendar</Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => router.push("/tasks")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => router.push("/tasks")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">{activeTasks}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => router.push("/tasks")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-500">{doneTasks}</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-all hover:shadow-md ${overdueTasks > 0 ? "ring-1 ring-red-500/30" : ""}`} onClick={() => router.push("/tasks")}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className={`text-2xl font-bold ${overdueTasks > 0 ? "text-red-500" : ""}`}>{overdueTasks}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Card>
          <CardContent className="pt-4">
            <h2 className="mb-3 text-sm font-semibold">📅 Upcoming Deadlines</h2>
            {!deadlines || deadlines.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-2">
                {deadlines.map((d) => {
                  const countdown = formatCountdown(d.endDate);
                  return (
                    <div
                      key={d._id}
                      className="flex cursor-pointer items-center justify-between rounded-md border p-2 transition-colors hover:bg-muted/50"
                      onClick={() => {
                        if (d.projectId) router.push(`/projects/${d.projectId}/tasks/${d._id}`);
                        else router.push("/tasks");
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {d.projectName && <span>📁 {d.projectName}</span>}
                          <Badge variant="secondary" className="text-[10px]">{d.priority}</Badge>
                        </div>
                      </div>
                      <span className={`ml-2 whitespace-nowrap text-xs ${countdown.color}`}>{countdown.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="pt-4">
            <h2 className="mb-3 text-sm font-semibold">💬 Recent Activity</h2>
            {!recentActivity || recentActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((note: any) => (
                  <div
                    key={note._id}
                    className="cursor-pointer rounded-md border p-2 transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/projects/${note.projectId}`)}
                  >
                    <p className="text-sm">{note.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {note.authorName} · {note.projectName} · {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
