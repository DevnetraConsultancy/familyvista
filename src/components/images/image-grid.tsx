"use client";

import { useEffect, useMemo, useState } from "react";
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
import { GripVertical, Clock3, CalendarDays, List } from "lucide-react";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useUIStore } from "@/lib/store";
import type { Image } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { ImageViewer } from "@/components/images/image-viewer";

interface Props {
  images: Image[];
  onReorder: (orderedIds: string[]) => void;
  onOpenMenu: (image: Image, anchor: HTMLElement) => void;
  onRename: (img: Image) => void;
  onTrash: (ids: string[]) => void;
}

export function ImageGrid({
  images,
  onReorder,
  onOpenMenu,
  onRename,
  onTrash,
}: Props) {
  const { viewMode, borderSettings } = useUIStore();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { selectionMode, selectedIds, toggleSelected } = useUIStore();
  const setViewMode = useUIStore((s) => s.setViewMode);

  // "Play" view mode opens the slideshow immediately
  useEffect(() => {
    if (viewMode === "play" && images.length > 0 && viewerIndex === null) {
      setViewerIndex(0);
    }
  }, [viewMode, images.length, viewerIndex]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeImage = images.find((i) => i.id === activeId) ?? null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = images.findIndex((i) => i.id === active.id);
    const newIdx = images.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(images, oldIdx, newIdx);
    onReorder(reordered.map((i) => i.id));
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
          <div
            className={cn(
              viewMode === "small" && "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2",
              viewMode === "large" && "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4",
              viewMode === "list" && "flex flex-col gap-1"
            )}
            style={
              borderSettings.enabled
                ? { gap: `${Math.max(2, borderSettings.width)}px` }
                : undefined
            }
          >
            {images.map((img) => (
              <SortableTile
                key={img.id}
                image={img}
                viewMode={viewMode}
                onOpen={() => {
                  if (selectionMode) {
                    toggleSelected(img.id);
                  } else {
                    setViewerIndex(images.findIndex((i) => i.id === img.id));
                  }
                }}
                onOpenMenu={onOpenMenu}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeImage ? (
            <div className="drag-overlay-tile">
              <img
                src={activeImage.thumbnail_url ?? activeImage.original_url}
                alt=""
                className="h-32 w-44 object-cover"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {viewerIndex !== null && (
        <ImageViewer
          images={images}
          index={viewerIndex}
          onClose={() => {
            setViewMode("large");
            setViewerIndex(null);
          }}
          onIndexChange={setViewerIndex}
        />
      )}
    </>
  );
}

// ---------- Tile ----------
function SortableTile({
  image,
  viewMode,
  onOpen,
  onOpenMenu,
}: {
  image: Image;
  viewMode: string;
  onOpen: () => void;
  onOpenMenu: (image: Image, anchor: HTMLElement) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const { borderSettings, selectionMode, selectedIds } = useUIStore();
  const selected = selectedIds.has(image.id);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const borderStyle: React.CSSProperties = borderSettings.enabled
    ? borderSettings.inside
      ? { padding: borderSettings.width, background: borderSettings.color }
      : { border: `${borderSettings.width}px solid ${borderSettings.color}` }
    : {};

  const dragHandle = (
    <span
      {...attributes}
      {...listeners}
      className="absolute right-1.5 top-1.5 z-10 cursor-grab rounded-md bg-black/45 p-1 text-white opacity-0 transition-opacity backdrop-blur hover:bg-black/65 group-hover:opacity-100 active:cursor-grabbing"
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </span>
  );

  if (viewMode === "list") {
    return (
      <div ref={setNodeRef} style={style} className="group relative">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-accent/50",
                selected && "tile-selected"
              )}
              onClick={onOpen}
              onContextMenu={(e) => onOpenMenu(image, e.currentTarget)}
            >
              <img
                src={image.thumbnail_url ?? image.original_url}
                alt={image.file_name}
                className="h-12 w-16 rounded-md object-cover"
                style={borderStyle}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{image.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(image.created_at)}
                  {image.caption ? ` — ${image.caption}` : ""}
                </p>
              </div>
              {dragHandle}
            </div>
          </ContextMenuTrigger>
        </ContextMenu>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "relative cursor-pointer overflow-hidden rounded-lg bg-muted",
              viewMode === "small" ? "aspect-square" : "aspect-[4/3]",
              selected && "tile-selected"
            )}
            style={borderStyle}
            onClick={onOpen}
            onDoubleClick={() => {
              /* reserved for future */
            }}
          >
            <img
              src={image.thumbnail_url ?? image.original_url}
              alt={image.file_name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              draggable={false}
            />
            {viewMode === "large" && (image.caption || image.file_name) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                <p className="truncate text-xs text-white">
                  {image.caption || image.file_name}
                </p>
              </div>
            )}
            {dragHandle}
          </div>
        </ContextMenuTrigger>
      </ContextMenu>
    </div>
  );
}
