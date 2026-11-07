"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Folder,
  Images,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Share2,
  Users,
  Eye,
  FolderTree,
} from "lucide-react";
import { useAlbums } from "@/lib/hooks/use-albums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareDialog } from "@/components/share-dialog";
import type { Album } from "@/lib/types";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const {
    albums,
    sharedAlbums,
    loading,
    createAlbum,
    renameAlbum,
    duplicateAlbum,
    trashAlbum,
  } = useAlbums();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareAlbum, setShareAlbum] = useState<Album | null>(null);
  const [trashTarget, setTrashTarget] = useState<Album | null>(null);

  const roots = albums.filter((a) => !a.parent_id);
  const totalPhotos = albums.reduce((n, a) => n + (a.image_count ?? 0), 0);

  const handleCreate = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    const album = await createAlbum(newName.trim(), null);
    setBusy(false);
    if (album) {
      toast.success(`Album “${newName.trim()}” created`);
      setNewName("");
      setCreateOpen(false);
      router.push(`/dashboard/album/${album.id}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Library"
        title="Your albums"
        description={
          loading
            ? "Loading your library…"
            : albums.length === 0
              ? "Create an album, then drop in photos. Everything stays private to you unless you share it."
              : `${albums.length} album${albums.length === 1 ? "" : "s"} · ${totalPhotos} photo${totalPhotos === 1 ? "" : "s"}`
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            New album
          </Button>
        }
      />

      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-[var(--glass)]" />
            ))}
          </div>
        ) : roots.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="No albums yet"
            description="Create your first album, then upload photos in bulk and arrange them however you like."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                Create your first album
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roots.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                subCount={albums.filter((a) => a.parent_id === album.id).length}
                onDuplicate={async () => {
                  const id = toast.loading(`Duplicating “${album.name}”…`);
                  const ok = await duplicateAlbum(album);
                  toast.dismiss(id);
                  if (ok) toast.success(`Duplicated “${album.name}”`);
                  else toast.error("Could not duplicate album");
                }}
                onDelete={() => setTrashTarget(album)}
                onRename={async (name) => {
                  const ok = await renameAlbum(album.id, name);
                  if (ok) toast.success("Renamed");
                  else toast.error("Could not rename album");
                }}
                onShare={() => setShareAlbum(album)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared with me */}
      {sharedAlbums.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-gold" />
            <h2 className="font-display text-xl font-semibold">Shared with me</h2>
            <span className="text-xs text-muted-foreground">View only</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sharedAlbums.map((album) => (
              <SharedAlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      <ShareDialog
        album={shareAlbum}
        open={!!shareAlbum}
        onOpenChange={(v) => !v && setShareAlbum(null)}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New album</DialogTitle>
            <DialogDescription>Albums can hold photos and sub-albums.</DialogDescription>
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
            <Button onClick={handleCreate} disabled={!newName.trim() || busy}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!trashTarget} onOpenChange={(v) => !v && setTrashTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move “{trashTarget?.name}” to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              The album, its sub-albums and all photos inside move to Trash. You can
              restore everything from there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!trashTarget) return;
                const ok = await trashAlbum(trashTarget.id);
                setTrashTarget(null);
                if (ok)
                  toast.success("Moved to trash", {
                    action: { label: "Open trash", onClick: () => router.push("/dashboard/trash") },
                  });
                else toast.error("Could not move album to trash");
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

function Cover({ album, className }: { album: Album; className?: string }) {
  return album.cover_image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={album.cover_image_url}
      alt=""
      loading="lazy"
      className={
        "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] " +
        (className ?? "")
      }
    />
  ) : (
    <div className="dot-grid flex h-full w-full items-center justify-center bg-[var(--glass)]">
      <Images className="h-9 w-9 text-gold/40" />
    </div>
  );
}

function AlbumCard({
  album,
  subCount,
  onDuplicate,
  onDelete,
  onRename,
  onShare,
}: {
  album: Album;
  subCount: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onShare: () => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(album.name);
  const imageCount = album.image_count ?? 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--card)] shadow-[var(--glass-shadow)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--gold)_40%,var(--glass-border))] hover:shadow-[var(--glass-shadow-lg)]">
      <Link href={`/dashboard/album/${album.id}`} className="block focus-visible:outline-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
          <Cover album={album} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <h3 className="font-display truncate text-[1.15rem] font-semibold text-white drop-shadow">
              {album.name}
            </h3>
            <p className="mt-0.5 text-xs text-white/75">
              {imageCount} photo{imageCount === 1 ? "" : "s"}
              {subCount > 0 && (
                <>
                  {" · "}
                  <FolderTree className="-mt-0.5 inline h-3 w-3" /> {subCount} sub-album
                  {subCount === 1 ? "" : "s"}
                </>
              )}
            </p>
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-black/50 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={`Actions for ${album.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-danger focus:text-danger">
            <Trash2 className="!text-danger" />
            Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename album</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                onRename(name.trim());
                setRenameOpen(false);
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                onRename(name.trim());
                setRenameOpen(false);
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

function SharedAlbumCard({ album }: { album: Album }) {
  const imageCount = album.image_count ?? 0;
  return (
    <Link
      href={`/dashboard/album/${album.id}`}
      className="group relative block overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--card)] shadow-[var(--glass-shadow)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow-lg)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
        <Cover album={album} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90 backdrop-blur">
          <Eye className="h-3 w-3" /> View only
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="font-display truncate text-[1.15rem] font-semibold text-white drop-shadow">
            {album.name}
          </h3>
          <p className="mt-0.5 text-xs text-white/75">
            {imageCount} photo{imageCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </Link>
  );
}
