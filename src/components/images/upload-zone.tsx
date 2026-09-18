"use client";

import { useRef } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isImageFile, cn } from "@/lib/utils";
import { useUploadStore } from "@/lib/upload-store";

interface Props {
  albumId: string;
}

export function UploadZone({ albumId }: Props) {
  const dragOver = useRef(false);
  const enqueue = useUploadStore((s) => s.enqueue);
  const hasActiveInAlbum = useUploadStore((s) =>
    s.items.some(
      (i) =>
        i.albumId === albumId &&
        (i.status === "queued" ||
          i.status === "uploading" ||
          i.status === "processing")
    )
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const accepted = Array.from(fileList).filter(isImageFile);
    if (accepted.length === 0) {
      toast.error("No image files found");
      return;
    }
    const count = enqueue(albumId, accepted);
    if (count > 0) {
      toast.success(`${count} photo${count === 1 ? "" : "s"} queued for upload`);
    } else {
      toast.error("No image files found");
    }
  };

  return (
    <div
      data-album={albumId}
      onDragOver={(e) => {
        e.preventDefault();
        dragOver.current = true;
      }}
      onDragLeave={() => {
        dragOver.current = false;
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragOver.current = false;
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        "border-border hover:border-primary/50 hover:bg-accent/40"
      )}
      onClick={() => inputRef.current?.click()}
    >
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
      {hasActiveInAlbum ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Uploading…</p>
          <p className="text-xs text-muted-foreground">
            Track progress in the upload tray — you can visit other albums
            meanwhile.
          </p>
        </>
      ) : (
        <>
          <CloudUpload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop photos here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP, GIF, HEIC — bulk upload supported
          </p>
        </>
      )}
    </div>
  );
}
