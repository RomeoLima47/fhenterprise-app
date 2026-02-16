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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TasksPageSkeleton } from "@/components/skeletons";
import { TaskComments } from "@/components/task-comments";
import { FileAttachments } from "@/components/file-attachments";
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

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  const [editTask, setEditTask] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editProjectId, setEditProjectId] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState<string>("");

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [search, setSearch] = useState("");

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

  const openEdit = (task: any) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditProjectId(task.projectId || "");
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
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

  const getProjectName = (pid?: Id<"projects">) => {
    if (!pid) return null;
    return projects.find((p) => p._id === pid)?.name ?? null;
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Tasks</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">+ New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projects.filter((p) => p.status === "active").map((project) => (
                  <option key={project._id} value={project._id}>{project.name}</option>
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

      <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row">
        <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <select className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select className="flex h-10 rounded-md border bg-background px-3 py-2 text-sm" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-1 text-2xl">✅</p>
            <p className="mb-2 text-muted-foreground">
              {tasks.length === 0 ? "No tasks yet." : "No tasks match your filters."}
            </p>
            {tasks.length === 0 && (
              <Button onClick={() => setCreateOpen(true)}>Create your first task</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const projectName = getProjectName(task.projectId);
            const overdue = task.status !== "done" && task.dueDate && task.dueDate < Date.now();

            return (
              <Card
                key={task._id}
                className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md"
                onClick={() => openEdit(task)}
              >
                <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
                        updateTask({ id: task._id, status: next });
                      }}
                      className="mt-0.5 text-base transition-transform hover:scale-110"
                    >
                      {task.status === "done" ? "✅" : task.status === "in_progress" ? "🔄" : "⬜"}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {task.description && <span className="hidden truncate sm:inline">{task.description}</span>}
                        {projectName && <span>📁 {projectName}</span>}
                        {task.dueDate && (
                          <span className={overdue ? "font-medium text-red-500" : ""}>
                            📅 {formatDate(task.dueDate)}
                          </span>
                        )}
                        <span>💬</span>
                        <span>📎</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-8 sm:pl-0">
                    <Badge variant="secondary" className={`text-xs ${statusColors[task.status]}`}>
                      {task.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className={`text-xs ${priorityColors[task.priority]}`}>
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

      {/* Task Detail Dialog */}
      <Dialog open={!!editTask} onOpenChange={(open) => !open && setEditTask(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {editTask && (
            <div className="space-y-4 pt-4">
              <div className="space-y-4">
                <Input placeholder="Task title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                <Input placeholder="Description (optional)" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editPriority} onChange={(e) => setEditPriority(e.target.value as any)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)}>
                  <option value="">No project</option>
                  {projects.filter((p) => p.status === "active").map((project) => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Due date</label>
                  <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                </div>
                <Button onClick={handleEdit} className="w-full">Save Changes</Button>
              </div>

              <Tabs defaultValue="comments" className="border-t pt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="comments" className="flex-1">💬 Comments</TabsTrigger>
                  <TabsTrigger value="files" className="flex-1">📎 Files</TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="pt-2">
                  <TaskComments taskId={editTask._id} />
                </TabsContent>
                <TabsContent value="files" className="pt-2">
                  <FileAttachments taskId={editTask._id} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
