"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CommentsSection } from "@/components/comments-section";
import { FileAttachments } from "@/components/file-attachments";
import { useToast } from "@/components/toast";
import type { Id } from "../../../../convex/_generated/dataModel";

const columns = [
  { id: "todo", label: "To Do", color: "border-t-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "in_progress", label: "In Progress", color: "border-t-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { id: "done", label: "Done", color: "border-t-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
];

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const priorityDots: Record<string, string> = { high: "bg-red-500", medium: "bg-orange-400", low: "bg-gray-400" };

const entityIcons: Record<string, string> = {
  task: "📋",
  subtask: "📌",
  workOrder: "🔧",
};

const entityColors: Record<string, string> = {
  task: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  subtask: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  workOrder: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Sort items: soonest upcoming endDate first, then startDate, then no-date last */
function dateSortKey(item: { endDate?: number; startDate?: number }): number {
  const now = Date.now();
  // Prefer endDate, fallback to startDate
  const date = item.endDate ?? item.startDate;
  if (!date) return Number.MAX_SAFE_INTEGER; // no date → bottom
  // Upcoming dates first (closest to now), then past dates
  return date >= now ? date : date + 1e15; // push past dates after all future ones
}

export default function BoardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const boardItems = useQuery(api.board.allItems);
  const projects = useQuery(api.projects.list);
  const updateTask = useMutation(api.tasks.update);
  const updateSubtask = useMutation(api.subtasks.update);
  const updateWorkOrder = useMutation(api.workOrders.update);
  const createTask = useMutation(api.tasks.create);
  const deleteTask = useMutation(api.tasks.remove);

  const [createOpen, setCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<string>("todo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // ─── DRAG-AND-DROP STATUS UPDATE ──────────────────────────

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const itemId = result.draggableId;
    const newStatus = result.destination.droppableId as "todo" | "in_progress" | "done";

    // Determine entity type from the dragged item
    const item = boardItems?.find((i) => i._id === itemId);
    if (!item) return;

    if (item.entityType === "task") {
      await updateTask({ id: itemId as Id<"tasks">, status: newStatus });
    } else if (item.entityType === "subtask") {
      await updateSubtask({ id: itemId as Id<"subtasks">, status: newStatus });
    } else if (item.entityType === "workOrder") {
      await updateWorkOrder({ id: itemId as Id<"workOrders">, status: newStatus });
    }

    if (newStatus === "done") toast(`${entityIcons[item.entityType]} "${item.title}" completed! 🎉`);
  };

  // ─── CREATE TASK ──────────────────────────────────────────

  const openCreateForColumn = (columnId: string) => {
    setCreateColumn(columnId);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    await createTask({
      title, description: description || undefined,
      status: createColumn as "todo" | "in_progress" | "done",
      priority,
      projectId: projectId ? (projectId as Id<"projects">) : undefined,
      endDate: endDate ? new Date(endDate).getTime() : undefined,
    });
    toast(`Task "${title}" created`);
    setTitle(""); setDescription(""); setPriority("medium"); setProjectId(""); setEndDate(""); setCreateOpen(false);
  };

  // ─── FILTERING + SORTING ──────────────────────────────────

  const filteredItems = useMemo(() => {
    if (!boardItems) return [];
    return boardItems
      .filter((item) => {
        if (filterProject !== "all") {
          if (filterProject === "none" && item.projectId) return false;
          if (filterProject !== "none" && item.projectId !== filterProject) return false;
        }
        if (filterType !== "all" && item.entityType !== filterType) return false;
        return true;
      })
      .sort((a, b) => dateSortKey(a) - dateSortKey(b));
  }, [boardItems, filterProject, filterType]);

  const getColumnItems = (status: string) => filteredItems.filter((i) => i.status === status);

  // ─── LOADING ──────────────────────────────────────────────

  if (!boardItems || !projects) {
    return (
      <div>
        <div className="mb-6 h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-96 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  // ─── COUNTS ───────────────────────────────────────────────

  const taskCount = filteredItems.filter((i) => i.entityType === "task").length;
  const subtaskCount = filteredItems.filter((i) => i.entityType === "subtask").length;
  const woCount = filteredItems.filter((i) => i.entityType === "workOrder").length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Board</h1>
          <p className="text-xs text-muted-foreground">
            {taskCount} task{taskCount !== 1 ? "s" : ""} · {subtaskCount} subtask{subtaskCount !== 1 ? "s" : ""} · {woCount} work order{woCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="flex h-9 rounded-md border bg-background px-3 py-1.5 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            title="Filter by type"
          >
            <option value="all">All types</option>
            <option value="task">📋 Tasks only</option>
            <option value="subtask">📌 Subtasks only</option>
            <option value="workOrder">🔧 Work Orders only</option>
          </select>
          <select
            className="flex h-9 rounded-md border bg-background px-3 py-1.5 text-sm"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            title="Filter by project"
          >
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.filter((p) => p.status === "active").map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Create task dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task to {columns.find((c) => c.id === createColumn)?.label}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as any)} title="Priority">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)} title="Project">
              <option value="">No project</option>
              {projects.filter((p) => p.status === "active").map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">End date (optional)</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={handleCreate} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kanban columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const colItems = getColumnItems(column.id);
            return (
              <div key={column.id} className={`flex min-w-[300px] flex-1 flex-col rounded-lg border-t-4 ${column.color} ${column.bg} p-3`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{column.label}</h2>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground" title={`${colItems.length} items`}>
                      {colItems.length}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openCreateForColumn(column.id)} title={`Add task to ${column.label}`}>+</Button>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 rounded-md p-1 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                      style={{ minHeight: "200px" }}
                    >
                      {colItems.map((item, index) => {
                        const overdue = item.status !== "done" && item.endDate && item.endDate < Date.now();
                        const isExpanded = expandedItem === item._id;

                        return (
                          <Draggable key={item._id} draggableId={item._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`rounded-md border bg-card p-3 shadow-sm transition-shadow ${
                                  snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md"
                                } ${isExpanded ? "ring-2 ring-primary/30" : ""}`}
                              >
                                {/* Card header */}
                                <div className="mb-1.5 flex items-start justify-between">
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`cursor-pointer text-sm font-medium leading-snug ${
                                        item.status === "done" ? "text-muted-foreground line-through" : ""
                                      }`}
                                      onClick={() => setExpandedItem(isExpanded ? null : item._id)}
                                      title={isExpanded ? "Collapse" : "Click to expand"}
                                    >
                                      {item.title}
                                    </p>
                                    {/* Parent breadcrumb */}
                                    {item.parentName && (
                                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={
                                        item.grandparentName
                                          ? `Task: ${item.grandparentName} → Subtask: ${item.parentName}`
                                          : `Task: ${item.parentName}`
                                      }>
                                        {item.grandparentName && <>{item.grandparentName} → </>}
                                        {item.parentName}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                    {item.entityType === "task" && item.projectId && (
                                      <button onClick={() => router.push(`/projects/${item.projectId}`)} className="text-[10px] text-muted-foreground hover:text-primary" title="View project">→</button>
                                    )}
                                    {item.entityType === "task" && (
                                      <button onClick={() => deleteTask({ id: item._id as Id<"tasks"> })} className="text-xs text-muted-foreground hover:text-red-500" title="Delete task">×</button>
                                    )}
                                  </div>
                                </div>

                                {/* Description */}
                                {item.description && (
                                  <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                )}

                                {/* Metadata badges */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Entity type badge */}
                                  <Badge variant="secondary" className={`text-[10px] ${entityColors[item.entityType]}`} title={`Type: ${item.entityType}`}>
                                    {entityIcons[item.entityType]} {item.entityType === "workOrder" ? "WO" : item.entityType}
                                  </Badge>

                                  {/* Priority (tasks only) */}
                                  {item.priority && (
                                    <>
                                      <span className={`inline-block h-2 w-2 rounded-full ${priorityDots[item.priority]}`} title={`${item.priority} priority`} />
                                      <Badge variant="secondary" className={`text-[10px] ${priorityColors[item.priority]}`} title="Priority">
                                        {item.priority}
                                      </Badge>
                                    </>
                                  )}

                                  {/* Project name */}
                                  {item.projectName && (
                                    <span className="text-[10px] text-muted-foreground" title="Project">📁 {item.projectName}</span>
                                  )}

                                  {/* Assignee */}
                                  {item.assigneeName && (
                                    <span className="text-[10px] text-muted-foreground" title="Assigned to">👤 {item.assigneeName}</span>
                                  )}

                                  {/* End date */}
                                  {item.endDate && (
                                    <span className={`text-[10px] ${overdue ? "font-medium text-red-500" : "text-muted-foreground"}`} title={overdue ? "Overdue!" : "End date"}>
                                      📅 {formatDate(item.endDate)}
                                    </span>
                                  )}

                                  {/* Start date (if no end date) */}
                                  {!item.endDate && item.startDate && (
                                    <span className="text-[10px] text-muted-foreground" title="Start date">
                                      🗓️ {formatDate(item.startDate)}
                                    </span>
                                  )}
                                </div>

                                {/* Expanded: comments + files (tasks only) */}
                                {isExpanded && item.entityType === "task" && (
                                  <div className="mt-2 space-y-2 border-t pt-2">
                                    <CommentsSection taskId={item._id as Id<"tasks">} compact />
                                    <FileAttachments taskId={item._id as Id<"tasks">} compact />
                                  </div>
                                )}
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
