"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Pencil,
  Copy,
  Trash2,
  FolderInput,
  Info,
  Eye,
  Check,
  CheckSquare,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useUIStore } from "@/lib/store";
import type { Image, ViewMode } from "@/lib/types";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import dynamic from "next/dynamic";

// The viewer (and framer-motion) loads only when a photo is opened.
const ImageViewer = dynamic(
  () => import("@/components/images/image-viewer").then((m) => m.ImageViewer),
  { ssr: false }
);

// ---------- Justified layout ----------
// Flickr/Google-Photos style rows: each photo keeps its own aspect ratio and
// every row is scaled so it fills the container width — no cropping.
const FALLBACK_RATIO = 4 / 3;

function ratioOf(img: Image) {
  const r =
    img.width && img.height && img.width > 0 && img.height > 0
      ? img.width / img.height
      : FALLBACK_RATIO;
  // Extreme panoramas / strips would otherwise own a whole row.
  return Math.min(Math.max(r, 0.45), 3.2);
}

interface Placed {
  id: string;
  w: number;
  h: number;
}

function layoutJustified(
  images: Image[],
  width: number,
  targetH: number,
  gap: number
): Placed[][] {
  const rows: Placed[][] = [];
  let row: Image[] = [];
  let sum = 0;

  const flush = (last: boolean) => {
    if (row.length === 0) return;
    const avail = width - gap * (row.length - 1);
    let h = avail / sum;
    // A short final row is left-aligned at the target height instead of
    // being blown up to fill the width.
    const stretch = !(last && h > targetH * 1.25);
    if (!stretch) h = targetH;
    const placed = row.map((img) => ({
      id: img.id,
      w: Math.floor(ratioOf(img) * h),
      h: Math.round(h),
    }));
    if (stretch) {
      // Hand rounding leftovers to the last tile so the row is pixel-exact.
      const used = placed.reduce((a, p) => a + p.w, 0);
      placed[placed.length - 1].w += avail - used;
    }
    rows.push(placed);
    row = [];
    sum = 0;
  };

  for (const img of images) {
    const r = ratioOf(img);
    const next = sum + r;
    const availNext = width - gap * row.length;
    if (row.length > 0 && next * targetH >= availNext) {
      // The row overflows with this photo. Keep whichever option lands the
      // row height closest to the target: a slightly tall row without it,
      // or a slightly short row with it.
      const hWith = availNext / next;
      const hWithout = (width - gap * (row.length - 1)) / sum;
      const closerWithout =
        Math.abs(Math.log(hWithout / targetH)) < Math.abs(Math.log(hWith / targetH));
      if (closerWithout) {
        flush(false);
        row.push(img);
        sum = r;
        continue;
      }
      row.push(img);
      sum = next;
      flush(false);
      continue;
    }
    row.push(img);
    sum = next;
  }
  flush(true);
  return rows;
}

interface Props {
  images: Image[];
  onReorder: (orderedIds: string[]) => void;
  onRename: (img: Image) => void;
  onTrash: (ids: string[]) => void;
  onDuplicate: (ids: string[]) => void;
  onMove: (ids: string[]) => void;
  /** Open the photo-properties dialog. */
  onProperties: (img: Image) => void;
  readOnly?: boolean;
  /** False while a non-custom sort is active — drag would fight the sort. */
  dragEnabled?: boolean;
}

export function ImageGrid({
  images,
  onReorder,
  onRename,
  onTrash,
  onDuplicate,
  onMove,
  onProperties,
  readOnly = false,
  dragEnabled = true,
}: Props) {
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const borderSettings = useUIStore((s) => s.borderSettings);
  const selectionMode = useUIStore((s) => s.selectionMode);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const toggleSelected = useUIStore((s) => s.toggleSelected);
  const selectMany = useUIStore((s) => s.selectMany);
  const clearSelection = useUIStore((s) => s.clearSelection);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastClicked = useRef<string | null>(null);
  const [prevMode, setPrevMode] = useState<ViewMode>("large");

  // "Slideshow" view mode opens the viewer (playing) without an effect:
  // the open index is derived from the mode until the user navigates.
  if (viewMode !== "play" && viewMode !== prevMode) setPrevMode(viewMode);
  const slideshow = viewMode === "play" && images.length > 0;
  const openIndex = viewerIndex ?? (slideshow ? 0 : null);
  const playing = autoplay || (slideshow && viewerIndex === null);

  // Esc clears selection when the viewer is not open.
  useEffect(() => {
    if (!selectionMode || openIndex !== null) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[role=dialog]") || t?.tagName === "INPUT") return;
      if (e.key === "Escape") clearSelection();
      if ((e.key === "a" || e.key === "A") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        selectMany(images.map((i) => i.id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionMode, openIndex, clearSelection, selectMany, images]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeImage = images.find((i) => i.id === activeId) ?? null;
  const canDrag = dragEnabled && !readOnly && !selectionMode;

  // Justified rows need the container width; measured via ResizeObserver so
  // the layout re-flows with the sidebar, drawer and window.
  const justified = viewMode === "large" || viewMode === "play";
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  useEffect(() => {
    if (!gridEl) return;
    const ro = new ResizeObserver(([entry]) => {
      setGridWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(gridEl);
    return () => ro.disconnect();
  }, [gridEl]);

  const gap = borderSettings.enabled ? Math.max(4, borderSettings.width) : 12;
  const rows = useMemo(() => {
    if (!justified || gridWidth <= 0) return null;
    const targetH = Math.min(280, Math.max(150, gridWidth / 4.5));
    return layoutJustified(images, gridWidth, targetH, gap);
  }, [justified, gridWidth, images, gap]);
  const indexOf = useMemo(
    () => new Map(images.map((img, i) => [img.id, i] as const)),
    [images]
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = images.findIndex((i) => i.id === active.id);
    const newIdx = images.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(images, oldIdx, newIdx).map((i) => i.id));
  };

  const closeViewer = () => {
    setViewerIndex(null);
    setAutoplay(false);
    if (viewMode === "play") setViewMode(prevMode);
  };

  /** Click: open; in selection mode (or with Ctrl/Cmd/Shift) toggle/range-select. */
  const handleTileClick = (img: Image, e: React.MouseEvent) => {
    const modifier = e.metaKey || e.ctrlKey;
    if (!readOnly && (selectionMode || modifier || e.shiftKey)) {
      if (e.shiftKey && lastClicked.current) {
        const a = images.findIndex((i) => i.id === lastClicked.current);
        const b = images.findIndex((i) => i.id === img.id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          const range = images.slice(lo, hi + 1).map((i) => i.id);
          selectMany(Array.from(new Set([...Array.from(selectedIds), ...range])));
          return;
        }
      }
      if (!selectionMode) useUIStore.getState().toggleSelectionMode();
      toggleSelected(img.id);
      lastClicked.current = img.id;
      return;
    }
    lastClicked.current = img.id;
    setAutoplay(false);
    setViewerIndex(images.findIndex((i) => i.id === img.id));
  };

  if (images.length === 0) return null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={images.map((i) => i.id)}
          strategy={viewMode === "list" ? verticalListSortingStrategy : rectSortingStrategy}
        >
          {(() => {
            const tile = (img: Image, size?: Placed) => {
              const idx = indexOf.get(img.id) ?? 0;
              return (
                <SortableTile
                  key={img.id}
                  image={img}
                  index={idx}
                  size={size}
                  viewMode={viewMode}
                  readOnly={readOnly}
                  dragEnabled={canDrag}
                  onClick={(e) => handleTileClick(img, e)}
                  onOpen={() => {
                    setAutoplay(false);
                    setViewerIndex(idx);
                  }}
                  onSelectToggle={() => {
                    if (!selectionMode) useUIStore.getState().toggleSelectionMode();
                    toggleSelected(img.id);
                    lastClicked.current = img.id;
                  }}
                  onRename={() => onRename(img)}
                  onTrash={() => onTrash([img.id])}
                  onDuplicate={() => onDuplicate([img.id])}
                  onMove={() => onMove([img.id])}
                  onProperties={() => onProperties(img)}
                  onTrashSelected={() => onTrash(Array.from(selectedIds))}
                />
              );
            };

            if (justified) {
              const byId = new Map(images.map((i) => [i.id, i] as const));
              return (
                <div ref={setGridEl} className="flex flex-col" style={{ gap }}>
                  {rows
                    ? rows.map((row, r) => (
                        <div key={r} className="flex" style={{ gap }}>
                          {row.map((p) => {
                            const img = byId.get(p.id);
                            return img ? tile(img, p) : null;
                          })}
                        </div>
                      ))
                    : // One frame before the first measurement: keep the old
                      // responsive grid so nothing jumps.
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {images.map((img) => tile(img))}
                      </div>}
                </div>
              );
            }

            return (
              <div
                className={cn(
                  viewMode === "small" &&
                    "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-10",
                  viewMode === "list" && "flex flex-col gap-1.5"
                )}
                style={
                  borderSettings.enabled && viewMode === "small" ? { gap } : undefined
                }
              >
                {images.map((img) => tile(img))}
              </div>
            );
          })()}
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeImage ? (
            <div className="drag-overlay-tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage.thumbnail_url ?? activeImage.original_url}
                alt=""
                className="h-32 w-44 object-cover"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openIndex !== null && (
        <ImageViewer
          images={images}
          index={Math.min(openIndex, images.length - 1)}
          onClose={closeViewer}
          onIndexChange={(i) => {
            if (slideshow) setAutoplay(true);
            setViewerIndex(i);
          }}
          onProperties={onProperties}
          autoplay={playing}
          readOnly={readOnly}
        />
      )}
    </>
  );
}

// ---------- Tile ----------
function SortableTile({
  image,
  index,
  size,
  viewMode,
  readOnly,
  dragEnabled,
  onClick,
  onOpen,
  onSelectToggle,
  onRename,
  onTrash,
  onDuplicate,
  onMove,
  onProperties,
  onTrashSelected,
}: {
  image: Image;
  index: number;
  /** Pixel box from the justified layout; absent in small/list modes. */
  size?: Placed;
  viewMode: ViewMode;
  readOnly: boolean;
  dragEnabled: boolean;
  onClick: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onSelectToggle: () => void;
  onRename: () => void;
  onTrash: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onProperties: () => void;
  onTrashSelected: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id, disabled: !dragEnabled });

  const borderSettings = useUIStore((s) => s.borderSettings);
  const selectionMode = useUIStore((s) => s.selectionMode);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const selected = selectedIds.has(image.id);
  const src = image.thumbnail_url ?? image.original_url;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    ...(size ? { width: size.w, height: size.h, flex: "0 0 auto" } : {}),
  };

  const borderStyle: React.CSSProperties = borderSettings.enabled
    ? borderSettings.inside
      ? { padding: borderSettings.width, background: borderSettings.color }
      : { border: `${borderSettings.width}px solid ${borderSettings.color}` }
    : {};

  const dragHandle = dragEnabled ? (
    <span
      {...attributes}
      {...listeners}
      className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 cursor-grab items-center justify-center rounded-md border border-white/15 bg-black/55 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/75 focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
      onClick={(e) => e.stopPropagation()}
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </span>
  ) : null;

  const checkbox = !readOnly ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelectToggle();
      }}
      className={cn(
        "absolute left-1.5 top-1.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border transition-all",
        selected
          ? "border-transparent text-gold-fg opacity-100 [background:var(--gold-grad)]"
          : "border-white/40 bg-black/45 text-transparent backdrop-blur hover:border-white/80",
        selectionMode || selected
          ? "opacity-100"
          : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
      )}
      aria-label={selected ? "Deselect photo" : "Select photo"}
      aria-pressed={selected}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  ) : null;

  const menuContent = readOnly ? (
    <ContextMenuContent>
      <ContextMenuItem onClick={onOpen}>
        <Eye />
        View
      </ContextMenuItem>
      <ContextMenuItem onClick={onProperties}>
        <Info />
        Properties
      </ContextMenuItem>
    </ContextMenuContent>
  ) : (
    <ContextMenuContent>
      <ContextMenuItem onClick={onOpen}>
        <Eye />
        View
      </ContextMenuItem>
      <ContextMenuItem onClick={onSelectToggle}>
        <CheckSquare />
        {selected ? "Deselect" : "Select"}
      </ContextMenuItem>
      <ContextMenuItem onClick={onProperties}>
        <Info />
        Properties
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onRename}>
        <Pencil />
        Rename / caption
      </ContextMenuItem>
      <ContextMenuItem onClick={onDuplicate}>
        <Copy />
        Duplicate
      </ContextMenuItem>
      <ContextMenuItem onClick={onMove}>
        <FolderInput />
        Move to album…
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onTrash} className="text-danger focus:text-danger">
        <Trash2 className="!text-danger" />
        Move to trash
      </ContextMenuItem>
      {selectedIds.size > 1 && selected && (
        <ContextMenuItem onClick={onTrashSelected} className="text-danger focus:text-danger">
          <Trash2 className="!text-danger" />
          Trash all {selectedIds.size} selected
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );

  if (viewMode === "list") {
    return (
      <div ref={setNodeRef} style={style} className="group relative">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] p-2 text-left transition-colors hover:bg-[var(--glass-hover)]",
                selected && "tile-selected bg-[var(--gold-soft)]"
              )}
              onClick={onClick}
              onKeyDown={(e) => e.key === "Enter" && onOpen()}
            >
              <span className="w-6 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                {checkbox}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{image.file_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {image.caption ? `${image.caption} · ` : ""}
                  {formatDate(image.created_at)}
                  {image.width && image.height ? ` · ${image.width}×${image.height}` : ""}
                  {image.file_size ? ` · ${formatBytes(image.file_size)}` : ""}
                </p>
              </div>
              {dragEnabled && (
                <span
                  {...attributes}
                  {...listeners}
                  className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 active:cursor-grabbing"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
              )}
            </div>
          </ContextMenuTrigger>
          {menuContent}
        </ContextMenu>
      </div>
    );
  }

  const showCaption = viewMode !== "small" && (image.caption || image.file_name);

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "relative cursor-pointer overflow-hidden rounded-lg bg-black/40 transition-[box-shadow,transform] duration-200",
              size ? "h-full w-full" : viewMode === "small" ? "aspect-square" : "aspect-[4/3]",
              selected && "tile-selected",
              !selected && "hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)]"
            )}
            style={borderStyle}
            onClick={onClick}
            onKeyDown={(e) => e.key === "Enter" && onOpen()}
            aria-label={image.caption || image.file_name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={image.caption || image.file_name}
              className={cn(
                "h-full w-full object-cover transition-transform duration-500",
                !selectionMode && "group-hover:scale-[1.03]",
                selected && "brightness-90"
              )}
              loading="lazy"
              draggable={false}
            />
            {showCaption && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-xs text-white">{image.caption || image.file_name}</p>
              </div>
            )}
            {checkbox}
            {dragHandle}
          </div>
        </ContextMenuTrigger>
        {menuContent}
      </ContextMenu>
    </div>
  );
}
