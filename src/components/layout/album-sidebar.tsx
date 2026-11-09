"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Images,
  Users,
  Eye,
  Share2,
  Copy,
  Search,
  X,
} from "lucide-react";
import { useAlbums, buildAlbumTree } from "@/lib/hooks/use-albums";
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
import { cn } from "@/lib/utils";
import type { Album } from "@/lib/types";
import { ShareDialog } from "@/components/share-dialog";
import { toast } from "sonner";

export function AlbumSidebar({ visible }: { visible: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    albums,
    sharedAlbums,
    loading,
    createAlbum,
    renameAlbum,
    duplicateAlbum,
    trashAlbum,
  } = useAlbums();

  const [filter, setFilter] = useState("");
  const tree = useMemo(() => {
    if (!filter.trim()) return buildAlbumTree(albums);
    const q = filter.trim().toLowerCase();
    // Flat match list while filtering (keeps hits visible regardless of depth).
    return albums
      .filter((a) => a.name.toLowerCase().includes(q))
      .map((a) => ({ ...a, children: [] as Album[] }));
  }, [albums, filter]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createParent, setCreateParent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const [renameTarget, setRenameTarget] = useState<Album | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
  const [shareTarget, setShareTarget] = useState<Album | null>(null);

  const currentAlbumId = pathname.startsWith("/dashboard/album/")
    ? pathname.split("/")[3]
    : null;

  const handleCreate = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    const album = await createAlbum(newName.trim(), createParent);
    setBusy(false);
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
    const id = toast.loading(`Duplicating “${album.name}”…`);
    const ok = await duplicateAlbum(album);
    toast.dismiss(id);
    if (ok) toast.success(`Duplicated “${album.name}”`);
    else toast.error("Could not duplicate album");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await trashAlbum(deleteTarget.id);
    if (ok) {
      toast.success("Album moved to trash", {
        action: { label: "Open trash", onClick: () => router.push("/dashboard/trash") },
      });
      if (currentAlbumId === deleteTarget.id) router.push("/dashboard");
      setDeleteTarget(null);
    } else {
      toast.error("Could not move album to trash");
    }
  };

  const subCount = (deleteTarget && albums.filter((a) => a.parent_id === deleteTarget.id).length) || 0;

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-opacity",
          !visible && "pointer-events-none opacity-0"
        )}
      >
        {/* New album */}
        <div className="px-3 pb-2 pt-3">
          <Button
            className="w-full"
            onClick={() => {
              setCreateParent(null);
              setNewName("");
              setCreateDialogOpen(true);
            }}
          >
            <Plus />
            New album
          </Button>
        </div>

        {/* Filter */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find an album"
              className="h-8 pl-8 pr-7 text-[13px]"
              aria-label="Filter albums"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin">
          <SectionLabel>Albums</SectionLabel>

          <NavRow href="/dashboard" active={pathname === "/dashboard"} icon={<Images className="h-4 w-4" />}>
            All albums
            <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
              {albums.length || ""}
            </span>
          </NavRow>

          <div className="mt-1 space-y-px">
            {loading && albums.length === 0 ? (
              <div className="space-y-1.5 px-1 py-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-7 animate-pulse rounded-md bg-[var(--glass)]" />
                ))}
              </div>
            ) : (
              tree.map((album) => (
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
                  onDelete={(a) => setDeleteTarget(a)}
                  onAddSub={(a) => {
                    setCreateParent(a.id);
                    setNewName("");
                    setCreateDialogOpen(true);
                  }}
                  onShare={setShareTarget}
                />
              ))
            )}
          </div>

          {!loading && tree.length === 0 && (
            <p className="px-2.5 py-6 text-center text-[13px] leading-relaxed text-muted-foreground">
              {filter ? "No albums match." : "No albums yet. Create your first one above."}
            </p>
          )}

          {/* Shared with me */}
          {sharedAlbums.length > 0 && (
            <div className="mt-5">
              <SectionLabel>
                <Users className="mr-1.5 inline h-3 w-3" />
                Shared with me
              </SectionLabel>
              <div className="space-y-px">
                {sharedAlbums
                  .filter((a) => !filter.trim() || a.name.toLowerCase().includes(filter.trim().toLowerCase()))
                  .map((album) => (
                    <NavRow
                      key={album.id}
                      href={`/dashboard/album/${album.id}`}
                      active={currentAlbumId === album.id}
                      icon={<Users className="h-4 w-4" />}
                    >
                      <span className="min-w-0 flex-1 truncate">{album.name}</span>
                      <span title="View only">
                        <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </span>
                    </NavRow>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--line)] p-3">
          <NavRow
            href="/dashboard/trash"
            active={pathname === "/dashboard/trash"}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Trash
          </NavRow>
          <p className="mt-2 px-2 text-center text-[10px] leading-relaxed text-muted-foreground/60">
            Made with ♥ by Devnetra Consultancy
          </p>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{createParent ? "New sub-album" : "New album"}</DialogTitle>
            <DialogDescription>
              {createParent
                ? `Inside “${albums.find((a) => a.id === createParent)?.name ?? "album"}”.`
                : "Albums can hold photos and sub-albums."}
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
            <Button onClick={handleCreate} disabled={!newName.trim() || busy}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(v) => !v && setRenameTarget(null)}>
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

      {/* Share dialog */}
      <ShareDialog
        album={shareTarget}
        open={!!shareTarget}
        onOpenChange={(v) => !v && setShareTarget(null)}
      />

      {/* Trash confirm (reversible, so no typed phrase) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move “{deleteTarget?.name}” to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              The album
              {subCount > 0 && `, its ${subCount} sub-album${subCount === 1 ? "" : "s"}`}
              {" "}and all photos inside move to Trash. You can restore everything
              from there. Nothing is deleted permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </div>
  );
}

function NavRow({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
        active
          ? "bg-[var(--gold-soft)] font-medium text-foreground"
          : "text-foreground/85 hover:bg-accent hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-gold" aria-hidden />
      )}
      <span className={cn("shrink-0", active ? "text-gold" : "text-muted-foreground")}>{icon}</span>
      {children}
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
  onShare,
}: {
  album: Album;
  depth: number;
  currentAlbumId: string | null;
  onRename: (a: Album) => void;
  onDuplicate: (a: Album) => void;
  onDelete: (a: Album) => void;
  onAddSub: (a: Album) => void;
  onShare: (a: Album) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = (album.children?.length ?? 0) > 0;
  const active = currentAlbumId === album.id;
  const count = album.image_count ?? 0;

  const items = (
    <>
      <DropdownMenuItem onClick={() => onShare(album)}>
        <Share2 />
        Share
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onAddSub(album)}>
        <Plus />
        Add sub-album
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onRename(album)}>
        <Pencil />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDuplicate(album)}>
        <Copy />
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onDelete(album)} className="text-danger focus:text-danger">
        <Trash2 className="!text-danger" />
        Move to trash
      </DropdownMenuItem>
    </>
  );

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group relative flex h-8 items-center rounded-md pr-1 text-[13px] transition-colors",
              active
                ? "bg-[var(--gold-soft)] font-medium text-foreground"
                : "text-foreground/85 hover:bg-accent hover:text-foreground"
            )}
            style={{ paddingLeft: 4 + depth * 14 }}
          >
            {active && (
              <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-gold" aria-hidden />
            )}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground"
                aria-label={open ? "Collapse" : "Expand"}
                aria-expanded={open}
              >
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <Link
              href={`/dashboard/album/${album.id}`}
              className="flex h-8 min-w-0 flex-1 items-center gap-2 overflow-hidden pl-0.5"
            >
              {open && hasChildren ? (
                <FolderOpen className={cn("h-4 w-4 shrink-0", active ? "text-gold" : "text-muted-foreground")} />
              ) : (
                <Folder className={cn("h-4 w-4 shrink-0", active ? "text-gold" : "text-muted-foreground")} />
              )}
              <span className="truncate">{album.name}</span>
              {count > 0 && (
                <span className="ml-auto pr-1 text-[11px] tabular-nums text-muted-foreground group-hover:hidden">
                  {count}
                </span>
              )}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground group-hover:flex data-[state=open]:flex data-[state=open]:text-foreground"
                  aria-label={`Actions for ${album.name}`}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{items}</DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onShare(album)}>
            <Share2 />
            Share
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onAddSub(album)}>
            <Plus />
            Add sub-album
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onRename(album)}>
            <Pencil />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDuplicate(album)}>
            <Copy />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onDelete(album)} className="text-danger focus:text-danger">
            <Trash2 className="!text-danger" />
            Move to trash
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {open && hasChildren && (
        <div className="relative">
          <span
            className="absolute bottom-1 top-0 w-px bg-[var(--line)]"
            style={{ left: 13 + depth * 14 }}
            aria-hidden
          />
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
              onShare={onShare}
            />
          ))}
        </div>
      )}
    </div>
  );
}
