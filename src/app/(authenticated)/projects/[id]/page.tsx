"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
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
import { FileAttachments } from "@/components/file-attachments";
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
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as Id<"projects">;

  const projects = useQuery(api.projects.list);
  const allTasks = useQuery(api.tasks.list);
  const notes = useQuery(api.notes.listByProject, { projectId });
  const members = useQuery(api.projectMembers.listForProject, { projectId });
  const invitations = useQuery(api.invitations.listForProject, { projectId });

  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);
  const createNote = useMutation(api.notes.create);
  const deleteNote = useMutation(api.notes.remove);
  const sendInvite = useMutation(api.invitations.send);
  const revokeInvite = useMutation(api.invitations.revoke);
  const removeMember = useMutation(api.projectMembers.removeMember);

  const [taskOpen, setTaskOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState<string>("");

  const [noteContent, setNoteContent] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteError, setInviteError] = useState("");

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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteError("");
    try {
      await sendInvite({ email: inviteEmail, projectId, role: inviteRole });
      setInviteEmail("");
    } catch (err: any) {
      setInviteError(err.message || "Failed to send invitation");
    }
  };

  const cycleStatus = async (id: Id<"tasks">, current: string) => {
    const next = current === "todo" ? "in_progress" : current === "in_progress" ? "done" : "todo";
    await updateTask({ id, status: next as "todo" | "in_progress" | "done" });
  };

  if (!project) {
    return <p className="text-muted-foreground">Loading project...</p>;
  }

  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const isOwner = project.isOwner;
  const pendingInvites = invitations?.filter((i) => i.status === "pending") ?? [];

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.push("/projects")} className="mb-2 text-sm text-muted-foreground hover:text-foreground">
          ← Back to Projects
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{project.name}</h1>
              {!isOwner && <Badge variant="secondary" className="text-xs">Shared</Badge>}
            </div>
            {project.description && <p className="mt-1 text-muted-foreground">{project.description}</p>}
            <p className="mt-1 text-sm text-muted-foreground">
              {doneTasks}/{totalTasks} tasks completed
              {!isOwner && ` · Owned by ${project.ownerName}`}
            </p>
          </div>
          <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">+ Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Task to {project.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
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

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
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
                  <CardContent className="flex items-center justify-between py-3 sm:py-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button onClick={() => cycleStatus(task._id, task.status)} className="text-lg" title="Click to cycle status">
                        {task.status === "done" ? "✅" : task.status === "in_progress" ? "🔄" : "⬜"}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {task.description && <p className="hidden text-sm text-muted-foreground sm:block">{task.description}</p>}
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">📅 {formatDate(task.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Badge variant="secondary" className={`hidden text-xs sm:inline-flex ${statusColors[task.status]}`}>
                        {task.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className={`text-xs ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => deleteTask({ id: task._id })}>🗑️</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <Tabs defaultValue="activity">
            <TabsList className="mb-3 w-full">
              <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">Files</TabsTrigger>
              <TabsTrigger value="team" className="flex-1">
                Team
                {(members?.length ?? 0) > 0 && <span className="ml-1 text-xs">({members?.length})</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardContent className="pt-4">
                  <div className="mb-4 flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateNote(); }}
                    />
                    <Button onClick={handleCreateNote} size="sm">Post</Button>
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
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteNote({ id: note._id })}>×</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card>
                <CardContent className="pt-4">
                  <FileAttachments projectId={projectId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <Card>
                <CardContent className="pt-4">
                  {isOwner && (
                    <div className="mb-4">
                      <p className="mb-2 text-sm font-medium">Invite a team member</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Email address"
                          value={inviteEmail}
                          onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
                          onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                        />
                        <select
                          className="flex h-10 rounded-md border bg-background px-2 py-2 text-sm"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <Button onClick={handleInvite} size="sm">Invite</Button>
                      </div>
                      {inviteError && <p className="mt-1 text-xs text-red-500">{inviteError}</p>}
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Members</p>
                    {members?.map((member) => (
                      <div key={member._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          {member.imageUrl ? (
                            <img src={member.imageUrl} alt="" className="h-7 w-7 rounded-full" />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{member.role}</Badge>
                          {isOwner && member.role !== "owner" && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeMember({ projectId, memberId: member._id })}>×</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isOwner && pendingInvites.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Pending Invitations</p>
                      {pendingInvites.map((inv) => (
                        <div key={inv._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div>
                            <p className="text-sm">{inv.email}</p>
                            <Badge variant="secondary" className="text-[10px]">{inv.role}</Badge>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => revokeInvite({ id: inv._id })}>Revoke</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
