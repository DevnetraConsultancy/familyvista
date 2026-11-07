"use client";

import { useRef, useState } from "react";
import { CloudUpload, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { isImageFile, cn } from "@/lib/utils";
import { useUploadStore } from "@/lib/upload-store";

interface Props {
  albumId: string;
  /** Slim single-line strip, for use below a non-empty grid. */
  compact?: boolean;
}

export function UploadZone({ albumId, compact = false }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const enqueue = useUploadStore((s) => s.enqueue);
  const hasActiveInAlbum = useUploadStore((s) =>
    s.items.some(
      (i) =>
        i.albumId === albumId &&
        (i.status === "queued" ||
          i.status === "optimizing" ||
          i.status === "uploading" ||
          i.status === "processing")
    )
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const all = Array.from(fileList);
    const accepted = all.filter(isImageFile);
    if (accepted.length === 0) {
      toast.error("No image files found");
      return;
    }
    const count = enqueue(albumId, accepted);
    if (count > 0) {
      const skipped = all.length - count;
      toast.success(
        `${count} photo${count === 1 ? "" : "s"} queued for upload` +
          (skipped > 0 ? ` (${skipped} skipped)` : "")
      );
    } else {
      toast.error("No image files found");
    }
  };

  const dragProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!dragOver) setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    onClick: () => inputRef.current?.click(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    role: "button" as const,
    tabIndex: 0,
    "data-album": albumId,
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => {
        handleFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (compact) {
    return (
      <div
        {...dragProps}
        className={cn(
          "flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed border-[var(--line)] text-sm transition-colors",
          "hover:border-[var(--gold)] hover:bg-[var(--gold-soft)]",
          dragOver && "border-[var(--gold)] bg-[var(--gold-soft)]"
        )}
      >
        {input}
        {hasActiveInAlbum ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            <span className="font-medium">Uploading</span>
            <span className="text-xs text-muted-foreground">
              Drop more photos here anytime
            </span>
          </>
        ) : (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--gold-soft)] text-gold">
              <Plus className="h-4 w-4" />
            </span>
            <span className="font-medium">Add more photos</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              or drop them here
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      {...dragProps}
      className={cn(
        "dot-grid flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--line)] p-8 text-center transition-colors",
        "hover:border-[var(--gold)] hover:bg-[var(--gold-soft)]",
        dragOver && "border-[var(--gold)] bg-[var(--gold-soft)]"
      )}
    >
      {input}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--gold-soft)] text-gold">
        {hasActiveInAlbum ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <CloudUpload className="h-6 w-6" />
        )}
      </div>
      {hasActiveInAlbum ? (
        <>
          <p className="font-display text-xl font-semibold">Uploading</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Track progress in the upload tray. You can visit other albums
            meanwhile.
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-xl font-semibold">
            {dragOver ? "Drop to upload" : "Drop photos here or click to browse"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            JPG, PNG, WebP, GIF. Bulk upload supported. Photos are compressed
            losslessly before upload.
          </p>
        </>
      )}
    </div>
  );
}
