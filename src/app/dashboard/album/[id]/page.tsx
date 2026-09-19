"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Grid2x2,
  Grid3x3,
  List,
  Play,
  Frame,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  FolderInput,
  CheckSquare,
  X,
  Share2,
  UserPlus,
  Images,
  ArrowUpDown,
  ArrowDownAZ,
  ArrowUpAZ,
} from "lucide-react";
import { useAlbums } from "@/lib/hooks/use-albums";
import { useImages } from "@/lib/hooks/use-images";
import { useUIStore } from "@/lib/store";
import { useAuth } from "@/components/auth-provider";
import { ShareDialog } from "@/components/share-dialog";
import { UploadZone } from "@/components/images/upload-zone";
import { ImageGrid } from "@/components/images/image-grid";
import { PhotoPropertiesDialog } from "@/components/images/photo-properties-dialog";
import { CropDialog } from "@/components/images/crop-dialog";
import { useUploadStore } from "@/lib/upload-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import type { Image } from "@/lib/types";
import { toast } from "sonner";

const VIEW_MODES = [
  { mode: "small", icon: Grid3x3, label: "Small tiles" },
  { mode: "large", icon: Grid2x2, label: "Large tiles" },
  { mode: "list", icon: List, label: "List" },
  { mode: "play", icon: Play, label: "Slideshow" },
] as const;

const SORT_OPTIONS = [
  { key: "custom", label: "Custom (drag) order" },
  { key: "name", label: "Name" },
  { key: "date", label: "Date" },
  { key: "size", label: "File size" },
  { key: "resolution", label: "Resolution" },
] as const;

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { albums, renameAlbum } = useAlbums();
  const {
    images,
    groups,
    loading,
    reorderImages,
    renameImage,
    duplicateImages,
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
    clearSelection,
    sortBy,
    sortAsc,
    setSortBy,
    setSortAsc,
  } = useUIStore();

  const album = albums.find((a) => a.id === id);
  const isOwner = !!album && album.user_id === user?.id;
  const readOnly = !!album && !isOwner;

  const [shareOpen, setShareOpen] = useState(false);
  const [menuImage, setMenuImage] = useState<Image | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [captionValue, setCaptionValue] = useState("");
  const [deletePhraseOpen, setDeletePhraseOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargetIds, setMoveTargetIds] = useState<string[]>([]);
  const [propsImage, setPropsImage] = useState<Image | null>(null);
  const [propsOpen, setPropsOpen] = useState(false);
  const [cropImage, setCropImage] = useState<Image | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const enqueueUploads = useUploadStore((s) => s.enqueue);

  const targetIds = useMemo(
    () => (menuImage ? [menuImage.id] : Array.from(selectedIds)),
    [menuImage, selectedIds]
  );

  const groupedImageList = useMemo(() => {
    const list = [...images];

    if (sortBy === "custom") {
      // group ordering: images with group in group order, then ungrouped
      const groupOrder = new Map(groups.map((g, i) => [g.id, i]));
      return list.sort((a, b) => {
        const ga = a.group_id ? (groupOrder.get(a.group_id) ?? 999) : 999;
        const gb = b.group_id ? (groupOrder.get(b.group_id) ?? 999) : 999;
        if (ga !== gb) return ga - gb;
        return a.sort_order - b.sort_order;
      });
    }

    const dir = sortAsc ? 1 : -1;
    switch (sortBy) {
      case "name":
        return list.sort((a, b) =>
          dir * a.file_name.localeCompare(b.file_name, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );
      case "date":
        return list.sort(
          (a, b) => dir * (Date.parse(a.created_at) - Date.parse(b.created_at))
        );
      case "size":
        return list.sort(
          (a, b) => dir * ((a.file_size ?? 0) - (b.file_size ?? 0))
        );
      case "resolution":
        return list.sort(
          (a, b) =>
            dir *
            ((a.width ?? 0) * (a.height ?? 0) - (b.width ?? 0) * (b.height ?? 0))
        );
    }
  }, [images, groups, sortBy, sortAsc]);

  const handleRenameOpen = (img: Image | null) => {
    const target = img ?? images.find((i) => i.id === Array.from(selectedIds)[0]);
    if (!target) return;
    setMenuImage(null);
    setRenameValue(stripExtension(target.file_name));
    setCaptionValue(target.caption ?? "");
    setRenameOpen(true);
  };

  const handleRenameSave = async () => {
    const id0 = menuImage?.id ?? Array.from(selectedIds)[0];
    if (!id0) return;
    const img = images.find((i) => i.id === id0);
    if (!img) return;
    const ext = getFileExtension(img.file_name);
    const ok = await renameImage(id0, `${renameValue.trim()}${ext}`, captionValue || undefined);
    if (ok) {
      toast.success("Photo updated");
      setRenameOpen(false);
    }
  };

  const handleTrash = async (ids: string[]) => {
    setMenuImage(null);
    const ok = await trashImages(ids);
    if (ok) {
      toast.success(`${ids.length} photo(s) moved to trash`);
      clearSelection();
    }
  };

  const handleDuplicate = async (ids: string[]) => {
    setMenuImage(null);
    await duplicateImages(ids);
    toast.success(`${ids.length} photo(s) duplicated`);
    clearSelection();
  };

  const openMove = (ids: string[]) => {
    setMenuImage(null);
    setMoveTargetIds(ids);
    setMoveOpen(true);
  };

  const openProperties = (img: Image) => {
    setMenuImage(null);
    setPropsImage(img);
    setPropsOpen(true);
  };

  const openCrop = (img: Image) => {
    setMenuImage(null);
    setCropImage(img);
    setCropOpen(true);
  };

  /** Crop dialog hands us a finished JPEG; push it through the TUS upload queue. */
  const handleCropApply = (blob: Blob, suggestedName: string) => {
    if (!id) return;
    const file = new File([blob], suggestedName, { type: "image/jpeg" });
    const n = enqueueUploads(id, [file]);
    if (n > 0) toast.success("Cropped photo added to upload queue");
  };

  if (!album && !loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold">Album not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been deleted or belongs to another account.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to all albums
        </Button>
      </div>
    );
  }

  const sortedIdsForReorder = (orderedIds: string[]) => {
    // persist global order within the current flat view
    reorderImages(orderedIds);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Album header + toolbar */}
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-xl font-bold tracking-tight">
              {album?.name ?? "…"}
            </h1>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {images.length} photos
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Share — owners can invite people to view the album */}
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            )}

            {/* View modes */}
            <div className="flex rounded-lg border p-0.5">
              {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  title={label}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent",
                    viewMode === mode && "bg-primary text-primary-foreground hover:bg-primary"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            {/* Sort order */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  {sortAsc ? (
                    <ArrowUpAZ className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                  )}
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                {SORT_OPTIONS.map(({ key, label }) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => {
                      if (sortBy === key) {
                        // clicking the active key flips direction
                        setSortAsc(!sortAsc);
                      } else {
                        setSortBy(key);
                      }
                    }}
                  >
                    {sortBy === key ? (
                      sortAsc ? (
                        <ArrowUpAZ />
                      ) : (
                        <ArrowDownAZ />
                      )
                    ) : (
                      <ArrowUpDown className="opacity-30" />
                    )}
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <p className="px-2 pb-1.5 pt-0 text-[10px] text-muted-foreground">
                  {sortBy === "custom"
                    ? "Drag photos to rearrange."
                    : "Switch to Custom to drag photos."}
                </p>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Borders popover (view preference — works for shared viewers too) */}
            {!readOnly && (
              <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Frame className="h-3.5 w-3.5" />
                  Borders
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 space-y-4" align="end">
                <div className="flex items-center justify-between">
                  <Label htmlFor="border-enabled">White borders</Label>
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
                        <span className="text-muted-foreground">
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
            )}

            {/* Selection toggle */}
            {!readOnly && (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={toggleSelectionMode}
              >
                {selectionMode ? <X className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
                {selectionMode ? "Exit select" : "Select"}
              </Button>
            )}

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="secondary">
                    {selectedIds.size} selected
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDuplicate(Array.from(selectedIds))}>
                    <Copy />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openMove(Array.from(selectedIds))}>
                    <FolderInput />
                    Move to album…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setDeletePhrase("");
                      setDeletePhraseOpen(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 />
                    Move to trash…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Groups strip */}
        {groups.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <span
                key={g.id}
                className="rounded-full border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
              >
                {g.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-4">
        {images.length === 0 && !loading ? (
          readOnly ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Images className="mb-3 h-12 w-12 text-muted-foreground/40" />
              <h2 className="text-lg font-semibold">This album is empty</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The owner hasn&apos;t added any photos yet. Check back soon.
              </p>
            </div>
          ) : (
            <UploadZone albumId={id} />
          )
        ) : (
          <>
            <ImageGrid
              images={groupedImageList}
              onReorder={sortedIdsForReorder}
              onRename={handleRenameOpen}
              onTrash={handleTrash}
              onDuplicate={handleDuplicate}
              onMove={openMove}
              onProperties={openProperties}
              onCrop={openCrop}
              readOnly={readOnly}
              dragEnabled={sortBy === "custom"}
            />
            {!readOnly && (
              <div className="mt-4">
                <UploadZone albumId={id} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Per-image context dropdown (rendered at toolbar level via right-click → we use a floating menu anchored by context menu inside grid; this dialog set handles actions) */}

      {/* Share dialog */}
      <ShareDialog
        album={album ?? null}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      {/* Photo properties dialog */}
      <PhotoPropertiesDialog
        image={propsImage}
        open={propsOpen}
        onOpenChange={setPropsOpen}
        position={
          propsImage
            ? groupedImageList.findIndex((i) => i.id === propsImage.id) + 1
            : undefined
        }
        total={groupedImageList.length}
      />

      {/* Crop dialog — saves the crop as a new photo via the upload queue */}
      <CropDialog
        image={cropImage}
        open={cropOpen}
        onOpenChange={setCropOpen}
        onApply={handleCropApply}
      />

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit photo</DialogTitle>
            <DialogDescription>
              Rename the file and optionally add a caption.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Caption</Label>
              <Input
                value={captionValue}
                onChange={(e) => setCaptionValue(e.target.value)}
                placeholder="A short caption…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSave} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {moveTargetIds.length} photo(s)</DialogTitle>
            <DialogDescription>Choose a destination album.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
            {albums
              .filter((a) => a.id !== id)
              .map((a) => (
                <button
                  key={a.id}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent"
                  onClick={async () => {
                    const supabase = (await import("@/lib/supabase/client")).createClient();
                    const { error } = await supabase
                      .from("images")
                      .update({ album_id: a.id })
                      .in("id", moveTargetIds);
                    if (!error) {
                      toast.success(`Moved to “${a.name}”`);
                      setMoveOpen(false);
                      clearSelection();
                    } else {
                      toast.error("Move failed");
                    }
                  }}
                >
                  <FolderInput className="h-4 w-4 text-primary" />
                  {a.name}
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete-phrase dialog for bulk trash */}
      <AlertDialog open={deletePhraseOpen} onOpenChange={setDeletePhraseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.size} photo{selectedIds.size === 1 ? "" : "s"} will
              be moved to Trash where they can be restored. Type <b>DELETE</b> to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
            placeholder="DELETE"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePhrase.trim().toUpperCase() !== "DELETE"}
              onClick={() => {
                setDeletePhraseOpen(false);
                setDeletePhrase("");
                handleTrash(Array.from(selectedIds));
              }}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
