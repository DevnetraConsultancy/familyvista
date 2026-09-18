"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Folder,
  Images,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Share2,
} from "lucide-react";
import { useAlbums, buildAlbumTree } from "@/lib/hooks/use-albums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "@/components/share-dialog";
import type { Album } from "@/lib/types";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const { albums, loading, createAlbum, renameAlbum, duplicateAlbum, trashAlbum } =
    useAlbums();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [shareAlbum, setShareAlbum] = useState<Album | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const album = await createAlbum(newName.trim(), null);
    if (album) {
      toast.success(`Album “${newName.trim()}” created`);
      setNewName("");
      setCreateOpen(false);
      router.push(`/dashboard/album/${album.id}`);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Albums</h1>
          <p className="text-sm text-muted-foreground">
            Create albums and sub-albums to organize family memories.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Album
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <Folder className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">No albums yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first album, then upload photos in bulk and arrange
            them however you like.
          </p>
          <Button className="mt-5 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create your first album
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums
            .filter((a) => !a.parent_id)
            .map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                allAlbums={albums}
                onDuplicate={async () => {
                  const ok = await duplicateAlbum(album);
                  if (ok) toast.success(`Duplicated “${album.name}”`);
                }}
                onDelete={async () => {
                  const ok = await trashAlbum(album.id);
                  if (ok) toast.success("Moved to trash");
                }}
                onRename={async (name) => {
                  const ok = await renameAlbum(album.id, name);
                  if (ok) toast.success("Renamed");
                }}
                onShare={() => setShareAlbum(album)}
              />
            ))}
        </div>
      )}

      {/* Share dialog (shared by all album cards) */}
      <ShareDialog
        album={shareAlbum}
        open={!!shareAlbum}
        onOpenChange={(v) => !v && setShareAlbum(null)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New album</DialogTitle>
            <DialogDescription>
              Albums can contain photos and sub-albums.
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlbumCard({
  album,
  allAlbums,
  onDuplicate,
  onDelete,
  onRename,
  onShare,
}: {
  album: Album;
  allAlbums: Album[];
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onShare: () => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(album.name);
  const children = allAlbums.filter((a) => a.parent_id === album.id);
  const imageCount = album.image_count ?? 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/dashboard/album/${album.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {album.cover_image_url ? (
            <img
              src={album.cover_image_url}
              alt={album.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-accent/30 to-secondary">
              <Images className="h-10 w-10 text-primary/40" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="truncate font-semibold">{album.name}</h3>
          <p className="text-xs text-muted-foreground">
            {imageCount} photo{imageCount === 1 ? "" : "s"}
            {children.length > 0 && ` · ${children.length} sub-album${children.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="absolute right-2 top-2 rounded-lg bg-black/40 p-1.5 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/60 group-hover:opacity-100 cursor-pointer">
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onShare}>
            <Share2 />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 />
            Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename album</DialogTitle>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (name.trim()) {
                  onRename(name.trim());
                  setRenameOpen(false);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
