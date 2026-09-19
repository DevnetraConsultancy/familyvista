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
  Info,
  Crop,
  Timer,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore, SLIDESHOW_INTERVALS } from "@/lib/store";
import type { Image } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  images: Image[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  /** Opens the photo-properties dialog for the current photo. */
  onProperties?: (img: Image) => void;
  /** Opens the crop dialog for the current photo (owner only). */
  onCrop?: (img: Image) => void;
  readOnly?: boolean;
}

export function ImageViewer({
  images,
  index,
  onClose,
  onIndexChange,
  onProperties,
  onCrop,
  readOnly = false,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const { slideshowInterval, setSlideshowInterval } = useUIStore();
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

  // Auto-advance every slideshowInterval seconds while playing.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => go(1), slideshowInterval * 1000);
    return () => clearTimeout(t);
  }, [playing, go, slideshowInterval]);

  if (!current) return null;

  const iconBtn =
    "text-white hover:bg-white/10 aria-disabled:opacity-40 aria-disabled:pointer-events-none";

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
          {/* Slideshow timer: seconds per photo */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(iconBtn, "gap-1.5 px-2")}
                aria-label="Slideshow timer"
              >
                <Timer className="h-4 w-4" />
                {slideshowInterval}s
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel>Seconds per photo</DropdownMenuLabel>
              {SLIDESHOW_INTERVALS.map((sec) => (
                <DropdownMenuItem
                  key={sec}
                  onClick={() => setSlideshowInterval(sec)}
                >
                  <Check
                    className={cn(
                      "opacity-0",
                      slideshowInterval === sec && "opacity-100"
                    )}
                  />
                  {sec}s
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className={iconBtn}
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={iconBtn}
            onClick={() => onProperties?.(current)}
            aria-disabled={!onProperties}
            aria-label="Photo properties"
          >
            <Info />
          </Button>
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className={iconBtn}
              onClick={() => onCrop?.(current)}
              aria-disabled={!onCrop}
              aria-label="Crop photo"
            >
              <Crop />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={iconBtn}
            asChild
          >
            <a href={current.original_url} download target="_blank" rel="noreferrer">
              <Download />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={iconBtn}
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

        {/* Slideshow countdown bar */}
        {playing && (
          <div
            key={`${current.id}-${slideshowInterval}`}
            className="absolute inset-x-6 bottom-3 h-1 overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{
                animation: `slideshow-progress ${slideshowInterval}s linear forwards`,
              }}
            />
          </div>
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
