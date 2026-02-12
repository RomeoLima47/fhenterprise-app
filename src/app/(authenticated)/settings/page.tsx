"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.me);
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);

  const completedTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt="Profile"
                className="h-16 w-16 rounded-full"
              />
            )}
            <div>
              <p className="text-lg font-medium">
                {user?.fullName ?? "Loading..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress ?? ""}
              </p>
              <Badge variant="secondary" className="mt-1">
                {convexUser?.role ?? "member"}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>
                {convexUser?.createdAt
                  ? new Date(convexUser.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clerk ID</span>
              <span className="font-mono text-xs">{convexUser?.clerkId ?? "..."}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{completedTasks}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{completionRate}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{projects?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Projects</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">
                {projects?.filter((p) => p.status === "active").length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Active Projects</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To update your profile picture, name, email, or password, click the
            user avatar in the bottom-left of the sidebar. Clerk manages your
            account settings securely.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
