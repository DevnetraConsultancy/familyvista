"use client";

import { useCallback, useRef, useState } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isImageFile, cn } from "@/lib/utils";

interface Props {
  albumId: string;
  uploadFiles: (
    files: File[],
    groupId: string | null,
    onProgress?: (done: number, total: number) => void
  ) => Promise<boolean>;
}

export function UploadZone({ albumId, uploadFiles }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      const files = Array.from(fileList).filter(isImageFile);
      if (files.length === 0) {
        toast.error("No image files found");
        return;
      }
      setUploading(true);
      setProgress({ done: 0, total: files.length });
      const ok = await uploadFiles(files, null, (done, total) =>
        setProgress({ done, total })
      );
      setUploading(false);
      if (ok) toast.success(`${files.length} photo(s) uploaded`);
      else toast.error("Some uploads failed — check the list");
    },
    [uploadFiles]
  );

  return (
    <div
      data-album={albumId}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragOver
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50 hover:bg-accent/40"
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
      {uploading ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">
            Uploading {progress.done} / {progress.total}…
          </p>
          <div className="h-1.5 w-56 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
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
