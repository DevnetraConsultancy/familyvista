"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  Loader2,
  RotateCcw,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadStore } from "@/lib/upload-store";
import { cn, formatBytes } from "@/lib/utils";

export function UploadTray() {
  const items = useUploadStore((s) => s.items);
  const trayOpen = useUploadStore((s) => s.trayOpen);
  const setTrayOpen = useUploadStore((s) => s.setTrayOpen);
  const retry = useUploadStore((s) => s.retry);
  const cancel = useUploadStore((s) => s.cancel);
  const dismiss = useUploadStore((s) => s.dismiss);
  const clearFinished = useUploadStore((s) => s.clearFinished);
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) return null;

  const uploading = items.filter(
    (i) => i.status === "uploading" || i.status === "processing"
  );
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const totalBytes = items.reduce((acc, i) => acc + i.size, 0);
  const sentBytes = items.reduce(
    (acc, i) => acc + (i.status === "done" ? i.size : i.bytesUploaded),
    0
  );
  const overallPct =
    totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0;
  const active = uploading.length > 0;
  const allSettled = !active;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] w-80 max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto overflow-hidden rounded-xl border bg-card shadow-2xl">
        {/* Header / summary */}
        <button
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/50"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="relative flex h-9 w-9 items-center justify-center">
            {active ? (
              <>
                <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallPct / 100) * 94.2} 94.2`}
                    className="text-primary transition-all duration-300"
                  />
                </svg>
                <CloudUpload className="absolute h-4 w-4 text-primary" />
              </>
            ) : (
              <CheckCircle2
                className={cn(
                  "h-6 w-6",
                  failed > 0 ? "text-destructive" : "text-green-500"
                )}
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {active
                ? `Uploading ${items.length - done - failed} item${
                    items.length - done - failed === 1 ? "" : "s"
                  }`
                : failed > 0
                  ? `${failed} upload${failed === 1 ? "" : "s"} failed`
                  : `Upload complete — ${done} item${done === 1 ? "" : "s"}`}
            </span>
            <span className="block text-xs text-muted-foreground">
              {active
                ? `${overallPct}% · ${formatBytes(sentBytes)} / ${formatBytes(totalBytes)}`
                : `${formatBytes(totalBytes)} total`}
            </span>
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Item list */}
        {expanded && (
          <div className="max-h-64 overflow-y-auto border-t scrollbar-thin">
            {items.map((item) => {
              const pct =
                item.status === "done"
                  ? 100
                  : item.size > 0
                    ? Math.round((item.bytesUploaded / item.size) * 100)
                    : 0;
              return (
                <div key={item.id} className="group px-3 py-2 hover:bg-accent/30">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">
                      {item.status === "uploading" && (
                        <CloudUpload className="h-4 w-4 text-primary" />
                      )}
                      {item.status === "processing" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {item.status === "done" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === "error" && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      {item.status === "queued" && (
                        <Loader2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {item.fileName}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {item.status === "uploading"
                        ? `${pct}%`
                        : item.status === "processing"
                          ? "Saving…"
                          : item.status === "done"
                            ? formatBytes(item.size)
                            : item.status === "error"
                              ? ""
                              : "Waiting…"}
                    </span>
                    {/* row actions */}
                    <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                      {item.status === "error" && (
                        <button
                          title="Retry"
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => retry(item.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {(item.status === "uploading" ||
                        item.status === "queued") && (
                        <button
                          title="Cancel"
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => cancel(item.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {(item.status === "done" || item.status === "error") && (
                        <button
                          title="Dismiss"
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => dismiss(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </div>
                  {item.status === "error" && item.error && (
                    <p
                      className="mt-0.5 truncate text-[10px] text-destructive"
                      title={item.error}
                    >
                      {item.error}
                    </p>
                  )}
                  {item.status !== "error" && (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          item.status === "done" ? "bg-green-500" : "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {expanded && allSettled && (
          <div className="flex items-center justify-between border-t p-2">
            <span className="text-[10px] text-muted-foreground">
              {failed > 0 ? "Some items need attention" : "All uploads finished"}
            </span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFinished}>
              Clear list
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
