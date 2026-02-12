"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
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
import type { Id } from "../../../../../convex/_generated/dataModel";

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

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as Id<"projects">;

  const projects = useQuery(api.projects.list);
  const allTasks = useQuery(api.tasks.list);
  const notes = useQuery(api.notes.listByProject, { projectId });
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);
  const createNote = useMutation(api.notes.create);
  const deleteNote = useMutation(api.notes.remove);

  const [taskOpen, setTaskOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState<string>("");

  const [noteContent, setNoteContent] = useState("");

  const project = projects?.find((p) => p._id === projectId);
  const tasks = allTasks?.filter((t) => t.projectId === projectId);

  const handleCreateTask = async () => {
    if (!title.trim()) return;
    await createTask({
      title,
      description: description || undefined,
      status: "todo",
      priority,
      projectId,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setTaskOpen(false);
  };

  const handleCreateNote = async () => {
    if (!noteContent.trim()) return;
    await createNote({ content: noteContent, projectId });
    setNoteContent("");
  };

  const cycleStatus = async (id: Id<"tasks">, current: string) => {
    const next = current === "todo" ? "in_progress" : current === "in_progress" ? "done" : "todo";
    await updateTask({ id, status: next as "todo" | "in_progress" | "done" });
  };

  if (!project) {
    return (
      <div>
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = tasks?.length ?? 0;

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push("/projects")}
          className="mb-2 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Projects
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {doneTasks}/{totalTasks} tasks completed
            </p>
          </div>
          <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
            <DialogTrigger asChild>
              <Button>+ Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Task to {project.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <select
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Due date (optional)</label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <Button onClick={handleCreateTask} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
          {!tasks ? (
            <p className="text-muted-foreground">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tasks in this project yet — add one to get started!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task._id} className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => cycleStatus(task._id, task.status)}
                        className="text-lg"
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
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              📅 {formatDate(task.dueDate)}
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
                      <Button variant="ghost" size="sm" onClick={() => deleteTask({ id: task._id })}>
                        🗑️
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Activity</h2>
          <Card>
            <CardContent className="pt-4">
              <div className="mb-4 flex gap-2">
                <Input
                  placeholder="Add a note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateNote();
                  }}
                />
                <Button onClick={handleCreateNote} size="sm">
                  Post
                </Button>
              </div>

              {!notes ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note._id} className="border-b pb-3 last:border-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm">{note.content}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {note.authorName} · {formatDateTime(note.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => deleteNote({ id: note._id })}
                        >
                          ×
                        </Button>
                      </div>
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
