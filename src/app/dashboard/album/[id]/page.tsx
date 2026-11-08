"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Grid2x2,
  Grid3x3,
  List,
  Play,
  Frame,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  FolderInput,
  CheckSquare,
  X,
  Share2,
  Images,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ,
  Plus,
  Folder,
  Eye,
  Check,
  Loader2,
} from "lucide-react";
import { useAlbums, collectDescendantIds } from "@/lib/hooks/use-albums";
import { useImages } from "@/lib/hooks/use-images";
import { useUIStore, BORDER_COLORS } from "@/lib/store";
import { useAuth } from "@/components/auth-provider";
import { ShareDialog } from "@/components/share-dialog";
import { UploadZone } from "@/components/images/upload-zone";
import { ImageGrid } from "@/components/images/image-grid";
import { PhotoPropertiesDialog } from "@/components/images/photo-properties-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { cn, stripExtension, getFileExtension } from "@/lib/utils";
import type { Album, Image, SortKey, ViewMode } from "@/lib/types";
import { toast } from "sonner";

const VIEW_MODES: { mode: ViewMode; icon: typeof Grid2x2; label: string }[] = [
  { mode: "small", icon: Grid3x3, label: "Small tiles" },
  { mode: "large", icon: Grid2x2, label: "Large tiles" },
  { mode: "list", icon: List, label: "List" },
  { mode: "play", icon: Play, label: "Slideshow" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "custom", label: "Custom (drag) order" },
  { key: "name", label: "Name" },
  { key: "date", label: "Date added" },
  { key: "size", label: "File size" },
  { key: "resolution", label: "Resolution" },
];

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const {
    albums,
    sharedAlbums,
    loading: albumsLoading,
    createAlbum,
    renameAlbum,
    duplicateAlbum,
    trashAlbum,
  } = useAlbums();
  const {
    images,
    loading,
    reorderImages,
    renameImage,
    duplicateImages,
    moveImages,
    trashImages,
  } = useImages(id);

  const {
    viewMode,
    setViewMode,
    borderSettings,
    setBorderSettings,
    selectionMode,
    toggleSelectionMode,
    selectedIds,
    selectMany,
    clearSelection,
    sortBy,
    sortAsc,
    setSortBy,
    setSortAsc,
  } = useUIStore();

  const album: Album | undefined =
    albums.find((a) => a.id === id) ?? sharedAlbums.find((a) => a.id === id);
  const isOwner = !!album && album.user_id === user?.id;
  const readOnly = !!album && !isOwner;
  const children = useMemo(() => albums.filter((a) => a.parent_id === id), [albums, id]);

  // Leaving the album drops any selection.
  useEffect(() => () => clearSelection(), [id, clearSelection]);

  const [shareOpen, setShareOpen] = useState(false);
  const [renameAlbumOpen, setRenameAlbumOpen] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [subName, setSubName] = useState("");
  const [trashAlbumOpen, setTrashAlbumOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<Image | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [captionValue, setCaptionValue] = useState("");
  const [trashIds, setTrashIds] = useState<string[] | null>(null);
  const [moveIds, setMoveIds] = useState<string[] | null>(null);
  const [moving, setMoving] = useState(false);
  const [propsImage, setPropsImage] = useState<Image | null>(null);
  const [propsOpen, setPropsOpen] = useState(false);

  const sortedImages = useMemo(() => {
    const list = [...images];
    if (sortBy === "custom") return list.sort((a, b) => a.sort_order - b.sort_order);
    const dir = sortAsc ? 1 : -1;
    switch (sortBy) {
      case "name":
        return list.sort(
          (a, b) =>
            dir *
            a.file_name.localeCompare(b.file_name, undefined, { numeric: true, sensitivity: "base" })
        );
      case "date":
        return list.sort((a, b) => dir * (Date.parse(a.created_at) - Date.parse(b.created_at)));
      case "size":
        return list.sort((a, b) => dir * ((a.file_size ?? 0) - (b.file_size ?? 0)));
      case "resolution":
        return list.sort(
          (a, b) =>
            dir * ((a.width ?? 0) * (a.height ?? 0) - (b.width ?? 0) * (b.height ?? 0))
        );
      default:
        return list;
    }
  }, [images, sortBy, sortAsc]);

  // ---- photo actions ----
  const openEdit = (img: Image) => {
    setEditTarget(img);
    setRenameValue(stripExtension(img.file_name));
    setCaptionValue(img.caption ?? "");
  };

  const saveEdit = async () => {
    if (!editTarget || !renameValue.trim()) return;
    const ext = getFileExtension(editTarget.file_name);
    const ok = await renameImage(editTarget.id, `${renameValue.trim()}${ext}`, captionValue.trim());
    if (ok) {
      toast.success("Photo updated");
      setEditTarget(null);
    } else toast.error("Could not update photo");
  };

  const confirmTrash = async () => {
    if (!trashIds) return;
    const ids = trashIds;
    setTrashIds(null);
    const ok = await trashImages(ids);
    if (ok) {
      toast.success(`${ids.length} photo${ids.length === 1 ? "" : "s"} moved to trash`, {
        action: { label: "Open trash", onClick: () => router.push("/dashboard/trash") },
      });
      clearSelection();
    } else toast.error("Could not move to trash");
  };

  const handleDuplicate = async (ids: string[]) => {
    const ok = await duplicateImages(ids);
    if (ok) toast.success(`${ids.length} photo${ids.length === 1 ? "" : "s"} duplicated`);
    else toast.error("Could not duplicate");
    clearSelection();
  };

  const handleMove = async (target: Album) => {
    if (!moveIds) return;
    setMoving(true);
    const ok = await moveImages(moveIds, target.id);
    setMoving(false);
    if (ok) {
      toast.success(`Moved to “${target.name}”`, {
        action: { label: "Open", onClick: () => router.push(`/dashboard/album/${target.id}`) },
      });
      setMoveIds(null);
      clearSelection();
    } else toast.error("Move failed");
  };

  const openProperties = (img: Image) => {
    setPropsImage(img);
    setPropsOpen(true);
  };

  // ---- album actions ----
  const saveAlbumName = async () => {
    if (!album || !albumName.trim()) return;
    const ok = await renameAlbum(album.id, albumName.trim());
    if (ok) {
      toast.success("Album renamed");
      setRenameAlbumOpen(false);
    } else toast.error("Could not rename album");
  };

  const createSub = async () => {
    if (!album || !subName.trim()) return;
    const created = await createAlbum(subName.trim(), album.id);
    if (created) {
      toast.success(`Sub-album “${created.name}” created`);
      setSubOpen(false);
      setSubName("");
      router.push(`/dashboard/album/${created.id}`);
    }
  };

  if (!album && !albumsLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <EmptyState
          icon={Images}
          title="Album not found"
          description="It may have been moved to trash or belongs to another account."
          action={
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to all albums
            </Button>
          }
          className="w-full max-w-md border-0 bg-transparent"
        />
      </div>
    );
  }

  const selectedCount = selectedIds.size;
  const excludedForMove = new Set(collectDescendantIds(albums, id));

  return (
    <div className="flex h-full flex-col">
      {/* Album header + toolbar */}
      <div className="shrink-0 border-b border-[var(--line)] bg-background/80 px-4 pb-3 pt-4 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="font-display truncate text-[1.6rem] font-semibold leading-tight sm:text-[1.9rem]">
                {album?.name ?? <span className="opacity-40">…</span>}
              </h1>
              {readOnly && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Eye className="h-3 w-3" /> View only
                </span>
              )}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Album actions" className="shrink-0">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem onClick={() => setShareOpen(true)}>
                      <Share2 />
                      Share album
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSubOpen(true)}>
                      <Plus />
                      Add sub-album
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setAlbumName(album?.name ?? "");
                        setRenameAlbumOpen(true);
                      }}
                    >
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!album) return;
                        const t = toast.loading("Duplicating album…");
                        const ok = await duplicateAlbum(album);
                        toast.dismiss(t);
                        if (ok) toast.success("Album duplicated");
                        else toast.error("Could not duplicate album");
                      }}
                    >
                      <Copy />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setTrashAlbumOpen(true)}
                      className="text-danger focus:text-danger"
                    >
                      <Trash2 className="!text-danger" />
                      Move album to trash
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {loading ? (
                "Loading photos…"
              ) : (
                <>
                  {images.length} photo{images.length === 1 ? "" : "s"}
                  {children.length > 0 &&
                    ` · ${children.length} sub-album${children.length === 1 ? "" : "s"}`}
                  {album?.description ? ` · ${album.description}` : ""}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            )}

            {/* View modes */}
            <div
              className="flex rounded-lg border border-[var(--glass-border)] bg-[var(--glass)] p-0.5"
              role="radiogroup"
              aria-label="View"
            >
              {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
                <Tooltip key={mode}>
                  <TooltipTrigger asChild>
                    <button
                      role="radio"
                      aria-checked={viewMode === mode}
                      aria-label={label}
                      onClick={() => setViewMode(mode)}
                      disabled={mode === "play" && images.length === 0}
                      className={cn(
                        "flex h-7 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
                        viewMode === mode && "text-gold-fg [background:var(--gold-grad)] hover:text-gold-fg"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {sortBy === "custom" ? (
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  ) : sortAsc ? (
                    <ArrowUpAZ className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {SORT_OPTIONS.find((o) => o.key === sortBy)?.label.replace(" (drag) order", "") ??
                      "Sort"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                {SORT_OPTIONS.map(({ key, label }) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => {
                      if (sortBy === key && key !== "custom") setSortAsc(!sortAsc);
                      else {
                        setSortBy(key);
                        setSortAsc(true);
                      }
                    }}
                  >
                    {sortBy === key ? (
                      key === "custom" ? (
                        <Check className="!text-gold" />
                      ) : sortAsc ? (
                        <ArrowUpAZ className="!text-gold" />
                      ) : (
                        <ArrowDownAZ className="!text-gold" />
                      )
                    ) : (
                      <span className="w-4" />
                    )}
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <p className="px-2 pb-1.5 text-[11px] leading-snug text-muted-foreground">
                  {sortBy === "custom"
                    ? "Drag photos to rearrange."
                    : "Click the active sort again to flip direction. Switch to Custom to drag."}
                </p>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Borders (a view preference, works for shared viewers too) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Frame className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Borders</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 space-y-4" align="end">
                <div className="flex items-center justify-between">
                  <Label htmlFor="border-enabled">Photo borders</Label>
                  <Switch
                    id="border-enabled"
                    checked={borderSettings.enabled}
                    onCheckedChange={(v) => setBorderSettings({ enabled: v })}
                  />
                </div>
                {borderSettings.enabled && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <Label>Width</Label>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {borderSettings.width}px
                        </span>
                      </div>
                      <Slider
                        min={2}
                        max={40}
                        step={1}
                        value={[borderSettings.width]}
                        onValueChange={([v]) => setBorderSettings({ width: v })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Colour</Label>
                      <div className="flex gap-2">
                        {BORDER_COLORS.map((c) => (
                          <Tooltip key={c.value}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setBorderSettings({ color: c.value })}
                                className={cn(
                                  "h-7 w-7 cursor-pointer rounded-full border border-[var(--line)] transition-transform hover:scale-110",
                                  borderSettings.color === c.value &&
                                    "ring-2 ring-ring ring-offset-2 ring-offset-[var(--popover)]"
                                )}
                                style={{ background: c.value }}
                                aria-label={c.name}
                                aria-pressed={borderSettings.color === c.value}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{c.name}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Inside photo (crop effect)</Label>
                      <Switch
                        checked={borderSettings.inside}
                        onCheckedChange={(v) => setBorderSettings({ inside: v })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {borderSettings.inside
                        ? "Border overlays the photo edges."
                        : "Border sits outside, expanding the tile."}
                    </p>
                  </>
                )}
              </PopoverContent>
            </Popover>

            {/* Selection toggle */}
            {!readOnly && images.length > 0 && (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
                aria-pressed={selectionMode}
              >
                {selectionMode ? <X className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
                {selectionMode ? "Done" : "Select"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
          {loading && images.length === 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-[var(--glass)]" />
              ))}
            </div>
          ) : images.length === 0 ? (
            readOnly ? (
              <EmptyState
                icon={Images}
                title="This album is empty"
                description="The owner hasn't added any photos yet. Check back soon."
              />
            ) : (
              <UploadZone albumId={id} />
            )
          ) : (
            <>
              <ImageGrid
                images={sortedImages}
                onReorder={reorderImages}
                onRename={openEdit}
                onTrash={(ids) => setTrashIds(ids)}
                onDuplicate={handleDuplicate}
                onMove={(ids) => setMoveIds(ids)}
                onProperties={openProperties}
                readOnly={readOnly}
                dragEnabled={sortBy === "custom"}
              />
              {!readOnly && (
                <div className="mt-5">
                  <UploadZone albumId={id} compact />
                </div>
              )}
            </>
          )}
          {/* keep room for the floating selection bar */}
          {selectedCount > 0 && <div className="h-20" />}
        </div>
      </div>

      {/* Floating bulk-action bar */}
      {!readOnly && selectedCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="glass-strong pointer-events-auto flex items-center gap-1.5 rounded-full py-1.5 pl-4 pr-1.5 shadow-[var(--glass-shadow-lg)]">
            <span className="mr-1 text-sm font-medium tabular-nums">
              {selectedCount} selected
            </span>
            <Button variant="ghost" size="sm" onClick={() => selectMany(sortedImages.map((i) => i.id))}>
              All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(Array.from(selectedIds))}>
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMoveIds(Array.from(selectedIds))}>
              <FolderInput className="h-3.5 w-3.5" />
              Move
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger"
              onClick={() => setTrashIds(Array.from(selectedIds))}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Trash
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={clearSelection} aria-label="Clear selection">
              <X />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ShareDialog album={album ?? null} open={shareOpen} onOpenChange={setShareOpen} />

      <PhotoPropertiesDialog
        image={propsImage}
        open={propsOpen}
        onOpenChange={setPropsOpen}
        position={
          propsImage ? sortedImages.findIndex((i) => i.id === propsImage.id) + 1 : undefined
        }
        total={sortedImages.length}
      />

      {/* Edit photo */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit photo</DialogTitle>
            <DialogDescription>Rename the file and add an optional caption.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="photo-name">Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="photo-name"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                  {editTarget ? getFileExtension(editTarget.file_name) : ""}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-caption">Caption</Label>
              <Input
                id="photo-caption"
                value={captionValue}
                onChange={(e) => setCaptionValue(e.target.value)}
                placeholder="A short caption…"
                onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move photos */}
      <Dialog open={!!moveIds} onOpenChange={(v) => !v && !moving && setMoveIds(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Move {moveIds?.length ?? 0} photo{moveIds?.length === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>Choose a destination album.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-0.5 overflow-y-auto scrollbar-thin">
            {albums.filter((a) => !excludedForMove.has(a.id)).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No other albums yet.
              </p>
            )}
            {buildFlatTree(albums)
              .filter((a) => !excludedForMove.has(a.id))
              .map((a) => (
                <button
                  key={a.id}
                  disabled={moving}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                  style={{ paddingLeft: 10 + a.depth * 16 }}
                  onClick={() => handleMove(a)}
                >
                  <Folder className="h-4 w-4 shrink-0 text-gold" />
                  <span className="truncate">{a.name}</span>
                  <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                    {a.image_count ?? 0}
                  </span>
                </button>
              ))}
          </div>
          {moving && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Moving…
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Trash photos (reversible) */}
      <AlertDialog open={!!trashIds} onOpenChange={(v) => !v && setTrashIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {trashIds?.length ?? 0} photo{trashIds?.length === 1 ? "" : "s"} to trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Photos in Trash can be restored any time. Permanent deletion only happens from
              the Trash page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmTrash}>
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename album */}
      <Dialog open={renameAlbumOpen} onOpenChange={setRenameAlbumOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename album</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={albumName}
            onChange={(e) => setAlbumName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveAlbumName()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameAlbumOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAlbumName} disabled={!albumName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New sub-album */}
      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New sub-album</DialogTitle>
            <DialogDescription>Inside “{album?.name}”.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="e.g. Day 1"
            onKeyDown={(e) => e.key === "Enter" && createSub()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createSub} disabled={!subName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trash album */}
      <AlertDialog open={trashAlbumOpen} onOpenChange={setTrashAlbumOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move “{album?.name}” to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              The album, its sub-albums and all photos inside move to Trash, where they can be
              restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!album) return;
                const ok = await trashAlbum(album.id);
                setTrashAlbumOpen(false);
                if (ok) {
                  toast.success("Album moved to trash");
                  router.push(album.parent_id ? `/dashboard/album/${album.parent_id}` : "/dashboard");
                } else toast.error("Could not move album to trash");
              }}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Depth-first flat list with depth, for indented pickers. */
function buildFlatTree(albums: Album[]): (Album & { depth: number })[] {
  const out: (Album & { depth: number })[] = [];
  const ids = new Set(albums.map((a) => a.id));
  const walk = (parent: string | null, depth: number) => {
    albums
      .filter((a) => (parent === null ? !a.parent_id || !ids.has(a.parent_id) : a.parent_id === parent))
      .sort((x, y) => x.sort_order - y.sort_order)
      .forEach((a) => {
        out.push({ ...a, depth });
        walk(a.id, depth + 1);
      });
  };
  walk(null, 0);
  return out;
}
