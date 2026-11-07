"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Download,
  Info,
  Timer,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  /** Start playing immediately (used by the "Slideshow" view mode). */
  autoplay?: boolean;
  readOnly?: boolean;
}

export function ImageViewer({
  images,
  index,
  onClose,
  onIndexChange,
  onProperties,
  autoplay = false,
}: Props) {
  const [playing, setPlayingRaw] = useState(autoplay);
  const setPlaying = (v: boolean | ((p: boolean) => boolean)) => {
    setPlayingRaw(v);
    setIdle(false);
  };
  const [idle, setIdle] = useState(false);
  const chrome = !playing || !idle;
  const [fullscreen, setFullscreen] = useState(false);
  const { slideshowInterval, setSlideshowInterval } = useUIStore();
  const current = images[index];
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => {
      onIndexChange((index + dir + images.length) % images.length);
    },
    [index, images.length, onIndexChange]
  );

  // Keyboard + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Home") onIndexChange(0);
      else if (e.key === "End") onIndexChange(images.length - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void rootRef.current?.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose, onIndexChange, images.length]);

  // Auto-advance while playing.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => go(1), slideshowInterval * 1000);
    return () => clearTimeout(t);
  }, [playing, go, slideshowInterval]);

  // Preload neighbours so arrows feel instant.
  useEffect(() => {
    if (images.length < 2) return;
    for (const d of [1, -1]) {
      const img = new window.Image();
      img.src = images[(index + d + images.length) % images.length].original_url;
    }
  }, [index, images]);

  // Keep the active thumbnail in view.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-idx="${index}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  // Auto-hide chrome while playing (mouse idle for ~2s).
  useEffect(() => {
    if (!playing) return;
    const arm = () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setIdle(true), 2200);
    };
    const onMove = () => {
      setIdle(false);
      arm();
    };
    arm();
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setIdle(false);
    };
  }, [playing]);

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  if (!current) return null;

  const iconBtn = "text-white/85 hover:bg-white/10 hover:text-white";
  const chromeCls = cn(
    "transition-opacity duration-300",
    !chrome && "pointer-events-none opacity-0"
  );

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("fixed inset-0 z-[100] flex flex-col bg-black", !chrome && "cursor-none")}
      role="dialog"
      aria-label="Photo viewer"
    >
      {/* Top bar */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 text-white sm:px-4",
          chromeCls
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/90">
            {index + 1} / {images.length}
          </span>
          <span className="truncate text-sm text-white/80">
            {current.caption || current.file_name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Seconds per photo</DropdownMenuLabel>
              {SLIDESHOW_INTERVALS.map((sec) => (
                <DropdownMenuItem key={sec} onClick={() => setSlideshowInterval(sec)}>
                  <Check
                    className={cn("!text-gold opacity-0", slideshowInterval === sec && "opacity-100")}
                  />
                  {sec}s
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={iconBtn}
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              >
                {playing ? <Pause /> : <Play />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {playing ? "Pause" : "Play"} <kbd className="ml-1 opacity-70">Space</kbd>
            </TooltipContent>
          </Tooltip>

          {onProperties && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconBtn}
                  onClick={() => onProperties(current)}
                  aria-label="Photo properties"
                >
                  <Info />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Properties</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={iconBtn} asChild>
                <a
                  href={current.original_url}
                  download={current.file_name}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open original"
                >
                  <Download />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Open original</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(iconBtn, "hidden sm:inline-flex")}
                onClick={toggleFullscreen}
                aria-label={fullscreen ? "Exit full screen" : "Full screen"}
              >
                {fullscreen ? <Minimize2 /> : <Maximize2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Full screen <kbd className="ml-1 opacity-70">F</kbd>
            </TooltipContent>
          </Tooltip>

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
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-1 sm:px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <AnimatePresence mode="popLayout">
          <motion.img
            key={current.id}
            src={current.original_url}
            alt={current.caption || current.file_name}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            draggable={false}
            className="max-h-full max-w-full select-none rounded-md object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
          />
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className={cn(
                "absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:bg-black/75 sm:left-4",
                chromeCls
              )}
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => go(1)}
              className={cn(
                "absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:bg-black/75 sm:right-4",
                chromeCls
              )}
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Countdown bar */}
        {playing && (
          <div
            key={`${current.id}-${slideshowInterval}`}
            className="absolute inset-x-6 bottom-2 h-[3px] overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full rounded-full [background:var(--gold-grad)]"
              style={{ animation: `slideshow-progress ${slideshowInterval}s linear forwards` }}
            />
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div
        ref={stripRef}
        className={cn(
          "flex h-[84px] shrink-0 items-center gap-1.5 overflow-x-auto bg-gradient-to-t from-black/80 to-transparent px-4 py-2.5 scrollbar-thin",
          chromeCls
        )}
      >
        {images.map((img, i) => (
          <button
            key={img.id}
            data-idx={i}
            onClick={() => onIndexChange(i)}
            className={cn(
              "h-14 w-[76px] shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-all",
              i === index
                ? "border-gold opacity-100"
                : "border-transparent opacity-45 hover:opacity-85"
            )}
            aria-label={`Photo ${i + 1}`}
            aria-current={i === index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.thumbnail_url ?? img.original_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
