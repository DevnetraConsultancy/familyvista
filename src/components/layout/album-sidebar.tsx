"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Folder,
  FolderOpen,
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Images,
  Users,
  Eye,
} from "lucide-react";
import { useAlbums, buildAlbumTree } from "@/lib/hooks/use-albums";
import { useSharedAlbums } from "@/lib/hooks/use-shared-albums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { cn } from "@/lib/utils";
import type { Album } from "@/lib/types";
import { toast } from "sonner";

export function AlbumSidebar({ visible }: { visible: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { albums, loading, createAlbum, renameAlbum, duplicateAlbum, trashAlbum } =
    useAlbums();
  const { sharedAlbums } = useSharedAlbums();
  const tree = buildAlbumTree(albums);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParent, setCreateParent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const [renameTarget, setRenameTarget] = useState<Album | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
  const [deletePhrase, setDeletePhrase] = useState("");

  const currentAlbumId = pathname.startsWith("/dashboard/album/")
    ? pathname.split("/")[3]
    : null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const album = await createAlbum(newName.trim(), createParent);
    if (album) {
      toast.success(`Album “${newName.trim()}” created`);
      setNewName("");
      setCreateDialogOpen(false);
      router.push(`/dashboard/album/${album.id}`);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const ok = await renameAlbum(renameTarget.id, renameValue.trim());
    if (ok) {
      toast.success("Album renamed");
      setRenameTarget(null);
    } else {
      toast.error("Could not rename album");
    }
  };

  const handleDuplicate = async (album: Album) => {
    const ok = await duplicateAlbum(album);
    if (ok) toast.success(`Duplicated “${album.name}”`);
    else toast.error("Could not duplicate album");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const expected = `DELETE ${deleteTarget.name}`.toUpperCase();
    if (deletePhrase.trim().toUpperCase() !== expected) {
      toast.error(`Type “${expected}” to confirm`);
      return;
    }
    const ok = await trashAlbum(deleteTarget.id);
    if (ok) {
      toast.success("Album moved to trash");
      if (currentAlbumId === deleteTarget.id) router.push("/dashboard");
      setDeleteTarget(null);
      setDeletePhrase("");
    }
  };

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 py-2">
        <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Albums
        </div>

        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent",
            pathname === "/dashboard" && "bg-accent font-medium"
          )}
        >
          <Images className="h-4 w-4" />
          All Albums
        </Link>

        <div className="mt-1 space-y-0.5">
          {tree.map((album) => (
            <AlbumNode
              key={album.id}
              album={album}
              depth={0}
              currentAlbumId={currentAlbumId}
              onRename={(a) => {
                setRenameTarget(a);
                setRenameValue(a.name);
              }}
              onDuplicate={handleDuplicate}
              onDelete={(a) => {
                setDeleteTarget(a);
                setDeletePhrase("");
              }}
              onAddSub={(a) => {
                setCreateParent(a.id);
                setNewName("");
                setCreateDialogOpen(true);
              }}
            />
          ))}
        </div>

        {tree.length === 0 && (
          <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">
            No albums yet.
            <br />
            Create your first one below.
          </p>
        )}

        {/* Shared with me */}
        {sharedAlbums.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3 w-3" />
              Shared with me
            </div>
            <div className="space-y-0.5">
              {sharedAlbums.map((album) => (
                <SharedAlbumNode
                  key={album.id}
                  album={album}
                  currentAlbumId={currentAlbumId}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            setCreateParent(null);
            setNewName("");
            setCreateDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Album
        </Button>
      </div>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {createParent ? "New sub-album" : "New album"}
            </DialogTitle>
            <DialogDescription>
              {createParent
                ? "This album will live inside the selected parent."
                : "Albums can contain photos and sub-albums."}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Summer 2026"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(v) => !v && setRenameTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename album</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete (phrase) dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move “{deleteTarget?.name}” to trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The album and its photos will be moved to Trash. You can restore
              it later — permanent deletion happens only from Trash.
              <br />
              <br />
              Type <b>DELETE {deleteTarget?.name}</b> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
            placeholder={`DELETE ${deleteTarget?.name ?? ""}`}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                deletePhrase.trim().toUpperCase() !==
                `DELETE ${deleteTarget?.name}`.toUpperCase()
              }
              onClick={handleDelete}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---- Shared-with-me tree node (read-only) ----
function SharedAlbumNode({
  album,
  currentAlbumId,
}: {
  album: Album;
  currentAlbumId: string | null;
}) {
  const active = currentAlbumId === album.id;
  return (
    <Link
      href={`/dashboard/album/${album.id}?shared=1`}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent",
        active && "bg-accent font-medium"
      )}
    >
      <Users className="h-4 w-4 shrink-0 text-sky-500" />
      <span className="min-w-0 flex-1 truncate">{album.name}</span>
      <span title="View only">
        <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />
      </span>
    </Link>
  );
}

// ---- Tree node ----
function AlbumNode({
  album,
  depth,
  currentAlbumId,
  onRename,
  onDuplicate,
  onDelete,
  onAddSub,
}: {
  album: Album;
  depth: number;
  currentAlbumId: string | null;
  onRename: (a: Album) => void;
  onDuplicate: (a: Album) => void;
  onDelete: (a: Album) => void;
  onAddSub: (a: Album) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = (album.children?.length ?? 0) > 0;
  const active = currentAlbumId === album.id;

  const menuItems = (
    <>
      <DropdownMenuItem onClick={() => onAddSub(album)}>
        <Plus />
        Add sub-album
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onRename(album)}>
        <Pencil />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDuplicate(album)}>
        <Plus />
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onDelete(album)}
        className="text-destructive"
      >
        <Trash2 />
        Delete
      </DropdownMenuItem>
    </>
  );

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group flex items-center rounded-md pr-1 text-sm transition-colors hover:bg-accent",
              active && "bg-accent font-medium"
            )}
            style={{ paddingLeft: depth * 14 }}
          >
            <Link
              href={`/dashboard/album/${album.id}`}
              className="flex h-8 min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-md text-left"
            >
              {hasChildren ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((v) => !v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpen((v) => !v);
                    }
                  }}
                  className="shrink-0 rounded p-0.5 hover:bg-muted cursor-pointer"
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      open && "rotate-90"
                    )}
                  />
                </span>
              ) : (
                <span className="w-[18px] shrink-0" />
              )}
              {open && hasChildren ? (
                <FolderOpen className="h-4 w-4 shrink-0 text-primary/80" />
              ) : (
                <Folder className="h-4 w-4 shrink-0 text-primary/80" />
              )}
              <span className="truncate">{album.name}</span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="shrink-0 cursor-pointer rounded p-1 opacity-0 transition-opacity hover:bg-muted focus:opacity-100 group-hover:opacity-100">
                  <MoreVertical className="h-3.5 w-3.5" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onAddSub(album)}>
            <Plus />
            Add sub-album
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onRename(album)}>
            <Pencil />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDuplicate(album)}>
            <Plus />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(album)}
            className="text-destructive"
          >
            <Trash2 />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {open && hasChildren && (
        <div>
          {album.children!.map((child) => (
            <AlbumNode
              key={child.id}
              album={child}
              depth={depth + 1}
              currentAlbumId={currentAlbumId}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onAddSub={onAddSub}
            />
          ))}
        </div>
      )}
    </div>
  );
}
