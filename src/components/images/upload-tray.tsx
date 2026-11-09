"use client";

import { useEffect, useState } from "react";
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
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadStore, type UploadItem } from "@/lib/upload-store";
import { cn, formatBytes } from "@/lib/utils";

const ACTIVE = new Set<UploadItem["status"]>(["optimizing", "uploading", "processing"]);

function StatusIcon({ status }: { status: UploadItem["status"] }) {
  switch (status) {
    case "queued":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case "optimizing":
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-gold" />;
    case "uploading":
      return <CloudUpload className="h-4 w-4 text-gold" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "error":
      return <XCircle className="h-4 w-4 text-danger" />;
  }
}

function statusLabel(item: UploadItem, pct: number): string {
  switch (item.status) {
    case "queued":
      return "Waiting";
    case "optimizing":
      return "Compressing";
    case "uploading":
      return `${pct}%`;
    case "processing":
      return "Saving";
    case "done":
      return item.size < item.originalSize
        ? `${formatBytes(item.originalSize)} to ${formatBytes(item.size)} · -${Math.round(
            (1 - item.size / item.originalSize) * 100
          )}%`
        : formatBytes(item.size);
    case "error":
      return "Failed";
  }
}

export function UploadTray() {
  const items = useUploadStore((s) => s.items);
  const retry = useUploadStore((s) => s.retry);
  const retryAllFailed = useUploadStore((s) => s.retryAllFailed);
  const cancel = useUploadStore((s) => s.cancel);
  const cancelAll = useUploadStore((s) => s.cancelAll);
  const dismiss = useUploadStore((s) => s.dismiss);
  const clearFinished = useUploadStore((s) => s.clearFinished);
  const [expanded, setExpanded] = useState(true);

  const activeCount = items.filter((i) => ACTIVE.has(i.status) || i.status === "queued").length;

  // Closing or reloading the tab drops the in-memory queue: ask first.
  useEffect(() => {
    if (activeCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [activeCount]);

  if (items.length === 0) return null;

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const totalBytes = items.reduce((acc, i) => acc + i.size, 0);
  const sentBytes = items.reduce(
    (acc, i) => acc + (i.status === "done" ? i.size : Math.min(i.bytesUploaded, i.size)),
    0
  );
  const savedBytes = items
    .filter((i) => i.status === "done" && i.originalSize > i.size)
    .reduce((acc, i) => acc + (i.originalSize - i.size), 0);
  const overallPct = totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0;
  const active = activeCount > 0;

  const title = active
    ? `Uploading ${done + 1 > items.length ? items.length : done + 1} of ${items.length}`
    : failed > 0
      ? `${done} uploaded · ${failed} failed`
      : `${done} uploaded`;

  const subtitle = active
    ? `${overallPct}% · ${formatBytes(sentBytes)} / ${formatBytes(totalBytes)}`
    : [
        `${formatBytes(totalBytes)} total`,
        savedBytes > 0 ? `saved ${formatBytes(savedBytes)} by compression` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  const RING = 2 * Math.PI * 15;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] w-80 max-w-[calc(100vw-2rem)]">
      <div className="glass-strong pointer-events-auto overflow-hidden rounded-xl">
        {/* Header / summary */}
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-accent/40"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            {active ? (
              <>
                <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden>
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--line)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(overallPct / 100) * RING} ${RING}`}
                    className="transition-all duration-300"
                  />
                </svg>
                <CloudUpload className="absolute h-4 w-4 text-gold" />
              </>
            ) : (
              <CheckCircle2
                className={cn("h-6 w-6", failed > 0 ? "text-danger" : "text-success")}
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{title}</span>
            <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Item list */}
        {expanded && (
          <div className="max-h-64 overflow-y-auto border-t border-[var(--line)] scrollbar-thin">
            {items.map((item) => {
              const pct =
                item.status === "done"
                  ? 100
                  : item.size > 0
                    ? Math.min(100, Math.round((item.bytesUploaded / item.size) * 100))
                    : 0;
              const cancellable = item.status === "queued" || ACTIVE.has(item.status);
              return (
                <div key={item.id} className="group px-3 py-2 hover:bg-accent/30">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">
                      <StatusIcon status={item.status} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {item.fileName}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {statusLabel(item, pct)}
                    </span>
                    <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {item.status === "error" && (
                        <button
                          type="button"
                          title="Retry"
                          className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => retry(item.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {cancellable && (
                        <button
                          type="button"
                          title="Cancel"
                          className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => cancel(item.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {(item.status === "done" || item.status === "error") && (
                        <button
                          type="button"
                          title="Dismiss"
                          className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => dismiss(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </div>
                  {item.status === "error" && item.error ? (
                    <p
                      className="mt-0.5 truncate text-[10px] text-danger"
                      title={item.error}
                    >
                      {item.error}
                    </p>
                  ) : (
                    <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-[var(--line)]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          item.status === "done"
                            ? "bg-success"
                            : item.status === "optimizing" || item.status === "processing"
                              ? "animate-pulse [background:var(--gold-grad)]"
                              : "[background:var(--gold-grad)]"
                        )}
                        style={{
                          width:
                            item.status === "optimizing"
                              ? "12%"
                              : item.status === "processing"
                                ? "96%"
                                : `${pct}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {expanded && (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] p-2">
            <span className="min-w-0 truncate text-[10px] text-muted-foreground">
              {active
                ? "You can keep browsing while photos upload"
                : failed > 0
                  ? "Some photos need attention"
                  : "All uploads finished"}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {failed > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={retryAllFailed}>
                  Retry failed
                </Button>
              )}
              {active ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-danger hover:text-danger"
                  onClick={cancelAll}
                >
                  Cancel all
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFinished}>
                  Clear
                </Button>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
