"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Image } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  images: Image[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

export function ImageViewer({ images, index, onClose, onIndexChange }: Props) {
  const [playing, setPlaying] = useState(false);
  const current = images[index];

  const go = useCallback(
    (dir: 1 | -1) => {
      onIndexChange((index + dir + images.length) % images.length);
    },
    [index, images.length, onIndexChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => go(1), 3000);
    return () => clearInterval(t);
  }, [playing, go]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
    >
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4 text-white">
        <span className="text-sm text-white/70">
          {index + 1} / {images.length}
          {current.caption ? ` — ${current.caption}` : ""}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play slideshow"}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            asChild
          >
            <a href={current.original_url} download target="_blank" rel="noreferrer">
              <Download />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>
      </div>

      {/* Image area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={current.id}
            src={current.original_url}
            alt={current.caption || current.file_name}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </AnimatePresence>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white backdrop-blur transition hover:bg-black/60"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white backdrop-blur transition hover:bg-black/60"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="flex h-20 shrink-0 items-center gap-2 overflow-x-auto px-4 py-2 scrollbar-thin">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => onIndexChange(i)}
            className={cn(
              "h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all",
              i === index
                ? "border-primary opacity-100"
                : "border-transparent opacity-50 hover:opacity-80"
            )}
          >
            <img
              src={img.thumbnail_url ?? img.original_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
