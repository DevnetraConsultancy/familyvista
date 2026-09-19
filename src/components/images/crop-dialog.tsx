"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Loader2, Crop as CropIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Image } from "@/lib/types";

interface Props {
  image: Image | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the cropped JPEG blob; parent enqueues the upload. */
  onApply: (blob: Blob, suggestedName: string) => void;
}

interface Rect {
  x: number; // 0..1 fraction of natural width
  y: number;
  w: number;
  h: number;
}

type HandlePos = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: HandlePos[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const MIN_FRACTION = 0.05; // smallest crop = 5% of the displayed image

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Load the photo as a blob (avoids canvas CORS taint on cross-origin storage URLs). */
async function loadBitmap(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch the photo for cropping.");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new window.Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(
          new Error(
            "This format can't be cropped in the browser (e.g. HEIC or animated images)."
          )
        );
      img.src = objectUrl;
    });
    return img;
  } finally {
    // decode is done once loaded; revoke on next tick so the draw call still has it
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

export function CropDialog({ image, open, onOpenChange, onApply }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    mode: "move" | HandlePos | "new";
    startX: number;
    startY: number;
    orig: Rect;
  } | null>(null);

  const [rect, setRect] = useState<Rect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Natural size of the loaded bitmap, in state so render never reads the ref. */
  const [natSize, setNatSize] = useState<{ w: number; h: number } | null>(null);

  // Load the bitmap each time the dialog opens for a new photo
  useEffect(() => {
    if (!open || !image) return;
    let cancelled = false;
    const reset = async () => {
      setNatSize(null);
      setError(null);
      setRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
      setLoading(true);
      try {
        const img = await loadBitmap(image.original_url);
        if (cancelled) return;
        imgRef.current = img;
        setNatSize({ w: img.naturalWidth, h: img.naturalHeight });
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load photo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void reset();
    return () => {
      cancelled = true;
      imgRef.current = null;
    };
  }, [open, image]);

  /** Displayed size of the image inside the stage (object-contain fit). */
  const getDisplaySize = useCallback(() => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img) return null;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const scale = Math.min(stage.clientWidth / natW, stage.clientHeight / natH);
    return { w: natW * scale, h: natH * scale };
  }, []);

  const pointToFraction = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      const stage = stageRef.current;
      const size = getDisplaySize();
      if (!stage || !size) return { x: 0, y: 0 };
      const box = stage.getBoundingClientRect();
      // image is centered in the stage
      const ox = box.left + (box.width - size.w) / 2;
      const oy = box.top + (box.height - size.h) / 2;
      return {
        x: clamp((e.clientX - ox) / size.w, 0, 1),
        y: clamp((e.clientY - oy) / size.h, 0, 1),
      };
    },
    [getDisplaySize]
  );

  const onPointerDown = (e: React.PointerEvent, mode: "move" | HandlePos | "new") => {
    if (loading || !imgRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: rect,
    };
    if (mode === "new") {
      const p = pointToFraction(e);
      setRect({ x: p.x, y: p.y, w: 0, h: 0 });
      dragRef.current.orig = { x: p.x, y: p.y, w: 0, h: 0 };
    }
  };

  useEffect(() => {
    if (!open) return;
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = pointToFraction(e);
      const dx = (e.clientX - drag.startX) / (getDisplaySize()?.w ?? 1);
      const dy = (e.clientY - drag.startY) / (getDisplaySize()?.h ?? 1);
      const o = drag.orig;

      if (drag.mode === "new") {
        const x = Math.min(drag.orig.x, p.x);
        const y = Math.min(drag.orig.y, p.y);
        setRect({
          x,
          y,
          w: Math.abs(p.x - drag.orig.x),
          h: Math.abs(p.y - drag.orig.y),
        });
        return;
      }

      if (drag.mode === "move") {
        setRect({
          ...o,
          x: clamp(o.x + dx, 0, 1 - o.w),
          y: clamp(o.y + dy, 0, 1 - o.h),
        });
        return;
      }

      // handle resize
      const { w, h } = o;
      let { x, y } = o;
      let x2 = x + w;
      let y2 = y + h;
      if (drag.mode.includes("w")) x = clamp(o.x + dx, 0, x2 - MIN_FRACTION);
      if (drag.mode.includes("e")) x2 = clamp(o.x + o.w + dx, x + MIN_FRACTION, 1);
      if (drag.mode.includes("n")) y = clamp(o.y + dy, 0, y2 - MIN_FRACTION);
      if (drag.mode.includes("s")) y2 = clamp(o.y + o.h + dy, y + MIN_FRACTION, 1);
      setRect({ x, y, w: x2 - x, h: y2 - y });
    };
    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      // discard degenerate rects from accidental clicks
      setRect((r) => (r.w < MIN_FRACTION || r.h < MIN_FRACTION ? drag.orig : r));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [open, pointToFraction, getDisplaySize]);

  const applyCrop = async () => {
    const img = imgRef.current;
    if (!img || !image) return;
    if (rect.w < MIN_FRACTION || rect.h < MIN_FRACTION) {
      setError("Drag a selection on the photo first.");
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const sx = Math.round(rect.x * img.naturalWidth);
      const sy = Math.round(rect.y * img.naturalHeight);
      const sw = Math.max(1, Math.round(rect.w * img.naturalWidth));
      const sh = Math.max(1, Math.round(rect.h * img.naturalHeight));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported in this browser.");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("Could not encode the cropped photo.");

      const base = image.file_name.replace(/\.[^.]+$/, "");
      onApply(blob, `${base}-cropped.jpg`);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed.");
    } finally {
      setApplying(false);
    }
  };

  if (!image) return null;

  const rectPct = {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  };

  const px = natSize
    ? {
        w: Math.round(rect.w * natSize.w),
        h: Math.round(rect.h * natSize.h),
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-4 w-4" />
            Crop photo
          </DialogTitle>
          <DialogDescription className="truncate">
            Drag a rectangle on the photo — or drag the edges and corners to
            resize. The original stays untouched; the crop is saved as a new
            photo.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={stageRef}
          className="relative flex h-[55vh] select-none items-center justify-center overflow-hidden rounded-lg bg-black/80 touch-none"
          onPointerDown={(e) => onPointerDown(e, "new")}
        >
          {image.original_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={image.original_url}
              alt={image.file_name}
              draggable={false}
              className="pointer-events-none max-h-full max-w-full object-contain"
            />
          )}

          {/* selection rectangle */}
          {!loading && !error && (
            <div
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={rectPct}
              onPointerDown={(e) => onPointerDown(e, "move")}
            >
              {/* rule-of-thirds guides */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/3 top-0 h-full w-px bg-white/40" />
                <div className="absolute left-2/3 top-0 h-full w-px bg-white/40" />
                <div className="absolute left-0 top-1/3 h-px w-full bg-white/40" />
                <div className="absolute left-0 top-2/3 h-px w-full bg-white/40" />
              </div>
              {HANDLES.map((pos) => (
                <div
                  key={pos}
                  onPointerDown={(e) => onPointerDown(e, pos)}
                  className={
                    "absolute h-3 w-3 rounded-sm border border-black/60 bg-white " +
                    ({
                      nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
                      n: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
                      ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
                      e: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
                      se: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
                      s: "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize",
                      sw: "-left-1.5 -bottom-1.5 cursor-nesw-resize",
                      w: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
                    }[pos])
                  }
                />
              ))}
              {px && (
                <div className="pointer-events-none absolute -top-7 left-0 rounded bg-black/75 px-1.5 py-0.5 text-[11px] text-white">
                  {px.w} × {px.h} px
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading photo…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 text-center text-sm text-white">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })}
            disabled={loading || applying}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={applyCrop}
              disabled={loading || applying || !px || px.w < 2 || px.h < 2}
            >
              {applying && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply crop
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
