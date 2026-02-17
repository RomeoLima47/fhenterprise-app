"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function ProjectsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const projects = useQuery(api.projects.list);
  const tasks = useQuery(api.tasks.list);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const deleteProject = useMutation(api.projects.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"projects"> | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<Id<"projects"> | null>(null);

  const deleteProjectName = projects?.find((p) => p._id === deleteConfirm)?.name ?? "";
  const archiveProjectName = projects?.find((p) => p._id === archiveConfirm)?.name ?? "";

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProject({ name, description: description || undefined });
    toast(`Project "${name}" created`);
    setName(""); setDescription(""); setCreateOpen(false);
  };

  const handleArchive = async (id: Id<"projects">) => {
    const p = projects?.find((p) => p._id === id);
    await updateProject({ id, status: "archived" });
    toast(`"${p?.name}" archived`);
  };

  const handleDelete = async (id: Id<"projects">) => {
    const p = projects?.find((p) => p._id === id);
    await deleteProject({ id });
    toast(`"${p?.name}" deleted`);
  };

  const getProjectTasks = (projectId: Id<"projects">) => {
    if (!tasks) return { total: 0, done: 0 };
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    return {
      total: projectTasks.length,
      done: projectTasks.filter((t) => t.status === "done").length,
    };
  };

  if (!projects) {
    return (
      <div>
        <div className="mb-6 h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  const myProjects = projects.filter((p) => p.isOwner);
  const sharedProjects = projects.filter((p) => !p.isOwner);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} total · {projects.filter((p) => p.status === "active").length} active
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">+ New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Project name" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} autoFocus />
              <Input placeholder="Description (optional)" value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete project?"
        message={`Are you sure you want to delete "${deleteProjectName}" and all its tasks? This cannot be undone.`}
        onConfirm={() => { if (deleteConfirm) handleDelete(deleteConfirm); }}
      />

      <ConfirmDialog
        open={!!archiveConfirm}
        onOpenChange={(open) => !open && setArchiveConfirm(null)}
        title="Archive project?"
        message={`Archive "${archiveProjectName}"? You can still view it but it won't appear in active lists.`}
        confirmLabel="Archive"
        variant="default"
        onConfirm={() => { if (archiveConfirm) handleArchive(archiveConfirm); }}
      />

      {myProjects.length === 0 && sharedProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-1 text-2xl">📁</p>
            <p className="mb-2 text-muted-foreground">No projects yet.</p>
            <Button onClick={() => setCreateOpen(true)}>Create your first project</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {myProjects.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-base font-semibold sm:text-lg">My Projects</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myProjects.map((project) => {
                  const { total, done } = getProjectTasks(project._id);
                  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <Card
                      key={project._id}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => router.push(`/projects/${project._id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{project.name}</CardTitle>
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
                        </div>
                      </CardHeader>
                      <CardContent>
                        {project.description && (
                          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                        )}
                        <div className="mb-2">
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{done}/{total} tasks</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-1" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          {project.status === "active" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setArchiveConfirm(project._id)}>
                              📦
                            </Button>
                          )}
                          {project.status === "archived" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={async () => {
                                await updateProject({ id: project._id, status: "active" });
                                toast(`"${project.name}" restored`);
                              }}
                            >
                              ♻️
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDeleteConfirm(project._id)}>
                            🗑️
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {sharedProjects.length > 0 && (
            <div>
              <h2 className="mb-3 text-base font-semibold sm:text-lg">Shared with Me</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sharedProjects.map((project) => {
                  const { total, done } = getProjectTasks(project._id);
                  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <Card
                      key={project._id}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => router.push(`/projects/${project._id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{project.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">Shared</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {project.description && (
                          <p className="mb-2 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                        )}
                        <p className="mb-2 text-xs text-muted-foreground">Owned by {project.ownerName}</p>
                        <div>
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{done}/{total} tasks</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
