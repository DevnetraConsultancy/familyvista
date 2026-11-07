"use client";

import { useState } from "react";
import {
  Trash2,
  RotateCcw,
  Folder,
  XCircle,
  CheckSquare,
  X,
  Check,
} from "lucide-react";
import { useTrash, type TrashedImage } from "@/lib/hooks/use-trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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
import type { Album } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const FOREVER = "DELETE FOREVER";
const ALL = "DELETE ALL";

export default function TrashPage() {
  const {
    trashedAlbums,
    trashedImages,
    loading,
    restoreAlbum,
    restoreImages,
    deleteAlbumForever,
    deleteImagesForever,
    emptyTrash,
  } = useTrash();

  const [emptyOpen, setEmptyOpen] = useState(false);
  const [phrase, setPhrase] = useState("");

  const [albumPermTarget, setAlbumPermTarget] = useState<Album | null>(null);
  const [albumPermPhrase, setAlbumPermPhrase] = useState("");

  /** Photos queued for permanent deletion (single or bulk). */
  const [imagePermTargets, setImagePermTargets] = useState<TrashedImage[]>([]);
  const [imagePermPhrase, setImagePermPhrase] = useState("");

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isEmpty = trashedAlbums.length === 0 && trashedImages.length === 0;
  const selectedImages = trashedImages.filter((i) => selected.has(i.id));

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const restoreSelected = async () => {
    const ids = selectedImages.map((i) => i.id);
    if (ids.length === 0) return;
    const ok = await restoreImages(ids);
    if (ok) {
      toast.success(`${ids.length} photo${ids.length === 1 ? "" : "s"} restored`);
      exitSelect();
    } else toast.error("Could not restore photos");
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        eyebrow="Recovery"
        title="Trash"
        description="Items stay here until you restore them or delete them for good."
        actions={
          !isEmpty && (
            <Button variant="destructive" onClick={() => setEmptyOpen(true)}>
              <Trash2 />
              Empty trash
            </Button>
          )
        }
        className="mb-6"
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Deleted albums and photos will appear here. Nothing is gone until you delete it forever."
        />
      ) : (
        <div className="space-y-10">
          {/* Trashed albums */}
          {trashedAlbums.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Albums · {trashedAlbums.length}
              </h2>
              <div className="space-y-2">
                {trashedAlbums.map((a) => {
                  const n = a.image_count ?? 0;
                  return (
                    <div
                      key={a.id}
                      className="glass flex items-center gap-3 rounded-xl p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--gold-soft)] text-gold">
                        <Folder className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {n} photo{n === 1 ? "" : "s"} · Deleted{" "}
                          {a.deleted_at ? formatDate(a.deleted_at) : "unknown"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const ok = await restoreAlbum(a.id);
                          if (ok) toast.success(`Restored "${a.name}"`);
                          else toast.error("Could not restore album");
                        }}
                      >
                        <RotateCcw />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setAlbumPermTarget(a);
                          setAlbumPermPhrase("");
                        }}
                      >
                        Delete forever
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Trashed photos */}
          {trashedImages.length > 0 && (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Photos · {trashedImages.length}
                </h2>
                <div className="flex items-center gap-1.5">
                  {selectMode && selected.size > 0 && (
                    <>
                      <Button size="sm" variant="outline" onClick={restoreSelected}>
                        <RotateCcw />
                        Restore selected ({selected.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setImagePermTargets(selectedImages);
                          setImagePermPhrase("");
                        }}
                      >
                        Delete selected forever
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant={selectMode ? "secondary" : "outline"}
                    onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                  >
                    {selectMode ? <X /> : <CheckSquare />}
                    {selectMode ? "Done" : "Select"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {trashedImages.map((img) => {
                  const isSel = selected.has(img.id);
                  return (
                    <div
                      key={img.id}
                      className={cn(
                        "glass group relative overflow-hidden rounded-xl",
                        isSel && "tile-selected"
                      )}
                    >
                      <div
                        className={cn(
                          "aspect-square bg-black/30",
                          selectMode && "cursor-pointer"
                        )}
                        onClick={() => selectMode && toggleSelected(img.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.thumbnail_url ?? img.original_url}
                          alt={img.file_name}
                          loading="lazy"
                          className="h-full w-full object-cover opacity-60 grayscale-[40%] transition-opacity group-hover:opacity-80"
                        />
                      </div>

                      {selectMode ? (
                        <button
                          type="button"
                          aria-label={isSel ? "Deselect" : "Select"}
                          onClick={() => toggleSelected(img.id)}
                          className={cn(
                            "absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border transition-colors",
                            isSel
                              ? "border-transparent [background:var(--gold-grad)] text-gold-fg"
                              : "border-white/50 bg-black/40 text-transparent hover:border-white"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="absolute inset-x-0 top-0 flex h-[calc(100%-2rem)] items-center justify-center gap-2 bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={async () => {
                              const ok = await restoreImages([img.id]);
                              if (ok) toast.success("Photo restored");
                              else toast.error("Could not restore photo");
                            }}
                            aria-label="Restore"
                            title="Restore"
                          >
                            <RotateCcw />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            onClick={() => {
                              setImagePermTargets([img]);
                              setImagePermPhrase("");
                            }}
                            aria-label="Delete forever"
                            title="Delete forever"
                          >
                            <XCircle />
                          </Button>
                        </div>
                      )}

                      <p className="truncate px-2 py-1.5 text-[11px] text-muted-foreground">
                        <span className="text-foreground">{img.file_name}</span>
                        {img.album_name && ` · from ${img.album_name}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty trash (phrase) */}
      <AlertDialog
        open={emptyOpen}
        onOpenChange={(v) => {
          setEmptyOpen(v);
          if (!v) setPhrase("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty the trash permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Every trashed album and photo will be permanently deleted along
              with its files. This cannot be undone.
              <br />
              <br />
              Type <b className="text-gold-text">{ALL}</b> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={ALL}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={phrase.trim().toUpperCase() !== ALL}
              onClick={async () => {
                const res = await emptyTrash(phrase);
                if (res.ok) {
                  toast.success("Trash emptied");
                  setEmptyOpen(false);
                  setPhrase("");
                  exitSelect();
                } else {
                  toast.error(res.error ?? "Failed");
                }
              }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete album (phrase) */}
      <AlertDialog
        open={!!albumPermTarget}
        onOpenChange={(v) => !v && setAlbumPermTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete &ldquo;{albumPermTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The album, its sub-albums and all of their photos and files will
              be permanently deleted. This cannot be undone.
              <br />
              <br />
              Type <b className="text-gold-text">{FOREVER}</b> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={albumPermPhrase}
            onChange={(e) => setAlbumPermPhrase(e.target.value)}
            placeholder={FOREVER}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={albumPermPhrase.trim().toUpperCase() !== FOREVER}
              onClick={async () => {
                if (!albumPermTarget) return;
                const ok = await deleteAlbumForever(albumPermTarget.id);
                if (ok) {
                  toast.success("Album permanently deleted");
                  setAlbumPermTarget(null);
                } else {
                  toast.error("Failed to delete album");
                }
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete photo(s) (phrase) */}
      <AlertDialog
        open={imagePermTargets.length > 0}
        onOpenChange={(v) => !v && setImagePermTargets([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {imagePermTargets.length === 1
                ? `Permanently delete "${imagePermTargets[0]?.file_name}"?`
                : `Permanently delete ${imagePermTargets.length} photos?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {imagePermTargets.length === 1
                ? "The photo file will be permanently deleted from storage."
                : "These photo files will be permanently deleted from storage."}{" "}
              This cannot be undone.
              <br />
              <br />
              Type <b className="text-gold-text">{FOREVER}</b> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={imagePermPhrase}
            onChange={(e) => setImagePermPhrase(e.target.value)}
            placeholder={FOREVER}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={imagePermPhrase.trim().toUpperCase() !== FOREVER}
              onClick={async () => {
                const ids = imagePermTargets.map((i) => i.id);
                if (ids.length === 0) return;
                const ok = await deleteImagesForever(ids);
                if (ok) {
                  toast.success(
                    ids.length === 1
                      ? "Photo permanently deleted"
                      : `${ids.length} photos permanently deleted`
                  );
                  setImagePermTargets([]);
                  exitSelect();
                } else {
                  toast.error("Failed to delete photos");
                }
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
