"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Id } from "../../../../convex/_generated/dataModel";

const columns = [
  { id: "todo", label: "To Do", color: "border-t-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "in_progress", label: "In Progress", color: "border-t-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { id: "done", label: "Done", color: "border-t-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
];

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const priorityDots = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-gray-400",
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function BoardPage() {
  const tasks = useQuery(api.tasks.list);
  const projects = useQuery(api.projects.list);
  const updateTask = useMutation(api.tasks.update);
  const createTask = useMutation(api.tasks.create);
  const deleteTask = useMutation(api.tasks.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<string>("todo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const [filterProject, setFilterProject] = useState<string>("all");

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId as Id<"tasks">;
    const newStatus = result.destination.droppableId as "todo" | "in_progress" | "done";
    await updateTask({ id: taskId, status: newStatus });
  };

  const openCreateForColumn = (columnId: string) => {
    setCreateColumn(columnId);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTask({
      title,
      description: description || undefined,
      status: createColumn as "todo" | "in_progress" | "done",
      priority,
      projectId: projectId ? (projectId as Id<"projects">) : undefined,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
    setProjectId("");
    setDueDate("");
    setCreateOpen(false);
  };

  const getProjectName = (pid?: Id<"projects">) => {
    if (!pid || !projects) return null;
    return projects.find((p) => p._id === pid)?.name ?? null;
  };

  const filteredTasks = tasks?.filter((task) => {
    if (filterProject !== "all") {
      if (filterProject === "none" && task.projectId) return false;
      if (filterProject !== "none" && task.projectId !== filterProject) return false;
    }
    return true;
  });

  const getColumnTasks = (status: string) =>
    filteredTasks?.filter((t) => t.status === status) ?? [];

  if (!tasks || !projects) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div className="h-9 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Board</h1>
        <select
          className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-auto"
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
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Task to {columns.find((c) => c.id === createColumn)?.label}
            </DialogTitle>
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const columnTasks = getColumnTasks(column.id);
            return (
              <div
                key={column.id}
                className={`flex min-w-[280px] flex-1 flex-col rounded-lg border-t-4 ${column.color} ${column.bg} p-3`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{column.label}</h2>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                      {columnTasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openCreateForColumn(column.id)}
                  >
                    +
                  </Button>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 rounded-md p-1 transition-colors ${
                        snapshot.isDraggingOver ? "bg-primary/5" : ""
                      }`}
                      style={{ minHeight: "200px" }}
                    >
                      {columnTasks.map((task, index) => {
                        const projectName = getProjectName(task.projectId);
                        const overdue =
                          task.status !== "done" &&
                          task.dueDate &&
                          task.dueDate < Date.now();

                        return (
                          <Draggable key={task._id} draggableId={task._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-md border bg-card p-3 shadow-sm transition-shadow ${
                                  snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md"
                                }`}
                              >
                                <div className="mb-2 flex items-start justify-between">
                                  <p
                                    className={`text-sm font-medium ${
                                      task.status === "done" ? "text-muted-foreground line-through" : ""
                                    }`}
                                  >
                                    {task.title}
                                  </p>
                                  <button
                                    onClick={() => deleteTask({ id: task._id })}
                                    className="ml-2 flex-shrink-0 text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    ×
                                  </button>
                                </div>
                                {task.description && (
                                  <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-block h-2 w-2 rounded-full ${priorityDots[task.priority]}`}
                                    title={task.priority}
                                  />
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] ${priorityColors[task.priority]}`}
                                  >
                                    {task.priority}
                                  </Badge>
                                  {projectName && (
                                    <span className="text-[10px] text-muted-foreground">
                                      📁 {projectName}
                                    </span>
                                  )}
                                  {task.dueDate && (
                                    <span
                                      className={`text-[10px] ${
                                        overdue ? "font-medium text-red-500" : "text-muted-foreground"
                                      }`}
                                    >
                                      📅 {formatDate(task.dueDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
