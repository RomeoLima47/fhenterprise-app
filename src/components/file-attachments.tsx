"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Id } from "../../convex/_generated/dataModel";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const fileIcons: Record<string, string> = {
  "application/pdf": "📄",
  "image/png": "🖼️",
  "image/jpeg": "🖼️",
  "image/gif": "🖼️",
  "image/webp": "🖼️",
  "image/svg+xml": "🖼️",
  "text/plain": "📝",
  "text/csv": "📊",
  "application/json": "📋",
  "application/zip": "📦",
  "application/x-zip-compressed": "📦",
  "video/mp4": "🎬",
  "audio/mpeg": "🎵",
};

function getFileIcon(fileType: string) {
  if (fileIcons[fileType]) return fileIcons[fileType];
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType.startsWith("video/")) return "🎬";
  if (fileType.startsWith("audio/")) return "🎵";
  if (fileType.startsWith("text/")) return "📝";
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) return "📊";
  if (fileType.includes("document") || fileType.includes("word")) return "📄";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "📑";
  return "📎";
}

function isPreviewable(fileType: string) {
  return fileType.startsWith("image/");
}

export function FileAttachments({
  taskId,
  projectId,
}: {
  taskId?: Id<"tasks">;
  projectId?: Id<"projects">;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl);
  const saveAttachment = useMutation(api.attachments.saveAttachment);
  const removeAttachment = useMutation(api.attachments.remove);

  const attachments = taskId
    ? useQuery(api.attachments.listByTask, { taskId })
    : projectId
      ? useQuery(api.attachments.listByProject, { projectId })
      : [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const result = await new Promise<{ storageId: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      // Save attachment record
      await saveAttachment({
        storageId: result.storageId as Id<"_storage">,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        taskId,
        projectId,
      });
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Attachments
          {attachments && attachments.length > 0 && ` (${attachments.length})`}
        </h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? `Uploading ${progress}%` : "📎 Attach"}
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="mb-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {attachments === undefined ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : attachments.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          No files attached — click Attach to upload.
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att._id}
              className="flex items-center gap-3 rounded-md border p-2 transition-colors hover:bg-muted/50"
            >
              {/* Preview or icon */}
              {isPreviewable(att.fileType) && att.url ? (
                <a href={att.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={att.url}
                    alt={att.fileName}
                    className="h-10 w-10 flex-shrink-0 rounded object-cover"
                  />
                </a>
              ) : (
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted text-lg">
                  {getFileIcon(att.fileType)}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <a
                  href={att.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {att.fileName}
                </a>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(att.fileSize)} · {att.uploaderName} · {timeAgo(att.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {att.url && (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Download"
                  >
                    ⬇️
                  </a>
                )}
                <button
                  onClick={() => removeAttachment({ id: att._id })}
                  className="rounded p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
