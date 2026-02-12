"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TasksPageSkeleton } from "@/components/skeletons";
import type { Id } from "../../../../convex/_generated/dataModel";

const statusColors = {
  todo: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type Task = {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate?: number;
  projectId?: Id<"projects">;
  createdAt: number;
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(dueDate?: number) {
  if (!dueDate) return false;
  return dueDate < Date.now();
}

function toDateInputValue(timestamp?: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}

export default function TasksPage() {
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editProjectId, setEditProjectId] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState<string>("");

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (tasks === undefined || projects === undefined) {
    return <TasksPageSkeleton />;
  }

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTask({
      title,
      description: description || undefined,
      status,
      priority,
      projectId: projectId ? (projectId as Id<"projects">) : undefined,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
    });
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setProjectId("");
    setDueDate("");
    setCreateOpen(false);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditProjectId(task.projectId || "");
    setEditDueDate(toDateInputValue(task.dueDate));
  };

  const handleEdit = async () => {
    if (!editTask || !editTitle.trim()) return;
    await updateTask({
      id: editTask._id,
      title: editTitle,
      description: editDescription || undefined,
      status: editStatus,
      priority: editPriority,
      projectId: editProjectId ? (editProjectId as Id<"projects">) : undefined,
      dueDate: editDueDate ? new Date(editDueDate).getTime() : undefined,
    });
    setEditTask(null);
  };

  const cycleStatus = async (id: Id<"tasks">, current: string) => {
    const next = current === "todo" ? "in_progress" : current === "in_progress" ? "done" : "todo";
    await updateTask({ id, status: next as "todo" | "in_progress" | "done" });
  };

  const getProjectName = (pid?: Id<"projects">) => {
    if (!pid || !projects) return null;
    return projects.find((p) => p._id === pid)?.name ?? null;
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (filterProject !== "all") {
      if (filterProject === "none" && task.projectId) return false;
      if (filterProject !== "none" && task.projectId !== filterProject) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesDesc = task.description?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDesc) return false;
    }
    return true;
  });

  const hasActiveFilters =
    filterStatus !== "all" || filterPriority !== "all" || filterProject !== "all" || searchQuery !== "";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="flex gap-2">
                <select
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "todo" | "in_progress" | "done")}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <select
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">No project</option>
                {projects.filter((p) => p.status === "active").map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Due date (optional)</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-48"
        />
        <select
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm"
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
        >
          <option value="all">All projects</option>
          <option value="none">No project</option>
          {projects.filter((p) => p.status === "active").map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterStatus("all");
              setFilterPriority("all");
              setFilterProject("all");
              setSearchQuery("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Task title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            <div className="flex gap-2">
              <select
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "todo" | "in_progress" | "done")}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <select
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as "low" | "medium" | "high")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <select
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={editProjectId}
              onChange={(e) => setEditProjectId(e.target.value)}
            >
              <option value="">No project</option>
              {projects.filter((p) => p.status === "active").map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Due date (optional)</label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <Button onClick={handleEdit} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {hasActiveFilters ? (
              <>
                <p className="mb-1 text-2xl">🔍</p>
                <p className="text-muted-foreground">No tasks match your filters.</p>
              </>
            ) : (
              <>
                <p className="mb-1 text-2xl">✅</p>
                <p className="mb-2 text-muted-foreground">No tasks yet.</p>
                <Button onClick={() => setCreateOpen(true)}>Create your first task</Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const projectName = getProjectName(task.projectId);
            const overdue = task.status !== "done" && isOverdue(task.dueDate);
            return (
              <Card
                key={task._id}
                className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm"
                onClick={() => openEdit(task as Task)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleStatus(task._id, task.status);
                      }}
                      className="text-lg transition-transform hover:scale-110"
                      title="Click to cycle status"
                    >
                      {task.status === "done" ? "✅" : task.status === "in_progress" ? "🔄" : "⬜"}
                    </button>
                    <div>
                      <p className={`font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2">
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        {projectName && (
                          <span className="text-xs text-muted-foreground">📁 {projectName}</span>
                        )}
                        {task.dueDate && (
                          <span className={`text-xs ${overdue ? "font-medium text-red-500" : "text-muted-foreground"}`}>
                            📅 {formatDate(task.dueDate)}
                            {overdue && " (overdue)"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={statusColors[task.status]}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask({ id: task._id });
                      }}
                    >
                      🗑️
                    </Button>
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
