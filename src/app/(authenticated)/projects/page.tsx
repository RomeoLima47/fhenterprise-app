"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectsPageSkeleton } from "@/components/skeletons";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useQuery(api.projects.list);
  const tasks = useQuery(api.tasks.list);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const deleteProject = useMutation(api.projects.remove);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (projects === undefined || tasks === undefined) {
    return <ProjectsPageSkeleton />;
  }

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProject({ name, description: description || undefined });
    setName("");
    setDescription("");
    setOpen(false);
  };

  const getTaskCounts = (projectId: Id<"projects">) => {
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    return {
      total: projectTasks.length,
      done: projectTasks.filter((t) => t.status === "done").length,
    };
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button onClick={handleCreate} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-1 text-2xl">📁</p>
            <p className="mb-2 text-muted-foreground">No projects yet.</p>
            <Button onClick={() => setOpen(true)}>Create your first project</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const counts = getTaskCounts(project._id);
            const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
            return (
              <Card
                key={project._id}
                className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md"
                onClick={() => router.push(`/projects/${project._id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Badge
                        variant="secondary"
                        className={
                          project.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }
                      >
                        {project.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateProject({
                            id: project._id,
                            status: project.status === "active" ? "archived" : "active",
                          })
                        }
                      >
                        {project.status === "active" ? "📦" : "♻️"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProject({ id: project._id })}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <div className="mb-2">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{counts.done}/{counts.total} tasks</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
